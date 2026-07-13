// BackEnd/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-aurora-key-change-in-prod';

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

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
        
        // 1. Create Users Table
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

        // 2. Create Generated Images Table
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
        
        // 3. Automated Schema Migration (Fix for legacy tables)
        const [cols] = await connection.query(`SHOW COLUMNS FROM generated_images LIKE 'user_id'`);
        if (cols.length === 0) {
            console.log("⚙️ Migrating database: Adding missing 'user_id' column to existing generated_images table...");
            // Setting DEFAULT 1 ensures legacy images don't break the NOT NULL constraint and are safely assigned to the first registered user.
            await connection.query(`ALTER TABLE generated_images ADD COLUMN user_id INT NOT NULL DEFAULT 1 AFTER id`);
            console.log("✅ Migration complete.");
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

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        
        if (!name || !email || !phone || !password) {
            return res.status(400).json({ error: "Name, email, phone, and password are required." });
        }

        const [existingUsers] = await pool.query(`SELECT id FROM users WHERE email = ?`, [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ error: "An account with this email already exists." });
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        await pool.query(
            `INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)`,
            [name, email, phone, passwordHash]
        );

        res.status(201).json({ success: true, message: "Account created successfully." });
    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ error: "Failed to register user." });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        const [users] = await pool.query(`SELECT * FROM users WHERE email = ?`, [email]);
        const user = users[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({ 
            success: true, 
            token, 
            user: { id: user.id, name: user.name, email: user.email, phone: user.phone } 
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Server error during login." });
    }
});

// ==========================================
// IMAGE GENERATION ENDPOINT (Protected & Rate Limited)
// ==========================================
app.post('/api/generate-pose', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // 1. Rate Limiting Check
        const [usageRows] = await pool.query(
            `SELECT COUNT(*) as count FROM generated_images WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
            [userId]
        );
        
        const generatedToday = usageRows[0].count;
        if (generatedToday >= 10) {
            return res.status(429).json({ error: "Daily limit reached. You can only generate 10 images per day." });
        }

        const { base64Image, mimeType, poseBase64, poseMimeType, modelId, poseId, ethnicity, sourceName } = req.body;

        if (!base64Image) {
            return res.status(400).json({ error: "Missing required product context file payload." });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey.includes("your_actual_")) {
            return res.status(500).json({ error: "Server Configuration Error: API key missing." });
        }

        const contextualAiPrompt = `You are a professional Virtual Try-On fashion AI. 
        CRITICAL INSTRUCTIONS:
        1. DO NOT create a collage, mood board, or split screen. Generate exactly ONE single, unified, standalone photograph.
        2. Analyze Image 1 (The Clothing Product).
        3. Analyze Image 2 (The Reference Pose).
        4. Generate a photorealistic, safe, and professional catalog image of a person of ${ethnicity} descent.
        5. The person MUST be wearing the exact clothing item from Image 1.
        6. The person MUST be striking the exact same body pose, angle, and framing as shown in Image 2.
        Output only one portrait image of one person.`;

        console.log(`Executing Gemini API: User [${userId}] - Model [${modelId}] - Pose [${poseId}]`);

        const modelName = "gemini-2.5-flash-image";
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const requestParts = [
            { text: contextualAiPrompt },
            { text: "Image 1 (The Clothing Product to wear):" },
            { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Image } }
        ];

        if (poseBase64) {
            requestParts.push({ text: "Image 2 (The exact Pose to replicate):" });
            requestParts.push({ inlineData: { mimeType: poseMimeType || 'image/jpeg', data: poseBase64 } });
        }

        const apiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: requestParts }],
                generationConfig: { responseModalities: ["IMAGE"] }
            })
        });

        const outputPayloadJson = await apiResponse.json();

        if (!apiResponse.ok) {
            console.error("API Error details:", JSON.stringify(outputPayloadJson, null, 2));
            throw new Error(outputPayloadJson.error?.message || `Upstream Engine Failure: ${apiResponse.statusText}`);
        }

        const candidate = outputPayloadJson.candidates?.[0];

        // 🔥 FIX: Explicitly catch and report AI Safety/Refusal blocks
        if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
            console.warn(`⚠️ AI Refused Generation for Pose ${poseId}. Reason: ${candidate.finishReason}`);
            throw new Error(`AI Blocked Request (Reason: ${candidate.finishReason}). This usually means the input images triggered Google's strict safety filters.`);
        }

        let extractedBase64String = null;
        let extractedMimeType = 'image/jpeg';

        const parts = candidate?.content?.parts || [];
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                extractedBase64String = part.inlineData.data;
                extractedMimeType = part.inlineData.mimeType || 'image/png';
                break;
            }
        }

        if (!extractedBase64String) {
            // Log the exact raw payload so we can see what Google actually sent back in the terminal
            console.error("Raw Empty Payload from Google:", JSON.stringify(outputPayloadJson, null, 2));
            throw new Error("Google API succeeded but returned no image. Check the backend terminal for the raw response payload.");
        }

        const dynamicParentFolder = `Model_${modelId}_${sourceName || 'Unknown'}`;
        const outputFileName = `User_${userId}_Model_${modelId}_Pose_${poseId}_${Date.now()}.png`;

        try {
            if (pool) {
                await pool.query(
                    `INSERT INTO generated_images (user_id, parent_folder, file_name, mime_type, image_base64) VALUES (?, ?, ?, ?, ?)`,
                    [userId, dynamicParentFolder, outputFileName, extractedMimeType, extractedBase64String]
                );
            }
        } catch (dbError) {
            console.error("Failed to save image to MySQL:", dbError.message);
        }

        return res.json({
            success: true,
            image_base64: extractedBase64String,
            mime_type: extractedMimeType,
            generations_remaining: 9 - generatedToday 
        });

    } catch (routeExecutionError) {
        console.error("Pipeline Exception:", routeExecutionError);
        return res.status(500).json({ error: routeExecutionError.message || "Server failed to process image generation." });
    }
});

// ==========================================
// USER GALLERY ENDPOINT 
// ==========================================
app.get('/api/gallery', authenticateToken, async (req, res) => {
    try {
        if (!pool) return res.status(500).json({ error: "Database not connected" });
        
        const userId = req.user.id;
        const { folder } = req.query;
        let query = `SELECT id, parent_folder, file_name, mime_type, created_at FROM generated_images WHERE user_id = ?`;
        let params = [userId];

        if (folder) {
            query += ` AND parent_folder = ?`;
            params.push(folder);
        }
        query += ` ORDER BY created_at DESC`;

        const [rows] = await pool.query(query, params);
        res.json({ success: true, count: rows.length, data: rows });
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
        
        const [users] = await pool.query(`SELECT id, name, email, phone, created_at FROM users WHERE id = ?`, [userId]);
        if (users.length === 0) return res.status(404).json({ error: "User not found." });

        const [usageRows] = await pool.query(
            `SELECT COUNT(*) as count FROM generated_images WHERE user_id = ? AND DATE(created_at) = CURDATE()`,
            [userId]
        );

        res.json({
            success: true,
            user: users[0],
            usage: {
                today: usageRows[0].count,
                limit: 10,
                remaining: Math.max(0, 10 - usageRows[0].count)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 BackEnd System Server operational on port ${PORT}`);
});