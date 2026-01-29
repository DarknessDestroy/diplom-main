import { useState, useCallback, useEffect, useRef } from 'react';
import { SearchBox } from './components/Search_Box';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/Welcome_Screen';
import { YandexMap } from './components/YandexMap';
import { DroneModal } from './components/Drone_OnClick_List_Sidebar';
import { DroneParking } from './components/Drone_Parking';
import { dronesData, initialMapCenter, flightStatus } from './constants/drones_data';
import {
  calculateDistance,
  calculateFlightTime,
  calculateOptimalSpeed,
  calculateBearing
} from './utils/flightCalculator';

function App() {
  const [hasStarted, setHasStarted] = useState(true);
  const [drones, setDrones] = useState(() =>
    dronesData.map(drone => ({
      ...drone,
      position: null,
      path: [],
      isVisible: false,
      battery: 100,
      status: 'на земле',
      flightStatus: flightStatus.IDLE,
      speed: 0,
      altitude: 0,
      heading: 0,
      totalDistance: 0,
      currentMission: null,
      flightProgress: 0,
      remainingBattery: 5,
      estimatedFlightTime: 0,
      currentWaypointIndex: 0,
      missionTimerId: null,
      missionStartTime: null,
      missionElapsedTime: 0,
      missionParameters: null,
      flightLog: []
    }))
  );

  const dronesRef = useRef(drones);
  useEffect(() => {
    dronesRef.current = drones;
  }, [drones]);

  const [mapCenter, setMapCenter] = useState(initialMapCenter);
  const [selectedDroneForModal, setSelectedDroneForModal] = useState(null);
  const [showDroneParking, setShowDroneParking] = useState(true);
  const [mapZoom, setMapZoom] = useState(13);
  const [globalMissionLog, setGlobalMissionLog] = useState([]);
  const activeTimersRef = useRef(new Map());

  // Состояния для режима размещения дрона
  const [placementMode, setPlacementMode] = useState(false);
  const [droneToPlace, setDroneToPlace] = useState(null);

  // Режим построения маршрута для выбранного дрона
  const [isRouteEditMode, setIsRouteEditMode] = useState(false);

  // Выбранный дрон для управления в сайдбаре
  const [selectedDroneForSidebar, setSelectedDroneForSidebar] = useState(null);

  const toggleDroneParking = () => setShowDroneParking(prev => !prev);

  // Начать размещение дрона (выбрать дрон для размещения)
  const startDronePlacement = (droneId) => {
    console.log('Начинаем размещение дрона:', droneId);
    setDroneToPlace(droneId);
    setPlacementMode(true);
  };

  // Разместить дрон на карте по клику
  const placeDroneOnMap = (latlng) => {
    if (!droneToPlace || !placementMode) return;

    console.log('Размещение дрона на координатах:', latlng);

    const drone = drones.find(d => d.id === droneToPlace);
    if (!drone) return;

    const positionToSet = {
      lat: latlng.lat,
      lng: latlng.lng
    };

    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneToPlace) return d;
        return {
          ...d,
          position: positionToSet,
          isVisible: true,
          battery: 100,
          status: 'на земле',
          flightStatus: flightStatus.IDLE,
          speed: 0,
          altitude: 0,
          path: [],
          missionParameters: null,
          flightProgress: 0,
          currentWaypointIndex: 0,
          flightLog: []
        };
      })
    );

    // Выбираем этого дрона для управления в сайдбаре
    setSelectedDroneForSidebar(droneToPlace);
    setMapCenter([positionToSet.lat, positionToSet.lng]);

    // Сбрасываем режим размещения
    setPlacementMode(false);
    setDroneToPlace(null);

    console.log(`✅ Дрон "${drone.name}" размещен на координатах:`, positionToSet);

    // Добавляем в лог - исправляем формат coordinates
    addToGlobalLog(droneToPlace, `🛸 Дрон "${drone.name}" размещен на карте`, {
      coordinates: `lat: ${positionToSet.lat.toFixed(6)}, lng: ${positionToSet.lng.toFixed(6)}`
    });
  };

  // Отменить размещение дрона
  const cancelDronePlacement = () => {
    setPlacementMode(false);
    setDroneToPlace(null);
  };

  // Убрать дрон с карты
  const removeDroneFromMap = (droneId) => {
    // Останавливаем полет дрона если он активен
    if (drones.find(d => d.id === droneId)?.flightStatus === flightStatus.FLYING) {
      stopDroneFlight(droneId);
    }

    // Очищаем таймер если есть
    const timerId = activeTimersRef.current.get(droneId);
    if (timerId) {
      clearInterval(timerId);
      activeTimersRef.current.delete(droneId);
    }

    const drone = drones.find(d => d.id === droneId);

    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;
        return {
          ...d,
          isVisible: false,
          path: [],
          flightStatus: flightStatus.IDLE,
          isFlying: false,
          missionParameters: null,
          missionTimerId: null,
          missionStartTime: null,
          missionElapsedTime: 0,
          flightLog: []
        };
      })
    );

    // Если это был выбранный дрон, снимаем выбор и выходим из режима построения маршрута
    if (selectedDroneForSidebar === droneId) {
      setSelectedDroneForSidebar(null);
      setIsRouteEditMode(false);
    }

    // Логируем удаление
    if (drone) {
      addToGlobalLog(droneId, `🗑️ Дрон "${drone.name}" убран с карты`);
    }
  };

  // Обработка клика по карте
  const handleMapClick = (latlng) => {
    console.log('Карта кликнута:', latlng);

    // Если в режиме размещения дрона
    if (placementMode && droneToPlace) {
      placeDroneOnMap(latlng);
      return;
    }

    // Если есть выбранный дрон в сайдбаре, он не в полете
    // и включен режим построения маршрута
    if (selectedDroneForSidebar !== null && isRouteEditMode) {
      const drone = drones.find(d => d.id === selectedDroneForSidebar);
      if (drone && !drone.isFlying) {
        addRoutePoint(selectedDroneForSidebar, latlng);
      }
    }
  };

  // Добавление точки маршрута
  const addRoutePoint = (droneId, latlng) => {
    setDrones(prev =>
      prev.map(d =>
        d.id === droneId ? {
          ...d,
          path: [...d.path, [latlng.lat, latlng.lng]]
        } : d
      )
    );

    // Пересчитываем параметры миссии
    setTimeout(() => {
      const missionParams = calculateMissionParameters(droneId);
      if (missionParams) {
        setDrones(prev =>
          prev.map(d => {
            if (d.id !== droneId) return d;
            return {
              ...d,
              missionParameters: missionParams
            };
          })
        );

        // Логируем добавление точки - исправляем формат
        addToDroneLog(droneId, '📍 Добавлена точка маршрута', {
          pointNumber: drones.find(d => d.id === droneId)?.path?.length || 0,
          coordinates: `lat: ${latlng.lat.toFixed(6)}, lng: ${latlng.lng.toFixed(6)}`
        });
      }
    }, 0);
  };

  const undoLastPoint = (droneId) => {
    if (!droneId) droneId = selectedDroneForSidebar;
    if (!droneId) return;

    const drone = drones.find(d => d.id === droneId);
    if (!drone || !drone.path || drone.path.length === 0) return;

    setDrones(prev =>
      prev.map(d =>
        d.id === droneId ? { ...d, path: d.path.slice(0, -1) } : d
      )
    );

    // Логируем отмену
    addToDroneLog(droneId, '↩️ Отменена последняя точка маршрута');
  };

  const clearRoute = (droneId) => {
    if (!droneId) droneId = selectedDroneForSidebar;
    if (!droneId) return;

    const drone = drones.find(d => d.id === droneId);
    if (!drone || !drone.path || drone.path.length === 0) return;

    setDrones(prev =>
      prev.map(d =>
        d.id === droneId ? {
          ...d,
          path: [],
          missionParameters: null
        } : d
      )
    );

    // Логируем очистку
    addToDroneLog(droneId, '🗑️ Маршрут очищен');
  };

  const calculateMissionParameters = (droneId) => {
    const drone = drones.find(d => d.id === droneId);
    if (!drone || !drone.path || drone.path.length < 2) return null;

    let totalDistance = 0;
    const distances = [];

    for (let i = 0; i < drone.path.length - 1; i++) {
      const [lat1, lng1] = drone.path[i];
      const [lat2, lng2] = drone.path[i + 1];
      const distance = calculateDistance(lat1, lng1, lat2, lng2);
      totalDistance += distance;
      distances.push(distance);
    }

    const optimalSpeed = calculateOptimalSpeed(totalDistance, drone.maxSpeed / 3.6);
    const flightTime = calculateFlightTime(totalDistance, optimalSpeed);
    const batteryConsumption = Math.min(totalDistance / 100, drone.battery - 10);

    const missionParams = {
      totalDistance: Math.round(totalDistance),
      optimalSpeed: Math.round(optimalSpeed * 3.6),
      estimatedTime: Math.round(flightTime),
      batteryConsumption: Math.round(batteryConsumption),
      waypoints: drone.path.length,
      distances,
      segmentTimes: distances.map(distance =>
        Math.max(1000, (distance / optimalSpeed) * 1000)
      ),
      totalTime: 0
    };

    missionParams.totalTime = missionParams.segmentTimes.reduce((sum, time) => sum + time, 0);
    return missionParams;
  };

  const addToDroneLog = (droneId, message, data = {}) => {
    const drone = drones.find(d => d.id === droneId);
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      message,
      data
    };

    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;
        return {
          ...d,
          flightLog: [logEntry, ...d.flightLog].slice(0, 20)
        };
      })
    );

    // Преобразуем объект data в строки для безопасного рендеринга
    const safeData = {};
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'object' && data[key] !== null) {
        safeData[key] = JSON.stringify(data[key]);
      } else {
        safeData[key] = data[key];
      }
    });

    addToGlobalLog(droneId, message, safeData);
  };

  const addToGlobalLog = (droneId, message, data = {}) => {
    const drone = drones.find(d => d.id === droneId);

    // Преобразуем объект data в строки для безопасного рендеринга
    const safeData = {};
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'object' && data[key] !== null) {
        safeData[key] = JSON.stringify(data[key]);
      } else {
        safeData[key] = data[key];
      }
    });

    const globalLogEntry = {
      id: Date.now(),
      droneId,
      droneName: drone?.name || 'Неизвестный дрон',
      timestamp: new Date().toISOString(),
      message,
      data: safeData
    };

    setGlobalMissionLog(prev => [globalLogEntry, ...prev].slice(0, 100));
  };

  const startDroneFlight = useCallback((droneId) => {
    const drone = drones.find(d => d.id === droneId);
    if (!drone || !drone.path || drone.path.length < 2) {
      alert('Для запуска полета нужно проложить маршрут минимум из 2 точек');
      return;
    }

    if (drone.flightStatus === flightStatus.FLYING || drone.flightStatus === flightStatus.TAKEOFF || drone.flightStatus === flightStatus.LANDING) {
      alert('Дрон уже в процессе полета');
      return;
    }

    const missionParams = calculateMissionParameters(droneId);
    if (!missionParams) return;

    if (drone.battery < missionParams.batteryConsumption + 10) {
      alert(`Недостаточно заряда батареи. Требуется минимум ${missionParams.batteryConsumption + 10}%, доступно: ${drone.battery}%`);
      return;
    }

    // Выключаем режим построения маршрута при старте полета
    if (selectedDroneForSidebar === droneId && isRouteEditMode) {
      setIsRouteEditMode(false);
    }

    // Устанавливаем статус взлета
    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;
        return {
          ...d,
          flightStatus: flightStatus.TAKEOFF,
          isFlying: true,
          currentMission: {
            startTime: new Date().toISOString(),
            totalWaypoints: d.path.length,
            totalDistance: missionParams.totalDistance,
            estimatedTime: missionParams.estimatedTime,
            missionParams
          },
          currentWaypointIndex: 0,
          flightProgress: 0,
          speed: missionParams.optimalSpeed / 3.6,
          altitude: 50,
          heading: 0,
          missionParameters: missionParams,
          missionStartTime: Date.now(),
          missionElapsedTime: 0
        };
      })
    );

    addToDroneLog(droneId, '🚀 Старт миссии', {
      waypoints: drone.path.length,
      totalDistance: missionParams.totalDistance,
      estimatedTime: missionParams.estimatedTime
    });

    // Имитация взлета
    setTimeout(() => {
      setDrones(prev =>
        prev.map(d => {
          if (d.id !== droneId) return d;
          return {
            ...d,
            flightStatus: flightStatus.FLYING,
            altitude: 100
          };
        })
      );

      addToDroneLog(droneId, '🛫 Взлет выполнен', { altitude: 100 });
      startFlightMovement(droneId);
    }, 2000);
  }, [drones, selectedDroneForSidebar, isRouteEditMode]);

  const startFlightMovement = (droneId) => {
    const drone = dronesRef.current.find(d => d.id === droneId);
    if (!drone || !drone.missionParameters) return;

    const missionParams = drone.missionParameters;
    let startTime;

    if (drone.missionElapsedTime > 0) {
      startTime = Date.now() - drone.missionElapsedTime;
    } else {
      startTime = Date.now();
    }

    const existingTimer = activeTimersRef.current.get(droneId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const timerId = setInterval(() => {
      const currentDrone = dronesRef.current.find(d => d.id === droneId);
      if (!currentDrone || currentDrone.flightStatus !== flightStatus.FLYING) {
        clearInterval(timerId);
        activeTimersRef.current.delete(droneId);
        return;
      }

      const elapsedTime = Date.now() - startTime;

      if (elapsedTime >= missionParams.totalTime) {
        completeDroneFlight(droneId);
        return;
      }

      let accumulatedTime = 0;
      let currentSegment = 0;

      for (let i = 0; i < missionParams.segmentTimes.length; i++) {
        if (elapsedTime <= accumulatedTime + missionParams.segmentTimes[i]) {
          currentSegment = i;
          break;
        }
        accumulatedTime += missionParams.segmentTimes[i];
      }

      const segmentProgress = (elapsedTime - accumulatedTime) / missionParams.segmentTimes[currentSegment];
      const clampedProgress = Math.min(1, Math.max(0, segmentProgress));

      if (currentSegment === missionParams.segmentTimes.length - 1 && clampedProgress >= 0.99) {
        completeDroneFlight(droneId);
        return;
      }

      const startPoint = currentDrone.path[currentSegment];
      const endPoint = currentDrone.path[currentSegment + 1];

      const currentLat = startPoint[0] + (endPoint[0] - startPoint[0]) * clampedProgress;
      const currentLng = startPoint[1] + (endPoint[1] - startPoint[1]) * clampedProgress;

      setDrones(prev =>
        prev.map(d => {
          if (d.id !== droneId) return d;

          const totalProgress = ((currentSegment + clampedProgress) / (d.path.length - 1)) * 100;
          const batteryDrain = (missionParams.batteryConsumption * elapsedTime) / missionParams.totalTime;
          const remainingBattery = Math.max(0, 100 - batteryDrain);

          if (remainingBattery <= 1) {
            addToDroneLog(droneId, '🔋 Критически низкий заряд батареи! Аварийная посадка');
            completeDroneFlight(droneId);
            return d;
          }

          return {
            ...d,
            position: { lat: currentLat, lng: currentLng },
            currentWaypointIndex: currentSegment,
            flightProgress: totalProgress,
            battery: Math.round(remainingBattery),
            heading: calculateBearing(startPoint[0], startPoint[1], endPoint[0], endPoint[1]),
            missionElapsedTime: elapsedTime
          };
        })
      );

    }, 100);

    activeTimersRef.current.set(droneId, timerId);

    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;
        return {
          ...d,
          missionTimerId: timerId
        };
      })
    );
  };

  const completeDroneFlight = (droneId) => {
    const timerId = activeTimersRef.current.get(droneId);
    if (timerId) {
      clearInterval(timerId);
      activeTimersRef.current.delete(droneId);
    }

    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;
        return {
          ...d,
          flightStatus: flightStatus.LANDING,
          speed: 5,
          altitude: 50
        };
      })
    );

    addToDroneLog(droneId, '🛬 Начинается посадка');

    setTimeout(() => {
      setDrones(prev =>
        prev.map(d => {
          if (d.id !== droneId) return d;
          return {
            ...d,
            flightStatus: flightStatus.COMPLETED,
            isFlying: false,
            status: 'на земле',
            speed: 0,
            altitude: 0,
            currentWaypointIndex: 0,
            flightProgress: 100,
            missionTimerId: null,
            missionStartTime: null,
            missionElapsedTime: 0,
            currentMission: {
              ...d.currentMission,
              endTime: new Date().toISOString(),
              completed: true
            }
          };
        })
      );

      addToDroneLog(droneId, '✅ Миссия завершена успешно');
    }, 3000);
  };

  const stopDroneFlight = (droneId) => {
    const timerId = activeTimersRef.current.get(droneId);
    if (timerId) {
      clearInterval(timerId);
      activeTimersRef.current.delete(droneId);
    }

    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;
        return {
          ...d,
          flightStatus: flightStatus.IDLE,
          isFlying: false,
          status: 'на земле',
          speed: 0,
          altitude: 0,
          missionTimerId: null,
          missionStartTime: null,
          missionElapsedTime: 0,
          flightProgress: 0,
          currentWaypointIndex: 0
        };
      })
    );

    addToDroneLog(droneId, '⏹️ Полёт принудительно остановлен');
  };

  const pauseDroneFlight = (droneId) => {
    const timerId = activeTimersRef.current.get(droneId);
    if (timerId) {
      clearInterval(timerId);
      activeTimersRef.current.delete(droneId);
    }

    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;
        return {
          ...d,
          flightStatus: flightStatus.PAUSED,
          missionTimerId: null
        };
      })
    );

    addToDroneLog(droneId, '⏸️ Полёт приостановлен');
  };

  const resumeDroneFlight = (droneId) => {
    const drone = drones.find(d => d.id === droneId);
    if (drone && drone.flightStatus === flightStatus.PAUSED) {
      setDrones(prev =>
        prev.map(d => {
          if (d.id !== droneId) return d;
          return {
            ...d,
            flightStatus: flightStatus.FLYING
          };
        })
      );

      startFlightMovement(droneId);
      addToDroneLog(droneId, '▶️ Полёт возобновлён');
    }
  };

  const getActiveFlights = () => {
    return drones.filter(d => d.flightStatus === flightStatus.FLYING || d.flightStatus === flightStatus.TAKEOFF);
  };

  const stopAllFlights = () => {
    drones.forEach(drone => {
      if (drone.isFlying) {
        stopDroneFlight(drone.id);
      }
    });
  };

  useEffect(() => {
    return () => {
      activeTimersRef.current.forEach(timerId => {
        clearInterval(timerId);
      });
      activeTimersRef.current.clear();
    };
  }, []);

  const handleStart = () => {
    setHasStarted(true);
    console.log('Приложение запущено, карта отображается');
  };

  const handleDroneClick = (drone) => {
    console.log('Дрон кликнут:', drone);
    setSelectedDroneForModal(drone);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-800 text-white px-3 py-3">

      <div className="flex flex-1 gap-3 min-h-0">
        {/* Левая панель - Стоянка для дронов */}
        <div className="flex-shrink-0">
          <DroneParking
            drones={drones}
            showParking={showDroneParking}
            onToggleParking={toggleDroneParking}
            onPlaceDrone={startDronePlacement}
            onRemoveDrone={removeDroneFromMap}
          />
        </div>

        {/* Основной контент */}
        <main className="flex-1 bg-gray-700 p-3 rounded flex flex-col min-w-0 min-h-0">
          {!hasStarted ? (
            <div className="flex-1 flex items-center justify-center">
              <WelcomeScreen onStart={handleStart} />
            </div>
          ) : (
            <div className="w-full flex flex-col gap-2 flex-1 min-h-0">
              {/* Индикатор режима размещения */}
              {placementMode && droneToPlace && (
                <div className="bg-yellow-900/70 border border-yellow-500 rounded-lg p-3 mb-2 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm text-yellow-200">
                          Кликните на карте, чтобы разместить дрон
                          {drones.find(d => d.id === droneToPlace) && ` "${drones.find(d => d.id === droneToPlace).name}"`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={cancelDronePlacement}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}

              {/* Поиск и геолокация */}
              <div className="flex flex-col md:flex-row gap-2 mb-2 z-[1000]">
                <div className="flex-1">
                  <SearchBox
                    setMapCenter={setMapCenter}
                    setMapZoom={setMapZoom}
                  />
                </div>
              </div>

              {/* Карта */}
              <div className="flex-1 relative min-h-0">
                <YandexMap
                  drones={drones.filter(d => d.isVisible)}
                  mapCenter={mapCenter}
                  mapZoom={mapZoom}
                  onMapClick={handleMapClick}
                  selectedDroneId={selectedDroneForSidebar}
                  forceResize={showDroneParking}
                />
              </div>
            </div>
          )}
        </main>

        {hasStarted && (
          <div className="flex-shrink-0">
            <Sidebar
              dronesData={drones}
              selectedDroneId={selectedDroneForSidebar}
              onSelectDrone={setSelectedDroneForSidebar}
              missionLog={globalMissionLog}
              activeFlights={getActiveFlights()}
              onStartFlight={startDroneFlight}
              onPauseFlight={pauseDroneFlight}
              onResumeFlight={resumeDroneFlight}
              onStopFlight={stopDroneFlight}
              onStopAllFlights={stopAllFlights}
              onAddRoutePoint={addRoutePoint}
              onUndoLastPoint={undoLastPoint}
              onClearRoute={clearRoute}
              onClearLogs={() => setGlobalMissionLog([])}
              onDroneClick={handleDroneClick}
              isRouteEditMode={isRouteEditMode}
              onToggleRouteMode={() => setIsRouteEditMode(prev => !prev)}
            />
          </div>
        )}
      </div>

      {/* Модальное окно с деталями дрона */}
      {selectedDroneForModal && (
        <DroneModal
          drone={selectedDroneForModal}
          onClose={() => setSelectedDroneForModal(null)}
        />
      )}

      <footer className="mt-2 bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded text-center text-white">
        <div className="md:flex-row justify-between items-center">
          <div>
            © 2026 Система управления дронами.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;