import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import frostRoutes from './routes/frost';
import forecastRoutes from './routes/forecast';

dotenv.config();

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

