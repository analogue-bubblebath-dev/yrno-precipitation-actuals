import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Coordinates, WeatherStation } from '../../types/weather';
import 'leaflet/dist/leaflet.css';

// Custom styles for station markers to ensure they're visible above selected location
const stationMarkerStyle = document.createElement('style');
stationMarkerStyle.textContent = `
  .station-marker {
    z-index: 1000 !important;
  }
`;
document.head.appendChild(stationMarkerStyle);

// Fix for default marker icons in Leaflet with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const stationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="12" fill="#3b82f6" stroke="#1e40af" stroke-width="3"/>
      <circle cx="16" cy="16" r="5" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
  className: 'station-marker',
});

interface MapViewProps {
  selectedCoords: Coordinates | null;
  onLocationSelect: (coords: Coordinates, name?: string) => void;
  stations?: WeatherStation[];
}

function LocationMarker({ 
  position, 
  onLocationSelect 
}: { 
  position: Coordinates | null; 
  onLocationSelect: (coords: Coordinates) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationSelect({
        lat: e.latlng.lat,
        lon: e.latlng.lng,
      });
    },
  });

  if (!position) return null;

  return (
    <Marker position={[position.lat, position.lon]}>
      <Popup>
        <span className="font-medium">Selected Location</span>
        <br />
        <span className="text-sm text-gray-600">
          {position.lat.toFixed(4)}, {position.lon.toFixed(4)}
        </span>
      </Popup>
    </Marker>
  );
}

function MapController({ center }: { center: Coordinates | null }) {
  const map = useMap();
  const prevCenter = useRef<Coordinates | null>(null);

  useEffect(() => {
    if (center && center !== prevCenter.current) {
      map.flyTo([center.lat, center.lon], 10, { duration: 1 });
      prevCenter.current = center;
    }
  }, [center, map]);

  return null;
}

export function MapView({ selectedCoords, onLocationSelect, stations = [] }: MapViewProps) {
  const [mapReady, setMapReady] = useState(false);

  // Default center: Norway (where yr.no data is best)
  const defaultCenter: [number, number] = [62.0, 10.0];
  const initialZoom = 5;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={defaultCenter}
        zoom={initialZoom}
        className="h-full w-full"
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {mapReady && (
          <>
            <MapController center={selectedCoords} />
            <LocationMarker 
              position={selectedCoords} 
              onLocationSelect={onLocationSelect}
            />
            
            {stations
              .filter((station) => station.geometry?.coordinates)
              .map((station) => (
              <Marker
                key={station.id}
                position={[
                  station.geometry.coordinates[1],
                  station.geometry.coordinates[0],
                ]}
                icon={stationIcon}
                zIndexOffset={1000}
                eventHandlers={{
                  click: () => {
                    onLocationSelect(
                      {
                        lat: station.geometry.coordinates[1],
                        lon: station.geometry.coordinates[0],
                      },
                      station.name
                    );
                  },
                }}
              >
                <Popup>
                  <span className="font-medium">{station.name}</span>
                  <br />
                  <span className="text-sm text-gray-600">
                    Weather Station: {station.id}
                  </span>
                </Popup>
              </Marker>
            ))}
          </>
        )}
      </MapContainer>
      
      {!selectedCoords && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm pointer-events-none">
          Click on the map to select a location
        </div>
      )}
    </div>
  );
}

