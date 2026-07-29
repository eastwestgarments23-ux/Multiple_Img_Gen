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

// Database API Key Encryption Configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET 
  ? crypto.scryptSync(process.env.ENCRYPTION_SECRET, 'salt', 32) 
  : crypto.scryptSync('fallback-secret-change-me', 'salt', 32); 
const IV_LENGTH = 16;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Token Packages & Pricing
// Base Cost: 1 Token = ₹20
const TOKEN_PACKAGES = {
    '100': 2000,  // 100 * 20 = ₹2,000 (0% discount)
    '500': 8000,  // 500 * 20 = ₹10,000 -> 20% discount = ₹8,000
    '1000': 14000 // 1000 * 20 = ₹20,000 -> 30% discount = ₹14,000
};

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ==========================================
// UTILITIES: ENCRYPTION
// ==========================================
function encrypt(text) {
    if (!text) return null;
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if (!text) return null;
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

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

        const [tokensCol] = await connection.query(`SHOW COLUMNS FROM users LIKE 'tokens'`);
        if (tokensCol.length === 0) {
            console.log("⚙️ Migrating database: Adding 'tokens' column...");
            await connection.query(`ALTER TABLE users ADD COLUMN tokens INT DEFAULT 10 AFTER password_hash`);
        }

        const [apiKeyCol] = await connection.query(`SHOW COLUMNS FROM users LIKE 'api_key'`);
        if (apiKeyCol.length === 0) {
            console.log("⚙️ Migrating database: Adding 'api_key' column...");
            await connection.query(`ALTER TABLE users ADD COLUMN api_key TEXT DEFAULT NULL AFTER tokens`);
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

        const [existing] = await pool.query(`SELECT id FROM users WHERE email = ? OR phone = ?`, [email, phone]);
        if (existing.length > 0) return res.status(409).json({ error: "Email or Phone already exists." });

        const hash = await bcrypt.hash(password, 10);
        // Grant 10 free tokens on sign up
        await pool.query(`INSERT INTO users (name, email, phone, password_hash, tokens) VALUES (?, ?, ?, ?, ?)`, [name, email, phone, hash, 10]);
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
        res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, tokens: user.tokens } });
    } catch (err) {
        res.status(500).json({ error: "Login failed." });
    }
});

// ==========================================
// PAYMENT ENDPOINTS (RAZORPAY)
// ==========================================
app.post('/api/create-payment', authenticateToken, async (req, res) => {
    try {
        const { packageId } = req.body; // e.g., '100', '500', '1000'
        if (!TOKEN_PACKAGES[packageId]) return res.status(400).json({ error: "Invalid token package selected." });

        const amount = TOKEN_PACKAGES[packageId] * 100; // Razorpay expects paise

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
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId } = req.body;
        const packageTokens = parseInt(packageId, 10);
        
        if (!TOKEN_PACKAGES[packageId]) return res.status(400).json({ error: "Invalid package data." });

        const text = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(text).digest('hex');
        
        if (expectedSignature === razorpay_signature) {
            await pool.query(`UPDATE users SET tokens = tokens + ? WHERE id = ?`, [packageTokens, req.user.id]);
            res.json({ success: true, message: `Payment verified. ${packageTokens} tokens added!` });
        } else {
            res.status(400).json({ error: "Invalid signature." });
        }
    } catch (err) {
        res.status(500).json({ error: "Payment verification failed." });
    }
});

// ==========================================
// API KEY MANAGEMENT
// ==========================================
app.post('/api/save-api-key', authenticateToken, async (req, res) => {
    try {
        const { apiKey } = req.body;
        if (!apiKey || apiKey.trim() === '') {
            await pool.query(`UPDATE users SET api_key = NULL WHERE id = ?`, [req.user.id]);
            return res.json({ success: true, message: "API key removed." });
        }
        const encryptedKey = encrypt(apiKey.trim());
        await pool.query(`UPDATE users SET api_key = ? WHERE id = ?`, [encryptedKey, req.user.id]);
        res.json({ success: true, message: "API key securely saved." });
    } catch (err) {
        res.status(500).json({ error: "Failed to save API key." });
    }
});

