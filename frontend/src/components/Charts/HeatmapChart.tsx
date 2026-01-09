import { useMemo } from 'react';
import { format, parseISO, getHours, getDay } from 'date-fns';
import type { PrecipitationData } from '../../types/weather';

interface HeatmapChartProps {
  data: PrecipitationData[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function HeatmapChart({ data }: HeatmapChartProps) {
  const heatmapData = useMemo(() => {
    // Create a 7x24 matrix (days x hours)
    const matrix: number[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => 0)
    );
    const counts: number[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => 0)
    );

    // Aggregate precipitation by day of week and hour
    for (const point of data) {
      const date = parseISO(point.time);
      const day = getDay(date);
      const hour = getHours(date);
      
      matrix[day][hour] += point.precipitation;
      counts[day][hour] += 1;
    }

    // Calculate averages
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (counts[d][h] > 0) {
          matrix[d][h] = matrix[d][h] / counts[d][h];
        }
      }
    }

    return matrix;
  }, [data]);

  const maxValue = useMemo(() => {
    let max = 0;
    for (const row of heatmapData) {
      for (const val of row) {
        max = Math.max(max, val);
      }
    }
    return max || 1;
  }, [heatmapData]);

  const getColor = (value: number): string => {
    if (value === 0) return 'rgb(30, 41, 59)'; // slate-800
    
    const intensity = value / maxValue;
    
    // Color scale: slate -> cyan -> white
    if (intensity < 0.5) {
      // Low intensity: slate to cyan
      const t = intensity * 2;
      const r = Math.round(30 + (6 - 30) * t);
      const g = Math.round(41 + (182 - 41) * t);
      const b = Math.round(59 + (212 - 59) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // High intensity: cyan to white
      const t = (intensity - 0.5) * 2;
      const r = Math.round(6 + (255 - 6) * t);
      const g = Math.round(182 + (255 - 182) * t);
      const b = Math.round(212 + (255 - 212) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-slate-400">
        No data available. Select a location and date range to view the heatmap.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex mb-1">
            <div className="w-12" /> {/* Spacer for day labels */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-center text-xs text-slate-500"
              >
                {hour % 3 === 0 ? `${hour}h` : ''}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {DAYS.map((day, dayIndex) => (
            <div key={day} className="flex items-center mb-1">
              <div className="w-12 text-sm text-slate-400 font-medium">
                {day}
              </div>
              <div className="flex-1 flex gap-0.5">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 h-8 rounded-sm transition-all hover:ring-2 hover:ring-white/30 cursor-pointer group relative"
                    style={{ backgroundColor: getColor(heatmapData[dayIndex][hour]) }}
                    title={`${day} ${hour}:00 - ${heatmapData[dayIndex][hour].toFixed(2)} mm avg`}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {heatmapData[dayIndex][hour].toFixed(2)} mm
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4">
        <span className="text-sm text-slate-400">Less</span>
        <div className="flex gap-0.5">
          {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
            <div
              key={intensity}
              className="w-8 h-4 rounded-sm"
              style={{ backgroundColor: getColor(intensity * maxValue) }}
            />
          ))}
        </div>
        <span className="text-sm text-slate-400">More</span>
        <span className="text-sm text-slate-500 ml-4">
          (max: {maxValue.toFixed(2)} mm/h average)
        </span>
      </div>
    </div>
  );
}

