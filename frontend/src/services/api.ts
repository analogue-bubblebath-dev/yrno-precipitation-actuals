import axios from 'axios';
import type {
  Coordinates,
  FrostResponse,
  LocationForecastResponse,
  SearchResult,
  WeatherStation,
} from '../types/weather';
import { format } from 'date-fns';

const api = axios.create({
  baseURL: '/api',
});

// Nominatim geocoding API (direct call - no auth needed)
const nominatim = axios.create({
  baseURL: 'https://nominatim.openstreetmap.org',
  headers: {
    'User-Agent': 'SnowPrecipitationApp/1.0',
  },
});

export async function searchPlaces(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 3) return [];
  
  const response = await nominatim.get('/search', {
    params: {
      q: query,
      format: 'json',
      limit: 5,
    },
  });
  
  return response.data;
}

export async function reverseGeocode(coords: Coordinates): Promise<string> {
  const response = await nominatim.get('/reverse', {
    params: {
      lat: coords.lat,
      lon: coords.lon,
      format: 'json',
    },
  });
  
  return response.data.display_name || `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`;
}

export async function getNearbyStations(coords: Coordinates): Promise<WeatherStation[]> {
  const response = await api.get('/frost/stations', {
    params: {
      lat: coords.lat,
      lon: coords.lon,
    },
  });
  
  // Parse the JSON-LD response
  const data = response.data;
  if (!data.data) return [];
  
  return data.data.map((station: Record<string, unknown>) => ({
    id: station['@id'] || station.id,
    name: station.name,
    geometry: station.geometry,
    distance: station.distance,
  }));
}

export async function getHistoricalData(
  stationId: string,
  startDate: Date,
  endDate: Date
): Promise<FrostResponse> {
  const referencetime = `${format(startDate, 'yyyy-MM-dd')}/${format(endDate, 'yyyy-MM-dd')}`;
  
  const response = await api.get('/frost/observations', {
    params: {
      sources: stationId,
      referencetime,
      elements: 'sum(precipitation_amount PT1H),surface_snow_thickness',
    },
  });
  
  return response.data;
}

export async function getForecast(coords: Coordinates): Promise<LocationForecastResponse> {
  const response = await api.get('/forecast', {
    params: {
      lat: coords.lat.toFixed(4),
      lon: coords.lon.toFixed(4),
    },
  });
  
  return response.data;
}

