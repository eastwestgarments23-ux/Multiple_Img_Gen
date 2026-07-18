// BackEnd/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-aurora-key-change-in-prod';

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Tier Configurations
const TIER_LIMITS = {
    'free': 10,
    'pro': 50,
    'elite': 100
};

// Comprehensive Dynamic International Pricing Matrix
const REGIONAL_CURRENCY_CONFIG = {
    'IN': { currency: 'INR', symbol: '₹', pricing: { 'pro': 999, 'elite': 2499 } },      // India
    'JP': { currency: 'JPY', symbol: '¥', pricing: { 'pro': 1800, 'elite': 4500 } },    // Japan
    'SG': { currency: 'SGD', symbol: 'S$', pricing: { 'pro': 16, 'elite': 40 } },       // Singapore
    'MY': { currency: 'MYR', symbol: 'RM', pricing: { 'pro': 55, 'elite': 140 } },      // Malaysia
    'RU': { currency: 'RUB', symbol: '₽', pricing: { 'pro': 1100, 'elite': 2800 } },    // Russia
    'ID': { currency: 'IDR', symbol: 'Rp', pricing: { 'pro': 190000, 'elite': 480000 } },// Indonesia
    'AU': { currency: 'AUD', symbol: 'A$', pricing: { 'pro': 18, 'elite': 45 } },       // Australia
    'AE': { currency: 'AED', symbol: 'AED', pricing: { 'pro': 44, 'elite': 110 } },     // UAE & Middle East Fallback
    'BR': { currency: 'BRL', symbol: 'R$', pricing: { 'pro': 60, 'elite': 150 } },      // Brazil & South America Fallback
    'NE': { currency: 'XOF', symbol: 'CFA', pricing: { 'pro': 7000, 'elite': 18000 } },  // Niger
    'US': { currency: 'USD', symbol: '$', pricing: { 'pro': 12, 'elite': 30 } },        // North America / Global Default
    'EU': { currency: 'EUR', symbol: '€', pricing: { 'pro': 11, 'elite': 28 } }         // Europe Fallback
};

// Macro Region to Currency ISO Code Mappings
const COUNTRY_GEO_FALLBACKS = {
    // Middle East
    'SA': 'AE', 'OM': 'AE', 'QA': 'AE', 'KW': 'AE', 'BH': 'AE', 'JO': 'AE', 'LB': 'AE',
    // Europe Region
    'FR': 'EU', 'DE': 'EU', 'IT': 'EU', 'ES': 'EU', 'NL': 'EU', 'BE': 'EU', 'AT': 'EU',
    // North America
    'CA': 'US', 'MX': 'US',
    // South America
    'AR': 'BR', 'CL': 'BR', 'CO': 'BR', 'PE': 'BR',
    // Africa Region
    'NG': 'NE', 'GH': 'NE', 'ZA': 'US', 'KE': 'US'
};

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ==========================================
// MySQL DATABASE SETUP
// ==========================================
let pool;

async function initDB() {
    try {
        const dbName = process.env.DB_NAME || 'pose_generator';
        const tempConnection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        await tempConnection.end();

        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: dbName,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        const connection = await pool.getConnection();
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                phone VARCHAR(20) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS generated_images (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                parent_folder VARCHAR(255) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                mime_type VARCHAR(50) NOT NULL,
                image_base64 LONGTEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Migrations
        const [genCols] = await connection.query(`SHOW COLUMNS FROM generated_images LIKE 'user_id'`);
        if (genCols.length === 0) {
            await connection.query(`ALTER TABLE generated_images ADD COLUMN user_id INT NOT NULL DEFAULT 1 AFTER id`);
        }

        const [userCols] = await connection.query(`SHOW COLUMNS FROM users LIKE 'tier'`);
        if (userCols.length === 0) {
            console.log("⚙️ Migrating database: Adding 'tier' column to users table...");
            await connection.query(`ALTER TABLE users ADD COLUMN tier VARCHAR(20) DEFAULT 'free' AFTER password_hash`);
        }
        
        connection.release();
        console.log("✅ MySQL Database connected & schemas verified.");
    } catch (err) {
        console.error("⚠️ MySQL Initialization Error:", err.message);
    }
}
initDB();

// ==========================================
// MIDDLEWARE & HELPERS
// ==========================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. Please log in.' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
}

/**
 * Robust GeoIP Country Detection resolving Hostinger proxy contexts,
 * standard reverse proxy headers, and supporting local testing query variables.
 */
function detectRequestCountry(req) {
    if (req.query && req.query.test_country) {
        return req.query.test_country.toUpperCase();
    }
    
    const derivedCode = 
        req.headers['cf-ipcountry'] || 
        req.headers['x-country-code'] || 
        req.headers['x-real-ip-country'] ||
        req.headers['http_x_country_code'];
        
    if (derivedCode) {
        return derivedCode.toUpperCase();
    }
    
    return 'IN'; // Local development testing fallback default
}

/**
 * Maps standard country code to matching currency profiles with structural fallbacks
 */
