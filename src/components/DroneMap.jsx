import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { DroneMarker } from './DroneMarker';

// Фикс для стандартных иконок Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Иконка базы
const createBaseIcon = () => {
  return L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/619/619032.png',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
    className: 'base-icon'
  });
};

// CSS стили для иконок
const droneIconStyles = `
  .drone-icon {
    cursor: pointer;
    transition: transform 0.3s ease;
  }
  
  .drone-icon:hover {
    transform: scale(1.1);
  }
  
  .base-icon {
    filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.5));
  }
`;

// Компонент для добавления точек маршрута
function AddMarkerOnClick({ addPoint }) {
  useMapEvents({
    click(e) {
      if (addPoint) {
        addPoint(e.latlng);
      }
    },
  });
  return null;
}

// Компонент для отображения базы
function BaseMarker({ position, name }) {
  return (
    <Marker position={position} icon={createBaseIcon()}>
      <Popup>
        <div className="text-black">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <strong>База {name}</strong>
          </div>
          <p className="text-sm text-gray-600 mt-1">Стартовая точка</p>
          <p className="text-xs text-gray-500 mt-1">
            Координаты: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

// Импортируем Marker и Popup из react-leaflet
import { Marker, Popup } from 'react-leaflet';

export function DroneMap({ 
  drones, 
  mapCenter, 
  addRoutePoint
}) {
  // Добавляем стили для иконок
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = droneIconStyles;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="w-full h-[800px] bg-gray-900 rounded overflow-hidden relative">
      <MapContainer
        center={mapCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Добавление точек маршрута */}
        <AddMarkerOnClick addPoint={addRoutePoint} />
        
        {/* Маршруты дронов */}
        {drones.map(drone => (
          drone.path && drone.path.length > 0 && (
            <Polyline
              key={`route-${drone.id}`}
              positions={drone.path}
              color="#3b82f6"
              weight={3}
              opacity={0.7}
            />
          )
        ))}
        
        {/* Дроны */}
        {drones.map(drone => (
          <DroneMarker
            key={drone.id}
            drone={drone}
          />
        ))}
        
        
      </MapContainer>
      
      {/* Инструкция */}
      <div className="absolute bottom-4 left-4 z-[500] bg-gray-800 bg-opacity-90 text-white p-3 rounded-lg border border-gray-700 text-xs">
        <p className="font-bold mb-1">Инструкция:</p>
        <div className="space-y-1">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span>Кликните на карте - добавить точку маршрута</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span>Наведите на дрона - увидите информацию</span>
          </div>
        </div>
      </div>
    </div>
  );
}