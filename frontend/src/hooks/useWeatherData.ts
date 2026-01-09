import { useState, useCallback, useEffect } from 'react';
import type {
  Coordinates,
  PrecipitationData,
  WeatherStation,
  DateRange,
} from '../types/weather';
import {
  getNearbyStations,
  getHistoricalData,
  getForecast,
  getStationsInRegion,
} from '../services/api';
import { parseISO, isAfter, isBefore, addDays } from 'date-fns';

interface UseWeatherDataReturn {
  data: PrecipitationData[];
  stations: WeatherStation[];
  allStations: WeatherStation[];
  selectedStation: WeatherStation | null;
  loading: boolean;
  stationsLoading: boolean;
  error: string | null;
  fetchData: (coords: Coordinates, dateRange: DateRange) => Promise<void>;
  setSelectedStation: (station: WeatherStation | null) => void;
}

export function useWeatherData(): UseWeatherDataReturn {
  const [data, setData] = useState<PrecipitationData[]>([]);
  const [stations, setStations] = useState<WeatherStation[]>([]);
  const [allStations, setAllStations] = useState<WeatherStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<WeatherStation | null>(null);
  const [loading, setLoading] = useState(false);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all stations on mount
  useEffect(() => {
    const loadAllStations = async () => {
      setStationsLoading(true);
      try {
        const regionStations = await getStationsInRegion();
        setAllStations(regionStations);
      } catch (err) {
        console.warn('Could not fetch region stations:', err);
      } finally {
        setStationsLoading(false);
      }
    };

    loadAllStations();
  }, []);

  const fetchData = useCallback(async (coords: Coordinates, dateRange: DateRange) => {
    setLoading(true);
    setError(null);

    try {
      const combinedData: PrecipitationData[] = [];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let frostApiConfigured = true;

      // Try to find nearby weather stations and fetch historical data
      try {
        const nearbyStations = await getNearbyStations(coords);
        setStations(nearbyStations);

        if (nearbyStations.length > 0) {
          const station = nearbyStations[0];
          setSelectedStation(station);

          // Fetch historical data if date range includes past dates
          if (isBefore(dateRange.start, today)) {
            const historicalEnd = isAfter(dateRange.end, today) ? today : dateRange.end;
            
            try {
              const historicalResponse = await getHistoricalData(
                station.id,
                dateRange.start,
                historicalEnd
              );

              if (historicalResponse.data) {
                for (const obs of historicalResponse.data) {
                  const precip = obs.observations.find(
                    (o) => o.elementId.includes('precipitation_amount')
                  );
                  const snow = obs.observations.find(
                    (o) => o.elementId === 'surface_snow_thickness'
                  );

                  combinedData.push({
                    time: obs.referenceTime,
                    precipitation: precip?.value ?? 0,
                    snowDepth: snow?.value,
                    isForcast: false,
                  });
                }
              }
            } catch (err) {
              console.warn('Could not fetch historical data:', err);
            }
          }
        }
      } catch (err: unknown) {
        console.warn('Could not fetch weather stations:', err);
        // Check if this is because Frost API is not configured
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { status?: number } };
          if (axiosErr.response?.status === 503) {
            frostApiConfigured = false;
          }
        }
        setStations([]);
        setSelectedStation(null);
      }

      // Fetch forecast data if date range includes future dates
      if (isAfter(dateRange.end, today) || isAfter(addDays(today, 1), dateRange.start)) {
        try {
          const forecastResponse = await getForecast(coords);

          if (forecastResponse.properties?.timeseries) {
            for (const ts of forecastResponse.properties.timeseries) {
              const time = parseISO(ts.time);
              
              // Only include if within our date range
              if (isBefore(time, dateRange.start) || isAfter(time, dateRange.end)) {
                continue;
              }

              // Skip if we already have historical data for this time
              if (combinedData.some((d) => d.time === ts.time)) {
                continue;
              }

              const precip =
                ts.data.next_1_hours?.details?.precipitation_amount ??
                ts.data.next_6_hours?.details?.precipitation_amount ??
                0;

              const temp = ts.data.instant?.details?.air_temperature;
              const windSpeed = ts.data.instant?.details?.wind_speed;
              const windDir = ts.data.instant?.details?.wind_from_direction;

              combinedData.push({
                time: ts.time,
                precipitation: precip,
                temperature: temp,
                windSpeed: windSpeed,
                windDirection: windDir,
                isForcast: true,
              });
            }
          }
        } catch (err) {
          console.warn('Could not fetch forecast data:', err);
        }
      }

      // Sort by time
      combinedData.sort((a, b) => 
        new Date(a.time).getTime() - new Date(b.time).getTime()
      );

      // Calculate accumulated snow depth (simple accumulation model)
      let accumulated = 0;
      for (const point of combinedData) {
        // Rough estimate: 1mm rain ≈ 1cm snow at cold temperatures
        // This is a simplification - real snow ratio varies 5:1 to 20:1
        if (point.snowDepth !== undefined) {
          accumulated = point.snowDepth;
        } else {
          // Assume cold enough for snow if precipitation exists
          accumulated += point.precipitation;
          point.snowDepth = accumulated;
        }
      }

      setData(combinedData);

      // Set warning if Frost API is not configured (only forecast data shown)
      if (!frostApiConfigured) {
        setError('Historical data unavailable (Frost API not configured). Showing forecast only.');
      } else if (combinedData.length === 0) {
        setError('No precipitation data found for this location and time range.');
      }
    } catch (err: unknown) {
      console.error('Error fetching weather data:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || 'Failed to fetch weather data');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch weather data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    stations,
    allStations,
    selectedStation,
    loading,
    stationsLoading,
    error,
    fetchData,
    setSelectedStation,
  };
}

