import { useState, useCallback, useRef, useEffect } from 'react';
import { searchPlaces } from '../../services/api';
import type { Coordinates, SearchResult } from '../../types/weather';

interface SearchBarProps {
  onLocationSelect: (coords: Coordinates, displayName: string) => void;
}

export function SearchBar({ onLocationSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await searchPlaces(searchQuery);
      setResults(searchResults);
      setShowDropdown(true);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleSelect = (result: SearchResult) => {
    const coords: Coordinates = {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
    };
    onLocationSelect(coords, result.display_name);
    setQuery(result.display_name.split(',')[0]);
    setShowDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder="Search for a location..."
          className="w-full px-4 py-3 pl-11 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
        />
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-[1000] w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-fade-in">
          {results.map((result) => (
            <button
              key={result.place_id}
              onClick={() => handleSelect(result)}
              className="w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0"
            >
              <div className="text-white font-medium">
                {result.display_name.split(',')[0]}
              </div>
              <div className="text-sm text-slate-400 truncate">
                {result.display_name}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

