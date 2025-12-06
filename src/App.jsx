import { useState } from 'react';
import { MapButton } from './components/MapButton';
import { SearchBox } from './components/SearchBox';
import { RouteControls } from './components/RouteControls';
import { DroneMap } from './components/DroneMap';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { dronesData, initialMapCenter } from './constants';
import 'leaflet/dist/leaflet.css';

function App() {
  const [showMap, setShowMap] = useState(false);
  const [drones, setDrones] = useState(() => 
    dronesData.map(drone => ({
      ...drone,
      position: { 
        lat: initialMapCenter[0] + (drone.id * 0.001), 
        lng: initialMapCenter[1] + (drone.id * 0.001) 
      },
      path: [],
      basePosition: { 
        lat: initialMapCenter[0] + (drone.id * 0.001), 
        lng: initialMapCenter[1] + (drone.id * 0.001) 
      }
    }))
  );
  
  const [mapCenter, setMapCenter] = useState(initialMapCenter);

  const toggleMap = () => setShowMap(prev => !prev);

  // Добавление точек маршрута
  const addRoutePoint = (latlng) => {
    // Строим маршрут для первого дрона
    setDrones(prev =>
      prev.map((d, index) => 
        index === 0 ? { ...d, path: [...d.path, [latlng.lat, latlng.lng]] } : d
      )
    );
  };

  const undoLastPoint = () => {
    setDrones(prev =>
      prev.map((d, index) => 
        index === 0 ? { ...d, path: d.path.slice(0, -1) } : d
      )
    );
  };

  const clearRoute = () => {
    setDrones(prev =>
      prev.map((d, index) => 
        index === 0 ? { ...d, path: [] } : d
      )
    );
  };

  // Обработчик изменения позиции дрона
  const handleDronePositionChange = (droneId, newPosition) => {
    console.log(`Дрон ${droneId} перемещен на:`, newPosition);
    
    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;
        
        return {
          ...d,
          position: newPosition
        };
      })
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-800 text-white px-3 py-3">
      <header className="mb-2 flex justify-center items-center bg-red-500 p-3 rounded">
        <h1 className="text-xl font-bold">Система управления дронами</h1>
      </header>

      <div className="flex flex-1 flex-col md:flex-row gap-3">
        <main className="flex-1 bg-gray-700 p-3 rounded flex flex-col">
          {!showMap ? (
            <div className="flex-1 flex items-center justify-center">
              <WelcomeScreen onStart={() => setShowMap(true)} />
            </div>
          ) : (
            <div className="w-full flex flex-col gap-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-2">
                <MapButton showMap={showMap} toggleMap={toggleMap} />
                <SearchBox setMapCenter={setMapCenter} />
              </div>
              
              <RouteControls 
                undoLastPoint={undoLastPoint} 
                clearRoute={clearRoute} 
              />
              
              <DroneMap 
                drones={drones} 
                mapCenter={mapCenter} 
                addRoutePoint={addRoutePoint}
                onDronePositionChange={handleDronePositionChange}
              />
            </div>
          )}
        </main>

        {showMap && (
          <div className="relative z-[1000]">
            <Sidebar dronesData={drones} />
          </div>
        )}
      </div>

      <footer className="mt-2 bg-blue-800 p-3 rounded text-center text-white">
        <div className="md:flex-row justify-between items-center">
          <div>
            © 2025 Система управления дронами.
          </div>
          <div className="flex items-center space-x-4 mt-2 md:mt-0">
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;