import { useState } from 'react';
import { format, subDays, addDays } from 'date-fns';
import type { DateRange } from '../../types/weather';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

type PresetKey = 'last7days' | 'last30days' | 'lastSeason' | 'custom';

interface Preset {
  label: string;
  getRange: () => DateRange;
}

const presets: Record<PresetKey, Preset> = {
  last7days: {
    label: 'Last 7 days',
    getRange: () => ({
      start: subDays(new Date(), 7),
      end: addDays(new Date(), 9), // Include forecast
    }),
  },
  last30days: {
    label: 'Last 30 days',
    getRange: () => ({
      start: subDays(new Date(), 30),
      end: addDays(new Date(), 9),
    }),
  },
  lastSeason: {
    label: 'This winter',
    getRange: () => {
      const now = new Date();
      const year = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
      return {
        start: new Date(year, 9, 1), // October 1st
        end: addDays(new Date(), 9),
      };
    },
  },
  custom: {
    label: 'Custom range',
    getRange: () => ({
      start: subDays(new Date(), 7),
      end: addDays(new Date(), 9),
    }),
  },
};

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [activePreset, setActivePreset] = useState<PresetKey>('last7days');
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetClick = (key: PresetKey) => {
    setActivePreset(key);
    if (key === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onChange(presets[key].getRange());
    }
  };

  const handleDateChange = (field: 'start' | 'end', dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;

    onChange({
      ...value,
      [field]: date,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(presets) as PresetKey[]).map((key) => (
          <button
            key={key}
            onClick={() => handlePresetClick(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activePreset === key
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700'
            }`}
          >
            {presets[key].label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-center gap-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">From:</label>
            <input
              type="date"
              value={format(value.start, 'yyyy-MM-dd')}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">To:</label>
            <input
              type="date"
              value={format(value.end, 'yyyy-MM-dd')}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
      )}

      <div className="text-sm text-slate-400">
        Showing data from{' '}
        <span className="text-cyan-400 font-medium">
          {format(value.start, 'MMM d, yyyy')}
        </span>
        {' '}to{' '}
        <span className="text-cyan-400 font-medium">
          {format(value.end, 'MMM d, yyyy')}
        </span>
      </div>
    </div>
  );
}

