import { useState } from 'react';
import { SearchBox } from './components/Search_Box';
import { RouteControls } from './components/Route_Buttons';
import { DroneMap } from './components/Map';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/Welcome_Screen';
import { LocationButton } from './components/Location_Button';
import { dronesData, initialMapCenter } from './constants/drones_data';
import 'leaflet/dist/leaflet.css';

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [drones, setDrones] = useState(() =>
    dronesData.map(drone => ({
      ...drone,
      position: null,
      path: [],
      isVisible: false
    }))
  );

  const [mapCenter, setMapCenter] = useState(initialMapCenter);
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [showDroneControls, setShowDroneControls] = useState(true);

  const toggleDroneControls = () => setShowDroneControls(prev => !prev);

  const addRoutePoint = (latlng) => {
    const visibleDrones = drones.filter(d => d.isVisible);
    if (visibleDrones.length > 0) {
      setDrones(prev =>
        prev.map(d =>
          d.id === visibleDrones[0].id ? { ...d, path: [...d.path, [latlng.lat, latlng.lng]] } : d
        )
      );
    }
  };

  const undoLastPoint = () => {
    const visibleDrones = drones.filter(d => d.isVisible);
    if (visibleDrones.length > 0) {
      setDrones(prev =>
        prev.map(d =>
          d.id === visibleDrones[0].id ? { ...d, path: d.path.slice(0, -1) } : d
        )
      );
    }
  };

  const clearRoute = () => {
    const visibleDrones = drones.filter(d => d.isVisible);
    if (visibleDrones.length > 0) {
      setDrones(prev =>
        prev.map(d =>
          d.id === visibleDrones[0].id ? { ...d, path: [] } : d
        )
      );
    }
  };

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

  const addDroneToMap = (droneId, position = null) => {
    const positionToSet = position || { lat: mapCenter[0], lng: mapCenter[1] };

    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;

        return {
          ...d,
          position: positionToSet,
          isVisible: true,
          battery: 100,
          status: 'на земле',
          speed: 0,
          altitude: 0
        };
      })
    );

    setSelectedDrone(null);
    console.log(`Дрон ${droneId} добавлен на карту со статусом "на земле"`);
  };

  const removeDroneFromMap = (droneId) => {
    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;

        return {
          ...d,
          isVisible: false,
          path: []
        };
      })
    );
  };

  const selectDroneForPlacement = (droneId) => {
    setSelectedDrone(droneId);
  };

  const handleMapClickForPlacement = (latlng) => {
    if (selectedDrone !== null) {
      addDroneToMap(selectedDrone, latlng);
    }
  };

  const handleStart = () => {
    setHasStarted(true);
    console.log('Приложение запущено, карта отображается');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-800 text-white px-3 py-3">
      <header className="mb-2 flex justify-center items-center bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded">
        <h1 className="text-xl font-bold">Система управления дронами</h1>
      </header>

      <div className="flex flex-1 flex-col md:flex-row gap-3">
        <main className="flex-1 bg-gray-700 p-3 rounded flex flex-col">
          {!hasStarted ? (
            <div className="flex-1 flex items-center justify-center">
              <WelcomeScreen onStart={handleStart} />
            </div>
          ) : (
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold">Панель управления дронами</h3>
                <button
                  onClick={toggleDroneControls}
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-600 px-3 py-1 rounded text-sm"
                  title={showDroneControls ? "Скрыть панель управления" : "Показать панель управления"}
                >
                  {showDroneControls ? (
                    <>
                      <span>Скрыть</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </>
                  ) : (
                    <>
                      <span>Показать</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              {showDroneControls && (
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 mb-2">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {drones.map(drone => (
                      <div key={drone.id} className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded">
                        <span>{drone.name}</span>
                        {drone.isVisible ? (
                          <button
                            onClick={() => removeDroneFromMap(drone.id)}
                            className="bg-red-500 hover:bg-red-600 px-2 py-1 rounded text-xs"
                            title={`Убрать ${drone.name} с карты`}
                          >
                            Убрать
                          </button>
                        ) : (
                          <button
                            onClick={() => selectDroneForPlacement(drone.id)}
                            className="bg-green-500 hover:bg-green-600 px-2 py-1 rounded text-xs"
                            title={`Разместить ${drone.name} на карте`}
                          >
                            Разместить
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedDrone !== null && (
                    <div className="bg-yellow-900 p-2 rounded text-sm">
                      <p className="font-medium">Режим размещения: выберите место на карте для дрона</p>
                      <button
                        onClick={() => setSelectedDrone(null)}
                        className="mt-1 bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs"
                      >
                        Отмена
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-gray-800 p-2 rounded text-sm mb-2">
                <div className="flex justify-between">
                  <span>Всего дронов: {drones.length}</span>
                  <span className={`font-medium ${drones.filter(d => d.isVisible).length > 0 ? 'text-green-400' : 'text-gray-400'
                    }`}>
                    На карте: {drones.filter(d => d.isVisible).length}
                  </span>
                </div>
              </div>

              <RouteControls
                undoLastPoint={undoLastPoint}
                clearRoute={clearRoute}
                disabled={drones.filter(d => d.isVisible).length === 0}
              />

              <div className="flex flex-col md:flex-row gap-2 mb-2 z-[1000]">
                <div className="flex-1">
                  <SearchBox setMapCenter={setMapCenter} />
                </div>
                <div>
                  <LocationButton
                    setMapCenter={setMapCenter}
                    mapCenter={mapCenter}
                  />
                </div>
              </div>

              <DroneMap
                drones={drones.filter(d => d.isVisible)}
                mapCenter={mapCenter}
                addRoutePoint={selectedDrone ? handleMapClickForPlacement : addRoutePoint}
                onDronePositionChange={handleDronePositionChange}
                placementMode={selectedDrone !== null}
              />
            </div>
          )}
        </main>

        {hasStarted && (
          <div className="relative z-[1000]">
            <Sidebar dronesData={drones.filter(d => d.isVisible)} />
          </div>
        )}
      </div>

      <footer className="mt-2 bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded text-center text-white">
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