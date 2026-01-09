export interface Coordinates {
  lat: number;
  lon: number;
}

export interface WeatherStation {
  id: string;
  name: string;
  geometry: {
    coordinates: [number, number];
  };
  distance?: number;
}

export interface PrecipitationData {
  time: string;
  precipitation: number; // mm
  snowDepth?: number; // cm
  temperature?: number; // °C
  windSpeed?: number; // m/s
  windDirection?: number; // degrees
  isForcast: boolean;
}

export interface FrostObservation {
  sourceId: string;
  referenceTime: string;
  observations: Array<{
    elementId: string;
    value: number;
    unit: string;
  }>;
}

export interface FrostResponse {
  data?: FrostObservation[];
}

export interface LocationForecastTimeseries {
  time: string;
  data: {
    instant: {
      details: {
        air_temperature?: number;
        wind_speed?: number;
        wind_from_direction?: number;
        relative_humidity?: number;
        air_pressure_at_sea_level?: number;
      };
    };
    next_1_hours?: {
      summary: {
        symbol_code: string;
      };
      details: {
        precipitation_amount?: number;
      };
    };
    next_6_hours?: {
      summary: {
        symbol_code: string;
      };
      details: {
        precipitation_amount?: number;
      };
    };
  };
}

export interface LocationForecastResponse {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number, number];
  };
  properties: {
    meta: {
      updated_at: string;
      units: Record<string, string>;
    };
    timeseries: LocationForecastTimeseries[];
  };
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface HeatmapCell {
  day: number; // 0-6 for day of week, or date index
  hour: number; // 0-23
  value: number;
}

export interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

