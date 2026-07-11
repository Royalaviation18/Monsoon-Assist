import dotenv from 'dotenv';
dotenv.config(); // Must be called first to populate process.env

import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import assistantRouter from './routes/assistant.routes';

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/monsoon-assist';

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/monsoon', assistantRouter);

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    database: dbStatus,
    api: process.env.GEMINI_API_KEY ? 'gemini_configured' : 'fallback_mode'
  });
});

// Setup fallback data seed for alerts
const seedDefaultAlerts = async () => {
  try {
    const { SafetyAlert } = await import('./db/models');
    const count = await SafetyAlert.countDocuments();
    if (count === 0) {
      await SafetyAlert.create([
        {
          severity: 'critical',
          title: 'Heavy Rainfall Alert (Red Warning)',
          message: 'Very heavy rainfall expected over the next 24-48 hours. Risk of localized flooding and traffic disruption.',
          location: 'Mumbai',
          recommendations: [
            'Avoid unnecessary travel, particularly near low-lying subways.',
            'Keep emergency contacts and power banks fully charged.',
            'Ensure pets are moved to elevated dry zones.'
          ]
        },
        {
          severity: 'warning',
          title: 'Waterlogging Advisory',
          message: 'Water accumulation reported near Outer Ring Road. Travel delay anticipated.',
          location: 'Bengaluru',
          recommendations: [
            'Use alternative ring roads to avoid water logging.',
            'Drive slow to avoid hydroplaning.',
            'Keep emergency flashlight inside your vehicle glove compartment.'
          ]
        }
      ]);
      console.log('Seeded default safety alerts successfully.');
    }
  } catch (err) {
    console.error('Failed to seed default alerts:', err);
  }
};

// Database Connection
console.log(`Connecting to database at: ${MONGODB_URI}`);
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    await seedDefaultAlerts();
  })
  .catch((err) => {
    console.error('MongoDB connection failed. Booting in DB-disconnected safe mode.', err.message);
  });

// Start Server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Monsoon Assist Backend running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=========================================`);
});
