import { useState, useCallback, useEffect } from 'react';
import { subDays, addDays } from 'date-fns';
import { MapView } from './components/Map/MapView';
import { SearchBar } from './components/SearchBar/SearchBar';
import { DateRangePicker } from './components/DateRangePicker/DateRangePicker';
import { TimeSeriesChart } from './components/Charts/TimeSeriesChart';
import { HeatmapChart } from './components/Charts/HeatmapChart';
import { useWeatherData } from './hooks/useWeatherData';
import type { Coordinates, DateRange } from './types/weather';

type ViewMode = 'timeseries' | 'heatmap';

function App() {
  const [selectedCoords, setSelectedCoords] = useState<Coordinates | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 7),
    end: addDays(new Date(), 9),
  });
  const [viewMode, setViewMode] = useState<ViewMode>('timeseries');

  const { data, stations, selectedStation, loading, error, fetchData } = useWeatherData();

  const handleLocationSelect = useCallback((coords: Coordinates, name?: string) => {
    setSelectedCoords(coords);
    if (name) {
      setLocationName(name);
    } else {
      setLocationName(`${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`);
    }
  }, []);

  // Auto-fetch when location or date range changes
  useEffect(() => {
    if (selectedCoords) {
      fetchData(selectedCoords, dateRange);
    }
  }, [selectedCoords, dateRange, fetchData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background pattern */}
      <div 
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)`,
        }}
      />

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Snow Precipitation Tracker
          </h1>
          <p className="text-slate-400">
            Track snow accumulation and precipitation using yr.no weather data
          </p>
        </header>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Left column: Map and location */}
          <div className="space-y-4">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-4">
              <h2 className="text-lg font-semibold text-white mb-4">
                Select Location
              </h2>
              <SearchBar
                onLocationSelect={(coords, name) => handleLocationSelect(coords, name)}
              />
            </div>
            
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 h-[400px]">
              <MapView
                selectedCoords={selectedCoords}
                onLocationSelect={(coords) => handleLocationSelect(coords)}
                stations={stations}
              />
            </div>

            {selectedStation && (
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 animate-fade-in">
                <h3 className="text-sm font-medium text-slate-400 mb-2">
                  Weather Station
                </h3>
                <p className="text-white font-medium">{selectedStation.name}</p>
                <p className="text-sm text-slate-400">{selectedStation.id}</p>
              </div>
            )}
          </div>

          {/* Right column: Date range and controls */}
          <div className="space-y-4">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-4">
              <h2 className="text-lg font-semibold text-white mb-4">
                Date Range
              </h2>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>

            {locationName && (
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 animate-fade-in">
                <h3 className="text-sm font-medium text-slate-400 mb-2">
                  Selected Location
                </h3>
                <p className="text-white font-medium">{locationName}</p>
                {selectedCoords && (
                  <p className="text-sm text-slate-400">
                    {selectedCoords.lat.toFixed(4)}°N, {selectedCoords.lon.toFixed(4)}°E
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className={`rounded-2xl p-4 animate-fade-in ${
                error.includes('unavailable') || error.includes('Showing forecast')
                  ? 'bg-amber-900/30 border border-amber-800'
                  : 'bg-red-900/30 border border-red-800'
              }`}>
                <h3 className={`text-sm font-medium mb-1 ${
                  error.includes('unavailable') || error.includes('Showing forecast')
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}>
                  {error.includes('unavailable') || error.includes('Showing forecast') ? 'Notice' : 'Error'}
                </h3>
                <p className={`text-sm ${
                  error.includes('unavailable') || error.includes('Showing forecast')
                    ? 'text-amber-300'
                    : 'text-red-300'
                }`}>{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Charts section */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
          {/* View mode toggle */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              Precipitation Data
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('timeseries')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'timeseries'
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700'
                }`}
              >
                Time Series
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'heatmap'
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700'
                }`}
              >
                Heatmap
              </button>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="h-80 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-400">Loading weather data...</p>
            </div>
          )}

          {/* Charts */}
          {!loading && (
            <div className="animate-fade-in">
              {viewMode === 'timeseries' ? (
                <TimeSeriesChart data={data} />
              ) : (
                <HeatmapChart data={data} />
              )}
            </div>
          )}
        </div>

        {/* Footer with attribution */}
        <footer className="mt-8 text-center text-sm text-slate-500">
          <p>
            Weather data provided by{' '}
            <a
              href="https://www.met.no/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              MET Norway
            </a>
            {' '}via the{' '}
            <a
              href="https://frost.met.no/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Frost API
            </a>
            {' '}and{' '}
            <a
              href="https://api.met.no/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Locationforecast API
            </a>
          </p>
          <p className="mt-2">
            Map data © OpenStreetMap contributors
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
