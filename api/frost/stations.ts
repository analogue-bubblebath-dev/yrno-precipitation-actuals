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
      error: 'Frost API not configured. Historical data unavailable.',
      details: 'To enable historical data, set FROST_CLIENT_ID environment variable'
    });
  }

  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon query parameters are required' });
  }

  try {
    // First try with specific elements
    let response = await fetch(
      `${FROST_API_URL}/sources/v0.jsonld?geometry=nearest(POINT(${lon} ${lat}))&nearestmaxcount=10&elements=sum(precipitation_amount PT1H),surface_snow_thickness`,
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${clientId}:`).toString('base64'),
          'User-Agent': USER_AGENT,
        },
      }
    );

    // If 404, try without element filter
    if (response.status === 404) {
      response = await fetch(
        `${FROST_API_URL}/sources/v0.jsonld?geometry=nearest(POINT(${lon} ${lat}))&nearestmaxcount=10`,
        {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${clientId}:`).toString('base64'),
            'User-Agent': USER_AGENT,
          },
        }
      );
    }

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
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.json(data);
  } catch (error) {
    console.error('Frost stations error:', error);
    return res.status(500).json({ error: 'Failed to fetch stations' });
  }
}

