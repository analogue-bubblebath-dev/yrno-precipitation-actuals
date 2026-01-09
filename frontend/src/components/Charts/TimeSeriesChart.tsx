import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import type { PrecipitationData } from '../../types/weather';

interface TimeSeriesChartProps {
  data: PrecipitationData[];
}

export function TimeSeriesChart({ data }: TimeSeriesChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-slate-400">
        No data available. Select a location and date range to view precipitation data.
      </div>
    );
  }

  const now = new Date();

  // Transform data for the chart
  const chartData = data.map((d) => ({
    time: d.time,
    timestamp: new Date(d.time).getTime(),
    precipitation: d.precipitation,
    snowDepth: d.snowDepth || 0,
    isForcast: d.isForcast,
  }));

  // Find the transition point between historical and forecast
  const transitionTime = now.getTime();

  const formatXAxis = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM d');
  };

  const formatTooltipLabel = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM d, yyyy HH:mm');
  };

  interface TooltipPayloadItem {
    value: number;
    name: string;
    color: string;
    dataKey: string;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: number;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload || !label) return null;

    const dataPoint = chartData.find((d) => d.timestamp === label);

    return (
      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-white font-medium mb-2">
          {formatTooltipLabel(label)}
          {dataPoint?.isForcast && (
            <span className="ml-2 text-xs text-amber-400">(Forecast)</span>
          )}
        </p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toFixed(1)}{' '}
            {entry.dataKey === 'snowDepth' ? 'cm' : 'mm'}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="h-80 min-h-[320px]">
      <ResponsiveContainer width="100%" height={320} minWidth={300}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="snowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatXAxis}
            stroke="#94a3b8"
            fontSize={12}
          />
          
          <YAxis
            yAxisId="left"
            stroke="#06b6d4"
            fontSize={12}
            label={{
              value: 'Snow Depth (cm)',
              angle: -90,
              position: 'insideLeft',
              fill: '#06b6d4',
              fontSize: 12,
            }}
          />
          
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#f59e0b"
            fontSize={12}
            label={{
              value: 'Precipitation (mm)',
              angle: 90,
              position: 'insideRight',
              fill: '#f59e0b',
              fontSize: 12,
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => <span className="text-slate-300">{value}</span>}
          />
          
          {/* Reference line for "now" */}
          <ReferenceLine
            x={transitionTime}
            yAxisId="left"
            stroke="#f59e0b"
            strokeDasharray="5 5"
            label={{
              value: 'Now',
              position: 'top',
              fill: '#f59e0b',
              fontSize: 11,
            }}
          />
          
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="snowDepth"
            stroke="#06b6d4"
            fill="url(#snowGradient)"
            name="Snow Depth"
            strokeWidth={2}
          />
          
          <Bar
            yAxisId="right"
            dataKey="precipitation"
            fill="#f59e0b"
            name="Hourly Precipitation"
            opacity={0.7}
            barSize={4}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

