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
import { parseISO, isAfter, isBefore, addDays, startOfDay, endOfDay } from 'date-fns';

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
                  const temp = obs.observations.find(
                    (o) => o.elementId === 'air_temperature'
                  );
                  const windSpeed = obs.observations.find(
                    (o) => o.elementId === 'wind_speed'
                  );
                  const windDir = obs.observations.find(
                    (o) => o.elementId === 'wind_from_direction'
                  );

                  combinedData.push({
                    time: obs.referenceTime,
                    precipitation: precip?.value ?? 0,
                    snowDepth: snow?.value,
                    temperature: temp?.value,
                    windSpeed: windSpeed?.value,
                    windDirection: windDir?.value,
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
            // Normalize date range boundaries to start/end of day for proper comparison
            const rangeStart = startOfDay(dateRange.start);
            const rangeEnd = endOfDay(dateRange.end);
            
            for (const ts of forecastResponse.properties.timeseries) {
              const time = parseISO(ts.time);
              
              // Only include if within our date range (inclusive of boundaries)
              if (isBefore(time, rangeStart) || isAfter(time, rangeEnd)) {
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

      // Calculate accumulated snow depth
      // For historical data: use observed values
      // For forecast data: only estimate if we have a baseline from historical data
      let accumulated: number | undefined = undefined;
      
      // Find the last historical snow depth to use as baseline for forecasts
      // Process in chronological order to find the last observed value
      for (const point of combinedData) {
        if (!point.isForcast && point.snowDepth !== undefined && point.snowDepth !== null) {
          // Use observed snow depth from historical data
          accumulated = point.snowDepth;
          point.snowDepth = accumulated; // Keep the observed value
        } else if (point.isForcast) {
          // For forecast data, only estimate if we have a baseline
          if (accumulated === undefined) {
            // No baseline available - leave forecast snow depth undefined (will show as "—")
            point.snowDepth = undefined;
            continue;
          }
          
          // We have a baseline, estimate changes based on precipitation and temperature
          // TypeScript: accumulated is guaranteed to be a number here
          const currentSnow = accumulated;
          const temp = point.temperature ?? 0;
          
          // Start from the accumulated value (carry forward existing snow)
          let newAccumulated: number = currentSnow;
          
          // If temperature is cold enough for snow (≤ 2°C) and there's precipitation, add snow
          if (temp <= 2 && point.precipitation > 0) {
            // Snow ratio: 1mm precipitation ≈ 1cm snow depth at cold temps
            // (This is simplified - real ratios vary 5:1 to 20:1 depending on conditions)
            newAccumulated += point.precipitation;
          }
          
          // Account for snow melt ONLY when temperature is above freezing
          // Rough estimate: melt rate ~0.1cm per hour per degree above 0°C
          if (temp > 0 && newAccumulated > 0) {
            const meltRate = Math.min(newAccumulated, temp * 0.1); // Max 10% per hour per degree
            newAccumulated = Math.max(0, newAccumulated - meltRate);
          }
          
          // Update accumulated for next forecast point
          accumulated = newAccumulated;
          point.snowDepth = newAccumulated;
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

