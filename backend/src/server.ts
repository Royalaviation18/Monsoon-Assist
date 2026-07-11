import dotenv from 'dotenv';
dotenv.config(); // Must be called first to populate process.env

import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import assistantRouter from './routes/assistant.routes';

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rainready';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5174';

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile/curl) or from allowed origin
    if (!origin || origin === ALLOWED_ORIGIN) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} is not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 60,                   // 60 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again in a minute.' }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,                   // AI generation is expensive — stricter limit
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI generation rate limit exceeded. Please wait a moment.' }
});

app.use('/api/monsoon', apiLimiter);
app.use('/api/monsoon/plan', aiLimiter);
app.use('/api/monsoon/chat', aiLimiter);
app.use('/api/monsoon/travel', aiLimiter);

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/monsoon', assistantRouter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', async (_req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    product: 'RainReady',
    version: process.env.npm_package_version || '1.0.0',
    database: dbStatus,
    ai: process.env.GEMINI_API_KEY ? 'gemini_configured' : 'fallback_mode',
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const isDev = process.env.NODE_ENV === 'development';
  console.error('[RainReady] Unhandled error:', err.message);
  res.status(500).json({
    error: 'An internal server error occurred.',
    ...(isDev && { detail: err.message }),
  });
});

// ─── Seed Default Safety Alerts ──────────────────────────────────────────────
const seedDefaultAlerts = async () => {
  try {
    const { SafetyAlert } = await import('./db/models');
    const count = await SafetyAlert.countDocuments();
    if (count === 0) {
      await SafetyAlert.create([
        {
          severity: 'critical',
          title: 'Heavy Rainfall Alert (Red Warning)',
          message: 'Very heavy rainfall expected over the next 24–48 hours. Risk of localized flooding and traffic disruption.',
          location: 'Mumbai',
          recommendations: [
            'Avoid unnecessary travel, particularly near low-lying subways.',
            'Keep emergency contacts and power banks fully charged.',
            'Ensure pets are moved to elevated dry zones.',
          ]
        },
        {
          severity: 'warning',
          title: 'Waterlogging Advisory',
          message: 'Water accumulation reported near Outer Ring Road. Travel delay anticipated.',
          location: 'Bengaluru',
          recommendations: [
            'Use alternative ring roads to avoid waterlogging.',
            'Drive slowly to avoid hydroplaning.',
            'Keep an emergency flashlight in your vehicle glove compartment.',
          ]
        }
      ]);
      console.log('[RainReady] Seeded default safety alerts successfully.');
    }
  } catch (err) {
    console.error('[RainReady] Failed to seed default alerts:', err);
  }
};

// ─── Database Connection ──────────────────────────────────────────────────────
console.log(`[RainReady] Connecting to MongoDB...`);
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('[RainReady] Successfully connected to MongoDB.');
    await seedDefaultAlerts();
  })
  .catch((err) => {
    console.error('[RainReady] MongoDB connection failed. Booting in DB-disconnected safe mode.', err.message);
  });

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` ☔ RainReady Backend · Port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=========================================`);
});