function getCurrencyProfile(countryCode) {
    let cleanCode = countryCode ? countryCode.trim().toUpperCase() : 'IN';
    
    if (REGIONAL_CURRENCY_CONFIG[cleanCode]) {
        return REGIONAL_CURRENCY_CONFIG[cleanCode];
    }
    
    if (COUNTRY_GEO_FALLBACKS[cleanCode]) {
        const structuralKey = COUNTRY_GEO_FALLBACKS[cleanCode];
        return REGIONAL_CURRENCY_CONFIG[structuralKey];
    }
    
    return REGIONAL_CURRENCY_CONFIG['US']; // Universal international currency fallback
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// GEO DETECT ENDPOINT
// ==========================================
app.get('/api/detect-currency', (req, res) => {
    const geoCountry = detectRequestCountry(req);
    const profile = getCurrencyProfile(geoCountry);
    res.json({
        success: true,
        country: geoCountry,
        currency: profile.currency,
        symbol: profile.symbol,
        pricing: profile.pricing
    });
});

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        if (!name || !email || !phone || !password) return res.status(400).json({ error: "All fields are required." });

        const [existing] = await pool.query(`SELECT id FROM users WHERE email = ?`, [email]);
        if (existing.length > 0) return res.status(409).json({ error: "Email already exists." });

        const hash = await bcrypt.hash(password, 10);
        await pool.query(`INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)`, [name, email, phone, hash]);
        res.status(201).json({ success: true, message: "Account created." });
    } catch (err) {
        res.status(500).json({ error: "Registration failed." });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await pool.query(`SELECT * FROM users WHERE email = ?`, [email]);
        const user = users[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, tier: user.tier } });
    } catch (err) {
        res.status(500).json({ error: "Login failed." });
    }
});

// ==========================================
// PAYMENT ENDPOINTS (DYNAMIC GEOLOCATION RAZORPAY)
// ==========================================
app.post('/api/create-payment', authenticateToken, async (req, res) => {
    try {
        const { targetTier } = req.body;
        const targetCountry = detectRequestCountry(req);
        const currencyProfile = getCurrencyProfile(targetCountry);
        
        if (!currencyProfile.pricing[targetTier]) {
            return res.status(400).json({ error: "Invalid plan tier specification." });
        }

        const exactPrice = currencyProfile.pricing[targetTier];
        // Razorpay handles zero-decimal vs decimal multipliers via base units (paise/cents)
        const amountMultiplier = ['JPY'].includes(currencyProfile.currency) ? 1 : 100;
        const atomicAmount = exactPrice * amountMultiplier;

        const order = await razorpayInstance.orders.create({
            amount: atomicAmount,
            currency: currencyProfile.currency === 'CFA' ? 'XOF' : currencyProfile.currency,
            receipt: `receipt_${req.user.id}_${Date.now()}`
        });

        res.json({ 
            success: true, 
            order, 
            keyId: process.env.RAZORPAY_KEY_ID,
            displayCurrency: currencyProfile.currency,
            displaySymbol: currencyProfile.symbol
        });
    } catch (err) {
        console.error("Razorpay Order Error:", err);
        res.status(500).json({ error: "Failed to create payment order." });
    }
});

app.post('/api/verify-payment', authenticateToken, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, targetTier } = req.body;
        
        const text = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(text).digest('hex');
        
        if (expectedSignature === razorpay_signature) {
            // Upgrade User
            await pool.query(`UPDATE users SET tier = ? WHERE id = ?`, [targetTier, req.user.id]);
            res.json({ success: true, message: "Payment verified. Tier upgraded!" });
        } else {
            res.status(400).json({ error: "Invalid signature." });
        }
    } catch (err) {
        res.status(500).json({ error: "Payment verification failed." });
    }
});

