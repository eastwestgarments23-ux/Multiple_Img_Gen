# 🌌 Aurora Pose Generator

A full-stack, modular AI application that generates virtual try-on photographs using the Gemini 2.5 Flash Image model. It features a secure authentication system, daily rate-limiting, and an Aurora-UI inspired React frontend.

## 🚀 Features

- **Multi-Image Processing Engine:** Upload multiple product images and generate matrices of poses sequentially.
- **Secure Authentication:** JWT-based stateless authentication with `bcrypt` password hashing.
- **Quota Management:** IP/Account-based daily rate limiting (Maximum 10 generations per user/day).
- **Aurora UI Design System:** Clean, modern, responsive glassmorphism UI built with React & Vite.
- **Batch Exportation:** Real-time client-side `.ZIP` compilation for individual arrays or master project downloads.
- **Automated DB Initialization:** Self-bootstrapping MySQL tables on first server start.

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, React Router, Lucide Icons, JSZip, CSS Variables (Aurora UI)
- **Backend:** Node.js, Express.js, JWT, Bcrypt
- **Database:** MySQL (mysql2/promise)
- **AI Engine:** Google Gemini (`gemini-2.5-flash-image`)

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- MySQL Server (running locally or remotely)
- Google Gemini API Key

### 1. Database Setup
Ensure your MySQL server is running. You do **not** need to manually create the tables. The backend will automatically create the `pose_generator` database, `users` table, and `generated_images` table upon starting.

### 2. Backend Initialization
Open a terminal and navigate to the `BackEnd` directory:

```bash
cd BackEnd
npm install