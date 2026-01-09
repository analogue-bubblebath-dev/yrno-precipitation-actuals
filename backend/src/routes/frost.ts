import { Router, Request, Response } from 'express';
import axios from 'axios';
import { cache } from '../services/cache';

const router = Router();

const FROST_API_URL = 'https://frost.met.no';
const USER_AGENT = 'SnowPrecipitationApp/1.0 github.com/snow-precipitation-app';

// Get Frost API credentials from environment
const getFrostAuth = () => {
  const clientId = process.env.FROST_CLIENT_ID;
  if (!clientId) {
    return null;
  }
  return { username: clientId, password: '' };
};

// Find nearest weather stations
router.get('/stations', async (req: Request, res: Response) => {
  try {
    const auth = getFrostAuth();
    if (!auth) {
      res.status(503).json({ 
        error: 'Frost API not configured. Historical data unavailable.',
        details: 'To enable historical data, register at frost.met.no and set FROST_CLIENT_ID in backend/.env'
      });
      return;
    }

    const { lat, lon, maxDistance = 50000 } = req.query;

    if (!lat || !lon) {
      res.status(400).json({ error: 'lat and lon query parameters are required' });
      return;
    }

    const cacheKey = cache.generateKey('stations', lat as string, lon as string, maxDistance as string);
    const cached = cache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    // First try to find stations with precipitation/snow elements
    let response;
    try {
      response = await axios.get(`${FROST_API_URL}/sources/v0.jsonld`, {
        params: {
          geometry: `nearest(POINT(${lon} ${lat}))`,
          nearestmaxcount: 10,
          elements: 'sum(precipitation_amount PT1H),surface_snow_thickness',
        },
        auth,
        headers: { 'User-Agent': USER_AGENT },
      });
    } catch (innerError) {
      // If no stations found with specific elements, try without element filter
      if (axios.isAxiosError(innerError) && innerError.response?.status === 404) {
        response = await axios.get(`${FROST_API_URL}/sources/v0.jsonld`, {
          params: {
            geometry: `nearest(POINT(${lon} ${lat}))`,
            nearestmaxcount: 10,
          },
          auth,
          headers: { 'User-Agent': USER_AGENT },
        });
      } else {
        throw innerError;
      }
    }

    const result = response.data;
    cache.set(cacheKey, result, 3600); // Cache for 1 hour
    res.json(result);
  } catch (error: unknown) {
    console.error('Frost stations error:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        res.status(401).json({ error: 'Invalid Frost API credentials. Please check FROST_CLIENT_ID.' });
        return;
      }
      if (error.response?.status === 404) {
        // No stations found - return empty result
        res.json({ data: [] });
        return;
      }
      res.status(error.response?.status || 500).json({ 
        error: 'Failed to fetch stations',
        details: error.response?.data 
      });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

// Get historical observations
router.get('/observations', async (req: Request, res: Response) => {
  try {
    const auth = getFrostAuth();
    if (!auth) {
      res.status(503).json({ 
        error: 'Frost API not configured. Historical data unavailable.',
        details: 'To enable historical data, register at frost.met.no and set FROST_CLIENT_ID in backend/.env'
      });
      return;
    }

    const { sources, elements, referencetime } = req.query;

    if (!sources || !referencetime) {
      res.status(400).json({ 
        error: 'sources and referencetime query parameters are required' 
      });
      return;
    }

    const cacheKey = cache.generateKey(
      'observations',
      sources as string,
      elements as string,
      referencetime as string
    );
    const cached = cache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const response = await axios.get(`${FROST_API_URL}/observations/v0.jsonld`, {
      params: {
        sources,
        elements: elements || 'sum(precipitation_amount PT1H),surface_snow_thickness',
        referencetime,
        timeresolutions: 'PT1H',
      },
      auth,
      headers: { 'User-Agent': USER_AGENT },
    });

    const result = response.data;
    // Cache historical data longer (1 hour) since it doesn't change
    cache.set(cacheKey, result, 3600);
    res.json(result);
  } catch (error: unknown) {
    console.error('Frost observations error:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        res.status(401).json({ error: 'Invalid Frost API credentials.' });
        return;
      }
      if (error.response?.status === 404) {
        res.json({ data: [] }); // No data found for this period
        return;
      }
      res.status(error.response?.status || 500).json({ 
        error: 'Failed to fetch observations',
        details: error.response?.data 
      });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch observations' });
  }
});

export default router;