// ==========================================
// IMAGE GENERATION ENDPOINT
// ==========================================
app.post('/api/generate-pose', authenticateToken, async (req, res) => {
    let connection;
    try {
        const userId = req.user.id;
        
        // Use a transaction to ensure tokens are securely handled
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [userRows] = await connection.query(`SELECT tokens, api_key FROM users WHERE id = ? FOR UPDATE`, [userId]);
        const user = userRows[0];
        
        if (!user || user.tokens < 1) {
            await connection.rollback();
            return res.status(402).json({ error: "INSUFFICIENT_TOKENS", message: "You have run out of tokens. Please recharge your account." });
        }

        if (!user.api_key) {
            await connection.rollback();
            return res.status(403).json({ error: "MISSING_API_KEY", message: "You must add your own Google Gemini API key to generate images." });
        }

        const userApiKey = decrypt(user.api_key);

        const { base64Image, mimeType, poseBase64, poseMimeType, modelId, poseId, ethnicity, sourceName } = req.body;
        if (!base64Image) {
            await connection.rollback();
            return res.status(400).json({ error: "Missing required product image." });
        }

        const modelName = "gemini-3.1-flash-image-preview"; // Google's image model
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${userApiKey}`;

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

        let extractedBase64String = null;
        let extractedMimeType = 'image/jpeg';
        let lastError = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
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
                    if (apiResponse.status === 400 && outputPayloadJson.error?.message?.includes("API key not valid")) {
                        throw new Error("INVALID_API_KEY");
                    }
                    throw new Error(outputPayloadJson.error?.message || `API Status: ${apiResponse.statusText}`);
                }

                const candidate = outputPayloadJson.candidates?.[0];
                if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
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

                if (extractedBase64String) break;
                else throw new Error("Empty image payload received from Google.");

            } catch (attemptErr) {
                lastError = attemptErr;
                if (attemptErr.message === "INVALID_API_KEY" || attemptErr.message.includes("SAFETY_BLOCK")) break;
                if (attempt < 3) await sleep(2000); 
            }
        }

        if (!extractedBase64String) {
            await connection.rollback();
            if (lastError?.message === "INVALID_API_KEY") {
                return res.status(401).json({ error: "Your Google Gemini API Key is invalid or expired. Please update it in your profile." });
            }
            throw new Error(lastError?.message || "Engine failed to generate image after multiple attempts.");
        }

        // Deduct 1 Token on success
        await connection.query(`UPDATE users SET tokens = tokens - 1 WHERE id = ?`, [userId]);

        const dynamicParentFolder = `Model_${modelId}_${sourceName || 'Unknown'}`;
        const outputFileName = `User_${userId}_Model_${modelId}_Pose_${poseId}_${Date.now()}.png`;

        await connection.query(
            `INSERT INTO generated_images (user_id, parent_folder, file_name, mime_type, image_base64) VALUES (?, ?, ?, ?, ?)`,
            [userId, dynamicParentFolder, outputFileName, extractedMimeType, extractedBase64String]
        );

        await connection.commit();

        return res.json({
            success: true,
            image_base64: extractedBase64String,
            mime_type: extractedMimeType,
            tokens_remaining: user.tokens - 1
        });

    } catch (routeExecutionError) {
        if (connection) await connection.rollback();
        return res.status(500).json({ error: routeExecutionError.message || "Server failed to process image generation." });
    } finally {
        if (connection) connection.release();
    }
});

// ==========================================
// USER GALLERY ENDPOINT 
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
        
        const [users] = await pool.query(`SELECT id, name, email, phone, tokens, api_key, created_at FROM users WHERE id = ?`, [userId]);
        if (users.length === 0) return res.status(404).json({ error: "User not found." });

        const userData = users[0];
        
        res.json({
            success: true,
            user: {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                phone: userData.phone,
                tokens: userData.tokens,
                hasApiKey: !!userData.api_key,
                created_at: userData.created_at
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 BackEnd System Server operational on port ${PORT}`);
});