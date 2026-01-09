import type { VercelRequest, VercelResponse } from '@vercel/node';

const FROST_API_URL = 'https://frost.met.no';
const USER_AGENT = 'SnowPrecipitationApp/1.0 github.com/snow-precipitation-app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.FROST_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ 
      error: 'Frost API not configured. Station data unavailable.',
      details: 'To enable station data, set FROST_CLIENT_ID environment variable'
    });
  }

  const { bbox, country } = req.query;

  try {
    let geometryParam = '';
    
    if (bbox) {
      // bbox format: "minLon,minLat,maxLon,maxLat"
      const [minLon, minLat, maxLon, maxLat] = (bbox as string).split(',').map(Number);
      geometryParam = `geometry=POLYGON((${minLon} ${minLat},${maxLon} ${minLat},${maxLon} ${maxLat},${minLon} ${maxLat},${minLon} ${minLat}))`;
    } else {
      // Default to Norway if no bbox provided
      geometryParam = `country=${country || 'NO'}`;
    }

    // Fetch stations that have precipitation data
    const url = `${FROST_API_URL}/sources/v0.jsonld?${geometryParam}&types=SensorSystem&elements=sum(precipitation_amount PT1H)`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:`).toString('base64'),
        'User-Agent': USER_AGENT,
      },
    });

    if (response.status === 401) {
      return res.status(401).json({ error: 'Invalid Frost API credentials.' });
    }

    if (response.status === 404) {
      return res.json({ data: [] });
    }

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Failed to fetch stations',
        details: await response.text()
      });
    }

    const data = await response.json();
    
    // Cache for 1 hour since station data doesn't change frequently
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.json(data);
  } catch (error) {
    console.error('Frost stations-region error:', error);
    return res.status(500).json({ error: 'Failed to fetch stations' });
  }
}
