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

const TIER_PRICING = {
    'pro': 999,   // ₹999
    'elite': 2499 // ₹2499
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
// MIDDLEWARE
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
// PAYMENT ENDPOINTS (RAZORPAY)
// ==========================================
app.post('/api/create-payment', authenticateToken, async (req, res) => {
    try {
        const { targetTier } = req.body;
        if (!TIER_PRICING[targetTier]) return res.status(400).json({ error: "Invalid tier." });

        const amount = TIER_PRICING[targetTier] * 100; // Razorpay expects paise

        const order = await razorpayInstance.orders.create({
            amount,
            currency: "INR",
            receipt: `receipt_${req.user.id}_${Date.now()}`
        });

        res.json({ success: true, order, keyId: process.env.RAZORPAY_KEY_ID });
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
// IMAGE GENERATION ENDPOINT
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
        const modelName = "gemini-3.1-flash-image-preview"; // Example model name, adjust as needed
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const contextualAiPrompt = `You are a professional Virtual Try-On fashion AI. 
        CRITICAL INSTRUCTIONS:
        1. DO NOT create a collage, mood board, or split screen. Generate exactly ONE single, unified, standalone photograph.
        2. Analyze Image 1 (The Clothing Product).
        3. Analyze Image 2 (The Reference Pose).
        4. Generate a photorealistic, safe, and professional catalog image of a person of ${ethnicity} descent.
        5. The person MUST be wearing the exact clothing item from Image 1.
        6. The person MUST be striking the exact same body pose, angle, and framing as shown in Image 2.
        Output only one portrait image of one person.`;

        const requestParts = [
            { text: contextualAiPrompt },
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
                console.log(`[Attempt ${attempt}/3] Gemini API: User[${userId}] Model[${modelId}] Pose[${poseId}]`);
                
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
                    // Safety blocks shouldn't be retried, they will just fail again
                    throw new Error(`SAFETY_BLOCK: AI Refused (Reason: ${candidate.finishReason})`);
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
                    break; // Success! Break out of the retry loop
                } else {
                    throw new Error("Empty image payload received from Google.");
                }

            } catch (attemptErr) {
                lastError = attemptErr;
                if (attemptErr.message.includes("SAFETY_BLOCK")) break; // Don't retry safety blocks
                if (attempt < 3) await sleep(2000); // Wait 2s before retry
            }
        }

        if (!extractedBase64String) {
            console.error(`Pipeline Failed after retries:`, lastError?.message);
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

        // Cap at 5 pages max (50 items)
        if (page > 5) return res.json({ success: true, count: 0, data: [], totalPages: 5 });

        const [totalRows] = await pool.query(`SELECT COUNT(*) as count FROM generated_images WHERE user_id = ?`, [userId]);
        const totalItems = Math.min(totalRows[0].count, 50); // Cap absolute total to 50 for pagination logic
        const totalPages = Math.ceil(totalItems / limit);

        const [rows] = await pool.query(
            `SELECT id, parent_folder, file_name, mime_type, created_at FROM generated_images WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
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