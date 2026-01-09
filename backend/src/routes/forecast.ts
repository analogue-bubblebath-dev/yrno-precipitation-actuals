import { Router, Request, Response } from 'express';
import axios from 'axios';
import { cache } from '../services/cache';

const router = Router();

const LOCATIONFORECAST_API_URL = 'https://api.met.no/weatherapi/locationforecast/2.0';
const USER_AGENT = 'SnowPrecipitationApp/1.0 github.com/snow-precipitation-app';

// Get weather forecast for a location
router.get('/', async (req: Request, res: Response) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      res.status(400).json({ error: 'lat and lon query parameters are required' });
      return;
    }

    const cacheKey = cache.generateKey('forecast', lat as string, lon as string);
    const cached = cache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const response = await axios.get(`${LOCATIONFORECAST_API_URL}/compact`, {
      params: { lat, lon },
      headers: { 
        'User-Agent': USER_AGENT,
      },
    });

    const result = response.data;
    // Cache forecast for 30 minutes (API updates hourly)
    cache.set(cacheKey, result, 1800);
    res.json(result);
  } catch (error: unknown) {
    console.error('Forecast error:', error);
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({ 
        error: 'Failed to fetch forecast',
        details: error.response?.data 
      });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

export default router;

