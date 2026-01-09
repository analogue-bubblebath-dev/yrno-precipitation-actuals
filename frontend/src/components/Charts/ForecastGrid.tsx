import { useMemo } from 'react';
import { format, parseISO, startOfDay, isSameDay } from 'date-fns';
import type { PrecipitationData } from '../../types/weather';

interface ForecastGridProps {
  data: PrecipitationData[];
}

interface PeriodData {
  precipitation: number;
  snowDepth: number | undefined; // undefined means no estimate available (for forecasts without baseline)
  temperature: number | null;
  minTemp: number | null;
  maxTemp: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  freezingLevel: number | null;
  count: number;
  isForecast: boolean;
}

interface DayData {
  date: Date;
  periods: {
    [key: string]: PeriodData;
  };
}

function getTimePeriod(hour: number): string {
  if (hour >= 0 && hour < 6) return 'night-early';
  if (hour >= 6 && hour < 12) return 'AM';
  if (hour >= 12 && hour < 18) return 'PM';
  return 'night-late';
}

// Calculate freezing level based on temperature and standard lapse rate
// Approximate: temperature drops ~6.5°C per 1000m
function calculateFreezingLevel(tempAtLocation: number, locationAltitude: number = 0): number {
  if (tempAtLocation <= 0) return 0; // Freezing at or below location
  // Height above location where temp reaches 0°C
  const heightAbove = (tempAtLocation / 6.5) * 1000;
  return Math.round(locationAltitude + heightAbove);
}

function aggregateDataByDayAndPeriod(data: PrecipitationData[]): DayData[] {
  const dayMap = new Map<string, DayData>();

  data.forEach((point) => {
    const date = parseISO(point.time);
    const dayKey = format(date, 'yyyy-MM-dd');
    const hour = date.getHours();
    const period = getTimePeriod(hour);

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, {
        date: startOfDay(date),
        periods: {},
      });
    }

    const dayData = dayMap.get(dayKey)!;
    if (!dayData.periods[period]) {
      dayData.periods[period] = {
        precipitation: 0,
        snowDepth: undefined as number | undefined, // Start as undefined, only set if we have data
        temperature: null,
        minTemp: null,
        maxTemp: null,
        windSpeed: null,
        windDirection: null,
        freezingLevel: null,
        count: 0,
        isForecast: point.isForcast,
      };
    }

    const p = dayData.periods[period];
    p.precipitation += point.precipitation;
    // Use the last snow depth value in the period (snow depth is cumulative)
    // Only update if we have a valid value (undefined means no estimate available)
    if (point.snowDepth !== undefined && point.snowDepth !== null) {
      p.snowDepth = point.snowDepth;
    }
    
    // Track temperature (average), min, and max
    if (point.temperature !== undefined && point.temperature !== null) {
      if (p.temperature === null) {
        p.temperature = point.temperature;
        p.minTemp = point.temperature;
        p.maxTemp = point.temperature;
      } else {
        p.temperature = (p.temperature * p.count + point.temperature) / (p.count + 1);
        p.minTemp = Math.min(p.minTemp!, point.temperature);
        p.maxTemp = Math.max(p.maxTemp!, point.temperature);
      }
    }

    // Track wind (use latest values)
    if (point.windSpeed !== undefined) {
      p.windSpeed = point.windSpeed;
    }
    if (point.windDirection !== undefined) {
      p.windDirection = point.windDirection;
    }

    p.count += 1;
    p.isForecast = p.isForecast || point.isForcast;
  });

  // Final pass: recalculate freezing levels for all periods using final average temperatures
  dayMap.forEach((day) => {
    Object.values(day.periods).forEach((period) => {
      if (period.temperature !== null && period.temperature !== undefined) {
        period.freezingLevel = calculateFreezingLevel(period.temperature);
      }
    });
  });

  // Sort by date
  return Array.from(dayMap.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
}

function getPrecipitationColor(mm: number): string {
  if (mm === 0) return 'bg-slate-700/50';
  if (mm < 1) return 'bg-blue-900/60';
  if (mm < 3) return 'bg-blue-700/70';
  if (mm < 5) return 'bg-blue-500/80';
  if (mm < 10) return 'bg-cyan-500/80';
  return 'bg-cyan-400';
}

