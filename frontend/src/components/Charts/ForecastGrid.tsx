import { format, parseISO, startOfDay, isSameDay } from 'date-fns';
import type { PrecipitationData } from '../../types/weather';

interface ForecastGridProps {
  data: PrecipitationData[];
}

interface DayData {
  date: Date;
  periods: {
    [key: string]: {
      precipitation: number;
      snowDepth: number;
      count: number;
      isForecast: boolean;
    };
  };
}

function getTimePeriod(hour: number): string {
  if (hour >= 0 && hour < 6) return 'night-early';
  if (hour >= 6 && hour < 12) return 'AM';
  if (hour >= 12 && hour < 18) return 'PM';
  return 'night-late';
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
        snowDepth: 0,
        count: 0,
        isForecast: point.isForcast,
      };
    }

    dayData.periods[period].precipitation += point.precipitation;
    dayData.periods[period].snowDepth = Math.max(
      dayData.periods[period].snowDepth,
      point.snowDepth || 0
    );
    dayData.periods[period].count += 1;
    dayData.periods[period].isForecast = dayData.periods[period].isForecast || point.isForcast;
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

export function ForecastGrid({ data }: ForecastGridProps) {
  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-slate-400">
        No data available. Select a location and date range to view precipitation data.
      </div>
    );
  }

  const dayData = aggregateDataByDayAndPeriod(data);
  const now = new Date();
  const periodKeys = ['night-early', 'AM', 'PM', 'night-late'];
  const periodLabels = ['night', 'AM', 'PM', 'night'];

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
                <div>{format(day.date, 'd')}</div>
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
              <div className="text-xs text-slate-500">cm</div>
            </td>
            {dayData.map((day) =>
              periodKeys.map((period, idx) => {
                const periodData = day.periods[period];
                const snow = periodData?.snowDepth || 0;
                return (
                  <td
                    key={`${day.date.toISOString()}-snow-${idx}`}
                    className={`p-2 text-center border-b border-slate-800 border-l border-slate-800/50 ${getSnowColor(
                      snow
                    )}`}
                  >
                    <span className="font-mono text-white">
                      {snow > 0 ? Math.round(snow) : '—'}
                    </span>
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
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">obs</span>
          <span>= Observed data</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-amber-400">fcst</span>
          <span>= Forecast data</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-cyan-500/80 rounded"></div>
          <span>= Higher precipitation</span>
        </div>
      </div>
    </div>
  );
}
