import type { VercelRequest, VercelResponse } from '@vercel/node';

const LOCATIONFORECAST_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const USER_AGENT = 'SnowPrecipitationApp/1.0 github.com/snow-precipitation-app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon query parameters are required' });
  }

  try {
    const response = await fetch(
      `${LOCATIONFORECAST_URL}?lat=${lat}&lon=${lon}`,
      {
        headers: {
          'User-Agent': USER_AGENT,
        },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Failed to fetch forecast',
        details: await response.text()
      });
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');
    return res.json(data);
  } catch (error) {
    console.error('Forecast error:', error);
    return res.status(500).json({ error: 'Failed to fetch forecast' });
  }
}