function getSnowColor(cm: number): string {
  if (cm === 0) return 'bg-slate-700/50';
  if (cm < 5) return 'bg-sky-900/60';
  if (cm < 10) return 'bg-sky-700/70';
  if (cm < 20) return 'bg-sky-500/80';
  if (cm < 50) return 'bg-sky-400/90';
  return 'bg-sky-300';
}

// Snow badge component - shows actual snow depth with color coding
function SnowBadge({ cm }: { cm: number | undefined }) {
  // If no estimate available, show inactive badge
  if (cm === undefined) {
    return (
      <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg border-2 border-slate-600 bg-slate-800/30 text-slate-500 font-bold text-sm opacity-50">
        —
      </div>
    );
  }

  // Determine badge color based on snow depth
  // Show the actual rounded value, not arbitrary levels
  const roundedValue = Math.round(cm);
  let bgColor: string;
  let textColor: string;
  let borderColor: string;

  if (roundedValue === 0) {
    bgColor = 'bg-slate-600';
    textColor = 'text-slate-300';
    borderColor = 'border-slate-500';
  } else if (roundedValue < 5) {
    bgColor = 'bg-sky-800';
    textColor = 'text-sky-200';
    borderColor = 'border-sky-600';
  } else if (roundedValue < 10) {
    bgColor = 'bg-sky-600';
    textColor = 'text-white';
    borderColor = 'border-sky-400';
  } else if (roundedValue < 20) {
    bgColor = 'bg-cyan-500';
    textColor = 'text-white';
    borderColor = 'border-cyan-300';
  } else if (roundedValue < 40) {
    bgColor = 'bg-cyan-400';
    textColor = 'text-cyan-900';
    borderColor = 'border-cyan-200';
  } else if (roundedValue < 60) {
    bgColor = 'bg-teal-400';
    textColor = 'text-teal-900';
    borderColor = 'border-teal-200';
  } else {
    bgColor = 'bg-emerald-400';
    textColor = 'text-emerald-900';
    borderColor = 'border-emerald-200';
  }

  // For values >= 100, show abbreviated (e.g., 120 -> "120")
  // For smaller values, show full number
  const displayValue = roundedValue >= 100 ? roundedValue : roundedValue;

  return (
    <div
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border-2 font-bold text-sm ${bgColor} ${textColor} ${borderColor} shadow-md`}
      title={`Snow depth: ${roundedValue} cm`}
    >
      {displayValue}
    </div>
  );
}

// Weather icon based on precipitation amount (not snow depth)
// This shows the current weather condition, not accumulated snow
function WeatherIcon({ precip, temp }: { precip: number; temp: number | null }) {
  // Determine if precipitation is likely snow (temp <= 2°C) or rain
  const isSnowLikely = temp === null || temp <= 2;
  
  if (precip >= 5) {
    // Heavy precipitation
    return <span className="text-xl">{isSnowLikely ? '🌨️' : '🌧️'}</span>;
  } else if (precip >= 2) {
    // Moderate precipitation
    return <span className="text-xl">{isSnowLikely ? '🌨️' : '🌧️'}</span>;
  } else if (precip >= 0.5) {
    // Light precipitation  
    return <span className="text-xl">{isSnowLikely ? '❄️' : '🌦️'}</span>;
  } else if (precip > 0) {
    // Trace precipitation
    return <span className="text-xl opacity-80">{isSnowLikely ? '🌥️' : '⛅'}</span>;
  } else {
    // No precipitation
    return <span className="text-xl opacity-50">☀️</span>;
  }
}

// Temperature color based on value
function getTemperatureColor(temp: number | null): string {
  if (temp === null) return 'bg-slate-700/50';
  if (temp < -15) return 'bg-violet-900';
  if (temp < -10) return 'bg-purple-800';
  if (temp < -5) return 'bg-blue-800';
  if (temp < 0) return 'bg-blue-600';
  if (temp < 5) return 'bg-cyan-600';
  if (temp < 10) return 'bg-teal-500';
  if (temp < 15) return 'bg-green-500';
  if (temp < 20) return 'bg-yellow-500';
  if (temp < 25) return 'bg-orange-500';
  return 'bg-red-500';
}

// Wind direction to compass direction
function windDirectionToCompass(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

// Wind arrow component
function WindArrow({ direction, speed }: { direction: number | null; speed: number | null }) {
  if (direction === null || speed === null) return <span className="text-slate-600">—</span>;
  
  const compass = windDirectionToCompass(direction);
  // Color based on wind speed (m/s)
  let color = 'text-green-400';
  if (speed > 15) color = 'text-red-400';
  else if (speed > 10) color = 'text-orange-400';
  else if (speed > 5) color = 'text-yellow-400';
  
  return (
    <div className={`flex flex-col items-center ${color}`}>
      <span 
        className="text-lg transform"
        style={{ transform: `rotate(${direction + 180}deg)` }}
      >
        ↓
      </span>
      <span className="text-xs font-mono">{Math.round(speed)}</span>
      <span className="text-xs opacity-70">{compass}</span>
    </div>
  );
}

// Freezing level color
function getFreezingLevelColor(level: number | null): string {
  if (level === null) return 'bg-slate-700/50';
  if (level === 0) return 'bg-blue-900';
  if (level < 500) return 'bg-blue-700';
  if (level < 1000) return 'bg-cyan-700';
  if (level < 1500) return 'bg-teal-600';
  if (level < 2000) return 'bg-green-600';
  return 'bg-green-500';
}

export function ForecastGrid({ data }: ForecastGridProps) {
  // Memoize the aggregation to ensure it recalculates when data changes
  const dayData = useMemo(() => {
    if (data.length === 0) return [];
    return aggregateDataByDayAndPeriod(data);
  }, [data]);

  const now = new Date();
  const periodKeys = ['night-early', 'AM', 'PM', 'night-late'];
  const periodLabels = ['night', 'AM', 'PM', 'night'];

  if (data.length === 0 || dayData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-slate-400">
        No data available. Select a location and date range to view precipitation data.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {/* Day headers */}
        <thead>
          <tr>
            <th className="sticky left-0 bg-slate-900 z-10 p-2 text-left text-slate-400 font-medium border-b border-slate-700">
              
            </th>
            {dayData.map((day) => (
              <th
                key={day.date.toISOString()}
                colSpan={4}
                className={`p-2 text-center font-semibold border-b border-slate-700 ${
                  isSameDay(day.date, now)
                    ? 'bg-cyan-900/30 text-cyan-300'
                    : 'text-white'
                }`}
              >
                <div className="text-xs text-slate-400 uppercase">
                  {format(day.date, 'EEE')}
                </div>
                <div>{format(day.date, 'MMM d')}</div>
              </th>
            ))}
          </tr>
          {/* Time period subheaders */}
          <tr>
            <th className="sticky left-0 bg-slate-900 z-10 p-2 text-left text-slate-500 text-xs border-b border-slate-700">
              Period
            </th>
            {dayData.map((day) =>
              periodLabels.map((label, idx) => (
                <th
                  key={`${day.date.toISOString()}-${idx}`}
                  className="p-1 text-center text-slate-500 text-xs border-b border-slate-700 border-l border-slate-800"
                >
                  {label}
                </th>
              ))
            )}
          </tr>
        </thead>

        <tbody>
          {/* Weather icons row */}
          <tr>
            <td className="sticky left-0 bg-slate-900 z-10 p-2 text-slate-400 font-medium border-b border-slate-800">
              <span className="text-xs">Weather</span>
            </td>
            {dayData.map((day) =>
              periodKeys.map((period, idx) => {
                const periodData = day.periods[period];
                const precip = periodData?.precipitation || 0;
                const temp = periodData?.temperature ?? null;
                return (
                  <td
                    key={`${day.date.toISOString()}-icon-${idx}`}
                    className="p-2 text-center border-b border-slate-800 border-l border-slate-800/50"
                  >
                    <WeatherIcon precip={precip} temp={temp} />
                  </td>
                );
              })
            )}
          </tr>

          {/* Snow badges row */}
          <tr className="bg-slate-800/30">
            <td className="sticky left-0 bg-slate-900 z-10 p-2 text-slate-400 font-medium border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-cyan-300">❄️</span>
                <span>Snow</span>
              </div>
              <div className="text-xs text-slate-500">cm badge</div>
            </td>
            {dayData.map((day) =>
              periodKeys.map((period, idx) => {
                const periodData = day.periods[period];
                const snow = periodData?.snowDepth; // Can be undefined
                return (
                  <td
                    key={`${day.date.toISOString()}-badge-${idx}`}
                    className="p-2 text-center border-b border-slate-800 border-l border-slate-800/50"
                  >
                    <SnowBadge cm={snow} />
                  </td>
                );
              })
            )}
          </tr>

          {/* Precipitation row */}
          <tr>
            <td className="sticky left-0 bg-slate-900 z-10 p-2 text-slate-400 font-medium border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-amber-400">💧</span>
                <span>Precip</span>
              </div>
              <div className="text-xs text-slate-500">mm</div>
            </td>
            {dayData.map((day) =>
              periodKeys.map((period, idx) => {
                const periodData = day.periods[period];
                const precip = periodData?.precipitation || 0;
                return (
                  <td
                    key={`${day.date.toISOString()}-precip-${idx}`}
                    className={`p-2 text-center border-b border-slate-800 border-l border-slate-800/50 ${getPrecipitationColor(
                      precip
                    )}`}
                  >
                    <span className="font-mono text-white">
                      {precip > 0 ? precip.toFixed(1) : '—'}
                    </span>
                  </td>
                );
              })
            )}
          </tr>

          {/* Snow depth row */}
          <tr>
            <td className="sticky left-0 bg-slate-900 z-10 p-2 text-slate-400 font-medium border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-cyan-300">❄️</span>
                <span>Snow</span>
              </div>
              <div className="text-xs text-slate-500">cm depth</div>
            </td>
            {dayData.map((day) =>
              periodKeys.map((period, idx) => {
                const periodData = day.periods[period];
                const snow = periodData?.snowDepth; // Can be undefined
                const hasData = snow !== undefined && snow !== null;
                return (
                  <td
                    key={`${day.date.toISOString()}-snow-${idx}`}
                    className={`p-2 text-center border-b border-slate-800 border-l border-slate-800/50 ${
                      hasData ? getSnowColor(snow) : 'bg-slate-800/30 opacity-50'
                    }`}
                  >
                    <span className="font-mono text-white">
                      {hasData && snow > 0 ? Math.round(snow) : '—'}
                    </span>
                  </td>
                );
              })
            )}
          </tr>

          {/* Temperature row */}
          <tr className="bg-slate-800/20">
            <td className="sticky left-0 bg-slate-900 z-10 p-2 text-slate-400 font-medium border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-orange-400">🌡️</span>
                <span>Temp</span>
              </div>
              <div className="text-xs text-slate-500">°C</div>
            </td>
            {dayData.map((day) =>
              periodKeys.map((period, idx) => {
                const periodData = day.periods[period];
                const temp = periodData?.temperature;
                return (
                  <td
                    key={`${day.date.toISOString()}-temp-${idx}`}
                    className={`p-2 text-center border-b border-slate-800 border-l border-slate-800/50 ${getTemperatureColor(temp ?? null)}`}
                  >
                    <span className="font-mono text-white font-semibold">
                      {temp !== null && temp !== undefined ? Math.round(temp) : '—'}
                    </span>
                    {periodData?.minTemp !== null && periodData?.maxTemp !== null && periodData?.minTemp !== periodData?.maxTemp && (
                      <div className="text-xs text-slate-300 opacity-70">
                        {Math.round(periodData.minTemp!)}–{Math.round(periodData.maxTemp!)}
                      </div>
                    )}
                  </td>
                );
              })
            )}
          </tr>

          {/* Freezing level row */}
          <tr>
            <td className="sticky left-0 bg-slate-900 z-10 p-2 text-slate-400 font-medium border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-blue-400">🧊</span>
                <span>Freeze</span>
              </div>
              <div className="text-xs text-slate-500">m altitude</div>
            </td>
            {dayData.map((day) =>
              periodKeys.map((period, idx) => {
                const periodData = day.periods[period];
                const freezeLevel = periodData?.freezingLevel;
                return (
                  <td
                    key={`${day.date.toISOString()}-freeze-${idx}`}
                    className={`p-2 text-center border-b border-slate-800 border-l border-slate-800/50 ${getFreezingLevelColor(freezeLevel ?? null)}`}
                  >
                    <span className="font-mono text-white">
                      {freezeLevel !== null && freezeLevel !== undefined 
                        ? (freezeLevel === 0 ? '0' : freezeLevel.toLocaleString()) 
                        : '—'}
                    </span>
                  </td>
                );
              })
            )}
          </tr>

          {/* Wind row */}
          <tr className="bg-slate-800/20">
            <td className="sticky left-0 bg-slate-900 z-10 p-2 text-slate-400 font-medium border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-teal-400">💨</span>
                <span>Wind</span>
              </div>
              <div className="text-xs text-slate-500">m/s</div>
            </td>
            {dayData.map((day) =>
              periodKeys.map((period, idx) => {
                const periodData = day.periods[period];
                return (
                  <td
                    key={`${day.date.toISOString()}-wind-${idx}`}
                    className="p-2 text-center border-b border-slate-800 border-l border-slate-800/50"
                  >
                    <WindArrow 
                      direction={periodData?.windDirection ?? null} 
                      speed={periodData?.windSpeed ?? null} 
                    />
                  </td>
                );
              })
            )}
          </tr>

          {/* Forecast indicator row */}
          <tr>
            <td className="sticky left-0 bg-slate-900 z-10 p-2 text-slate-500 text-xs border-b border-slate-800">
              Type
            </td>
            {dayData.map((day) =>
              periodKeys.map((period, idx) => {
                const periodData = day.periods[period];
                const isForecast = periodData?.isForecast;
                return (
                  <td
                    key={`${day.date.toISOString()}-type-${idx}`}
                    className="p-1 text-center text-xs border-b border-slate-800 border-l border-slate-800/50"
                  >
                    {periodData ? (
                      <span
                        className={
                          isForecast ? 'text-amber-400' : 'text-emerald-400'
                        }
                      >
                        {isForecast ? 'fcst' : 'obs'}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                );
              })
            )}
          </tr>
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-6 p-4 bg-slate-800/30 rounded-lg space-y-4">
        <h4 className="text-sm font-semibold text-slate-300">Legend</h4>
        
        {/* Snow badges */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="font-medium text-slate-300 w-20">Snow:</span>
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded border-2 bg-slate-600 border-slate-500 flex items-center justify-center text-slate-300 font-bold text-xs">0</div>
            <span>None</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded border-2 bg-sky-600 border-sky-400 flex items-center justify-center text-white font-bold text-xs">5</div>
            <span>Light</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded border-2 bg-cyan-500 border-cyan-300 flex items-center justify-center text-white font-bold text-xs">10</div>
            <span>Mod</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded border-2 bg-teal-400 border-teal-200 flex items-center justify-center text-teal-900 font-bold text-xs">20</div>
            <span>Heavy</span>
          </div>
        </div>

        {/* Temperature scale */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="font-medium text-slate-300 w-20">Temp:</span>
          <div className="flex items-center gap-1">
            <div className="w-6 h-4 rounded bg-violet-900"></div>
            <span>&lt;-15</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-4 rounded bg-blue-600"></div>
            <span>-5–0</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-4 rounded bg-cyan-600"></div>
            <span>0–5</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-4 rounded bg-green-500"></div>
            <span>10–15</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-4 rounded bg-orange-500"></div>
            <span>20–25</span>
          </div>
        </div>

        {/* Freezing level */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="font-medium text-slate-300 w-20">Freeze lvl:</span>
          <span>Altitude (meters) where temperature = 0°C</span>
        </div>

        {/* Wind */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="font-medium text-slate-300 w-20">Wind:</span>
          <span className="text-green-400">●</span><span>&lt;5 m/s</span>
          <span className="text-yellow-400">●</span><span>5–10 m/s</span>
          <span className="text-orange-400">●</span><span>10–15 m/s</span>
          <span className="text-red-400">●</span><span>&gt;15 m/s</span>
          <span className="ml-2">Arrow shows wind direction</span>
        </div>

        {/* Data type */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-medium">obs</span>
            <span>= Observed data</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-medium">fcst</span>
            <span>= Forecast data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
