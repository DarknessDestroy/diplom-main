import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { DroneMarker } from './Drone_Marker';

function AddMarkerOnClick({ addPoint, placementMode }) {
  useMapEvents({
    click(e) {
      if (addPoint) {
        addPoint(e.latlng);

        if (placementMode) {
          console.log('Дрон размещен по координатам:', e.latlng);
        }
      }
    },
  });
  return null;
}

function MapCenterUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);

  return null;
}

export function DroneMap({
  drones,
  mapCenter,
  addRoutePoint,
  onDronePositionChange,
  placementMode = false
}) {
  return (
    <div className="w-full h-[800px] bg-gray-900 rounded overflow-hidden relative">
      <MapContainer
        center={mapCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <MapCenterUpdater center={mapCenter} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AddMarkerOnClick
          addPoint={addRoutePoint}
          placementMode={placementMode}
        />

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

        {drones.map(drone => (
          drone.position && (
            <DroneMarker
              key={`drone-${drone.id}-${drone.position.lat}-${drone.position.lng}`}
              drone={drone}
              onPositionChange={onDronePositionChange}
            />
          )
        ))}
      </MapContainer>

      <div className="absolute bottom-4 left-4 z-[1000] bg-gray-800 bg-opacity-90 text-white p-3 rounded-lg border border-gray-700 text-xs">
        <p className="font-bold mb-1">Инструкция:</p>
        <div className="space-y-1">
          {placementMode ? (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="font-medium">Кликните на карте - разместить дрон</span>
            </div>
          ) : (
            <>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span>Кликните на карте - добавить точку маршрута</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span>Перетащите дрона - измените его позицию</span>
              </div>
            </>
          )}
        </div>
      </div>

      {placementMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-yellow-600 text-white p-3 rounded-lg border border-yellow-700">
          <p className="font-bold">Режим размещения дрона</p>
          <p className="text-sm">Выберите место на карте для размещения дрона</p>
        </div>
      )}
    </div>
  );
}