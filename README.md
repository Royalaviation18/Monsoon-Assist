# ☔ RainReady

**Your AI-Powered Monsoon Safety Companion**

RainReady is a production-ready, full-stack web application that generates personalized monsoon emergency preparedness plans for Indian households using Google Gemini AI. It features live weather data, multi-family household management, a multilingual safety chatbot, a travel risk advisor, and an interactive survival supplies tracker.

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript |
| Backend | Express.js + TypeScript + Node.js |
| Database | MongoDB (Atlas in production) |
| AI | Google Gemini API |
| Weather | Open-Meteo (free, keyless) |
| Hosting | Vercel (frontend) + Render (backend) |

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongod`)
- A [Google Gemini API key](https://aistudio.google.com/)

### Backend
```bash
cd backend
cp .env.example .env
# Fill in GEMINI_API_KEY and MONGODB_URI in .env
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5174`, backend at `http://localhost:3001`.

---

## ☁️ Production Deployment

### Backend → Render.com

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo → select `monsoon-assist/backend` as root directory
3. Set:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | `GEMINI_API_KEY` | your Gemini key |
   | `GEMINI_MODEL` | `gemini-1.5-flash-latest` |
   | `MONGODB_URI` | your Atlas connection string |
   | `NODE_ENV` | `production` |
   | `ALLOWED_ORIGIN` | your Vercel frontend URL |
5. Deploy. Copy the generated URL (e.g. `https://rainready-api.onrender.com`)

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo → set **Root Directory** to `monsoon-assist/frontend`
3. Add Environment Variable:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | your Render backend URL (e.g. `https://rainready-api.onrender.com`) |
4. Deploy.

---

## ✨ Features

- 🤖 **AI Safety Plans** — Gemini-powered personalized monsoon preparedness manuals
- 🏠 **Multi-Household Profiles** — Manage multiple family locations (home, grandparents' house, etc.)
- 👨‍👩‍👧 **Family Directory** — Register members with age, gender, and special needs for custom checklists
- 🌧 **Live Weather** — Real-time conditions via Open-Meteo for any typed city
- ✅ **Supplies Tracker** — Interactive emergency checklist with quantity tracking
- 🚗 **Travel Advisor** — AI-assessed route safety for monsoon conditions
- 💬 **Safety Chatbot** — Multilingual emergency Q&A in 6 Indian languages
- 🔒 **Production-Safe** — Helmet, rate-limiting, ObjectId validation, ReDoS guards, typed APIs

---

## 🔑 Environment Variables

See [`backend/.env.example`](./backend/.env.example) for all required variables.

---

© 2026 RainReady. Designed for citizen safety and disaster risk reduction.
