# 🛒 Smart Bill Generator - AI-Powered GST POS & Retail Billing System

An enterprise-grade, lightning-fast Point of Sale (POS) and GST billing application built for Indian retail shops, kirana stores, supermarkets, and shopping malls. Featuring **AI Voice-to-Cart billing (`gemini-3.5-transcribe`)**, real-time inventory management, dynamic UPI QR payments, camera barcode scanning, customer loyalty rewards, and multi-owner cloud sync via Firebase Firestore.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-teal)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-gemini--3.5--transcribe-orange)
![Firebase](https://img.shields.io/badge/Database-Firestore-amber)

---

## 🌟 Key Highlights & Features

### 🎙️ 1. AI Voice-to-Cart Billing (बोलकर बिल बनाएं)
- **Powered by Google Gemini (`gemini-3.5-transcribe`)**: Speak naturally in **Hindi**, **Hinglish**, or **English** to build customer carts automatically.
- **Smart Kirana Colloquials**: Understands traditional Indian weight measurements (*"aadha kilo"*, *"pao"*, *"dedh kilo"*, *"dhai kilo"*, *"darjan"*) and numbers in Hindi/Devanagari (*"२ पैकेट मैगी और १ किलो चीनी"*).
- **Dual Engine Audio**: In-browser Web Speech API + hardware-level `MediaRecorder` audio capture with real-time audio wave visualization.
- **Auto-Silence Detection**: Automatically finalizes speech and populates items into the cart without requiring manual button clicks.

### 🧾 2. Indian GST POS & Dynamic Invoice Engine
- **Compliant GST Calculations**: Automatic CGST, SGST, IGST computation from MRP-inclusive prices with HSN/SAC code tracking.
- **Dynamic UPI QR Code**: Generates real-time, zero-touch UPI payment QR codes (PhonePe, Google Pay, Paytm, BHIM) mapped to the bill amount.
- **Split Payments**: Flexible settlement across Cash, UPI, and Card.
- **Thermal & A4 Invoices**: One-click printing support for 58mm/80mm thermal receipt printers and standard A4 tax invoices.
- **Hold & Resume Bills**: Park active bills to attend other customers and resume seamlessly.

### 📦 3. Inventory & Barcode Operations
- **Dual Scanner Support**: Fast USB/Bluetooth hardware barcode scanner input and built-in mobile/webcam barcode scanning (`html5-qrcode`).
- **Loose & Portion Weighing**: Sell fraction weights for grains, pulses, sugar, and produce (e.g., 250g, 500g, 1.25kg).
- **Stock Tracking & Alerts**: Low stock threshold notifications and real-time inventory deduction upon billing.

### 👥 4. Multi-Counter, Multi-Owner & Customer Loyalty
- **Isolated Shop Profiles**: Multi-tenant architecture supporting individual store owner logins, custom branding, GSTIN, and receipts.
- **Cashier Shifts & PIN Security**: Multi-counter support with secure PIN-based cashier logins and admin privileges.
- **Loyalty Program**: Customer purchase tracking by phone number, automated tier points (Bronze, Silver, Gold), and checkout point redemptions.
- **Real-Time Cloud Persistence**: Firestore cloud syncing with instant offline-first `localStorage` resilience.

---

## 🚀 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, HTML5-QRCode, QRCode.js
- **Backend**: Node.js, Express, TSX, Vite Middleware
- **AI & Speech**: `@google/genai` TypeScript SDK (`gemini-3.5-transcribe`), Web Speech API, Web Audio API
- **Database & Auth**: Firebase Firestore & Firebase Authentication

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or bun
- Gemini API Key (set in `.env`)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/smart-bill-generator.git
   cd smart-bill-generator
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production:**
   ```bash
   npm run build
   npm start
   ```

---

## ⌨️ Useful Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `V` / `Alt + V` | Open Voice Cart Assistant (बोलकर बिल बनाएं) |
| `Spacebar` (Hold) | Push-to-talk in voice modal |
| `/` | Focus search / barcode input |
| `Alt + S` / `F4` | Toggle Camera Barcode Scanner |
| `Enter` | Add scanned barcode or typed search to bill |

---

## 📄 License
This project is licensed under the MIT License.
