import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import frostRoutes from './routes/frost';
import forecastRoutes from './routes/forecast';

// Load .env from the backend directory (works with both ESM and CJS)
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading .env:', result.error);
} else {
  console.log('Loaded env vars:', Object.keys(result.parsed || {}));
}
console.log('FROST_CLIENT_ID loaded:', process.env.FROST_CLIENT_ID ? 'Yes' : 'No');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/frost', frostRoutes);
app.use('/api/forecast', forecastRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