// ==========================================
// IMAGE GENERATION ENDPOINT (GEMINI 2.5 FLASH IMAGE)
// ==========================================
app.post('/api/generate-pose', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 1. Get User Tier & Current Usage
        const [userRows] = await pool.query(`SELECT tier FROM users WHERE id = ?`, [userId]);
        const userTier = userRows[0]?.tier || 'free';
        const limit = TIER_LIMITS[userTier];

        const [usageRows] = await pool.query(
            `SELECT COUNT(*) as count FROM generated_images WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
            [userId]
        );
        const generatedToday = usageRows[0].count;
        
        if (generatedToday >= limit) {
            return res.status(429).json({ 
                error: "LIMIT_REACHED", 
                message: `You have reached your ${userTier} tier limit of ${limit} images/day.`,
                currentTier: userTier 
            });
        }

        const { base64Image, mimeType, poseBase64, poseMimeType, modelId, poseId, ethnicity, sourceName } = req.body;
        if (!base64Image) return res.status(400).json({ error: "Missing required product image." });

        const apiKey = process.env.GEMINI_API_KEY;
        const modelName = "gemini-2.5-flash-image"; 
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        // Explicit structural prompts directly honoring user demographic configurations
        const contextualAiPrompt = `You are a professional Virtual Try-On fashion AI engine. 
        CRITICAL OPERATIONAL INSTRUCTIONS:
        1. DO NOT produce a collage, grid layout, split canvas, or side-by-side comparative screen. Generate exactly ONE single, integrated standalone high-fashion photograph.
        2. Carefully extract and isolate the texture, cuts, styling, and graphics from Image 1 (The Clothing Product).
        3. Match the pose coordinates, lighting shadows, body angle, framing depth, and anatomy structure of Image 2 (The Reference Pose).
        4. Synthesize a pristine, photorealistic catalog asset featuring a fashion model strictly embodying a clear ${ethnicity || 'natural'} appearance, face structure, and skin tone.
        5. The resulting person must look highly natural, wearing the identical garment from Image 1 while perfectly replicating the posture from Image 2.
        Provide only one high-fidelity product output image.`;

        const requestParts = [
            { text: contextualAiPrompt },
            { text: `Target Ethnic Representation Strategy: Explicitly represent a clear ${ethnicity || 'natural'} look.` },
            { text: "Image 1 (The Clothing Product to wear):" },
            { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Image } }
        ];

        if (poseBase64) {
            requestParts.push({ text: "Image 2 (The exact Pose to replicate):" });
            requestParts.push({ inlineData: { mimeType: poseMimeType || 'image/jpeg', data: poseBase64 } });
        }

        // AUTO-RETRY LOGIC (Max 3 attempts)
        let extractedBase64String = null;
        let extractedMimeType = 'image/jpeg';
        let lastError = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`[Attempt ${attempt}/3] Gemini API Processing: User[${userId}] Ethnicity[${ethnicity}] Pose[${poseId}]`);
                
                const apiResponse = await fetch(geminiApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: requestParts }],
                        generationConfig: { responseModalities: ["IMAGE"] },
                        safetySettings: [
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                        ]
                    })
                });

                const outputPayloadJson = await apiResponse.json();

                if (!apiResponse.ok) {
                    throw new Error(outputPayloadJson.error?.message || `API Status: ${apiResponse.statusText}`);
                }

                const candidate = outputPayloadJson.candidates?.[0];
                if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
                    throw new Error(`SAFETY_BLOCK: AI Engine Execution Blocked (Reason: ${candidate.finishReason})`);
                }

                const parts = candidate?.content?.parts || [];
                for (const part of parts) {
                    if (part.inlineData && part.inlineData.data) {
                        extractedBase64String = part.inlineData.data;
                        extractedMimeType = part.inlineData.mimeType || 'image/png';
                        break;
                    }
                }

                if (extractedBase64String) {
                    break;
                } else {
                    throw new Error("Empty image payload received from Google API.");
                }

            } catch (attemptErr) {
                lastError = attemptErr;
                if (attemptErr.message.includes("SAFETY_BLOCK")) break;
                if (attempt < 3) await sleep(2000);
            }
        }

        if (!extractedBase64String) {
            console.error(`AI Pipeline Execution Breakdown:`, lastError?.message);
            throw new Error(lastError?.message || "Engine failed to generate image after multiple attempts.");
        }

        const dynamicParentFolder = `Model_${modelId}_${sourceName || 'Unknown'}`;
        const outputFileName = `User_${userId}_Model_${modelId}_Pose_${poseId}_${Date.now()}.png`;

        await pool.query(
            `INSERT INTO generated_images (user_id, parent_folder, file_name, mime_type, image_base64) VALUES (?, ?, ?, ?, ?)`,
            [userId, dynamicParentFolder, outputFileName, extractedMimeType, extractedBase64String]
        );

        return res.json({
            success: true,
            image_base64: extractedBase64String,
            mime_type: extractedMimeType,
            generations_remaining: limit - (generatedToday + 1)
        });

    } catch (routeExecutionError) {
        return res.status(500).json({ error: routeExecutionError.message || "Server failed to process image generation." });
    }
});

// ==========================================
// USER GALLERY ENDPOINT (With Pagination)
// ==========================================
app.get('/api/gallery', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        if (page > 5) return res.json({ success: true, count: 0, data: [], totalPages: 5 });

        const [totalRows] = await pool.query(`SELECT COUNT(*) as count FROM generated_images WHERE user_id = ?`, [userId]);
        const totalItems = Math.min(totalRows[0].count, 50); 
        const totalPages = Math.ceil(totalItems / limit);

        const [rows] = await pool.query(
            `SELECT id, parent_folder, file_name, mime_type, created_at FROM generated_images WHERE user_id = ? ORDER BY CURRENT_TIMESTAMP DESC LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        
        res.json({ success: true, count: rows.length, data: rows, totalPages, currentPage: page });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// USER PROFILE ENDPOINT 
// ==========================================
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [users] = await pool.query(`SELECT id, name, email, phone, tier, created_at FROM users WHERE id = ?`, [userId]);
        if (users.length === 0) return res.status(404).json({ error: "User not found." });

        const userTier = users[0].tier || 'free';
        const limit = TIER_LIMITS[userTier];

        const [usageRows] = await pool.query(
            `SELECT COUNT(*) as count FROM generated_images WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
            [userId]
        );

        res.json({
            success: true,
            user: users[0],
            usage: {
                today: usageRows[0].count,
                limit: limit,
                remaining: Math.max(0, limit - usageRows[0].count)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 BackEnd System Server operational on port ${PORT}`);
});