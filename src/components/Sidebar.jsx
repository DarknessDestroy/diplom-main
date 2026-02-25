import React, { useState, useEffect, useMemo } from 'react';
import { flightStatus } from '../constants/drones_data';
import { calculateDistance, calculateOptimalSpeed, calculateFlightTime } from '../utils/flightCalculator';

export const Sidebar = ({
  dronesData = [],
  selectedDroneId,
  onSelectDrone,
  missionLog = [],
  activeFlights = [],
  onStartFlight,
  onPauseFlight,
  onResumeFlight,
  onStopFlight,
  onStopAllFlights,
  onAddRoutePoint,
  onUndoLastPoint,
  onClearRoute,
  onClearLogs,
  onDroneClick,
  isRouteEditMode = false,
  onToggleRouteMode
}) => {
  const [activeTab, setActiveTab] = useState('control');

  const visibleDrones = dronesData.filter(d => d.isVisible);
  const selectedDrone =
    visibleDrones.find(d => d.id === selectedDroneId) || visibleDrones[0] || null;

  const flyingDrones = visibleDrones.filter(d => d.isFlying);

  const getProgressColor = (progress) => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusColor = (drone) => {
    switch (drone.flightStatus) {
      case flightStatus.FLYING: return 'border-green-500 bg-green-900/20';
      case flightStatus.PAUSED: return 'border-yellow-500 bg-yellow-900/20';
      case flightStatus.TAKEOFF:
      case flightStatus.LANDING: return 'border-blue-500 bg-blue-900/20';
      case flightStatus.COMPLETED: return 'border-green-700 bg-green-900/20';
      default: return 'border-gray-500 bg-gray-900/20';
    }
  };

  const formatTimeSeconds = (seconds) => {
    const sec = Math.floor(Number(seconds) || 0);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const estimatedTimeSec = useMemo(() => {
    if (!selectedDrone?.path || selectedDrone.path.length < 2) return null;
    let totalDistance = 0;
    for (let i = 0; i < selectedDrone.path.length - 1; i++) {
      const [lat1, lng1] = selectedDrone.path[i];
      const [lat2, lng2] = selectedDrone.path[i + 1];
      totalDistance += calculateDistance(lat1, lng1, lat2, lng2);
    }
    const maxSpeed = selectedDrone.maxSpeed != null ? selectedDrone.maxSpeed : 70;
    const speed = calculateOptimalSpeed(totalDistance, maxSpeed / 3.6);
    return Math.round(calculateFlightTime(totalDistance, speed));
  }, [selectedDrone?.path, selectedDrone?.maxSpeed]);

  const getStatusText = (drone) => {
    switch (drone.flightStatus) {
      case flightStatus.FLYING: return 'В полете';
      case flightStatus.PAUSED: return 'На паузе';
      case flightStatus.TAKEOFF: return 'Взлетает';
      case flightStatus.LANDING: return 'Садится';
      case flightStatus.COMPLETED: return 'Миссия завершена';
      case flightStatus.IDLE: return 'На земле';
      default: return drone.flightStatus;
    }
  };
  const selectedDronePathLength = selectedDrone?.path?.length || 0;
  const selectedDroneStatus = selectedDrone?.flightStatus || flightStatus.IDLE;

  useEffect(() => {
    if (!selectedDroneId && visibleDrones.length > 0 && onSelectDrone) {
      onSelectDrone(visibleDrones[0].id);
    }
  }, [selectedDroneId, visibleDrones, onSelectDrone]);

  return (
    <div className="w-80 bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
      <div className="bg-gradient-to-r from-blue-700 to-purple-700 p-4">
        <h2 className="text-xl font-bold text-white">Панель управления</h2>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <div className="bg-green-500 rounded-full w-2 h-2 animate-pulse"></div>
            <span className="text-sm">
              Активных полетов: {flyingDrones.length}
            </span>
          </div>
          {flyingDrones.length > 0 && (
            <button
              onClick={onStopAllFlights}
              className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors"
              title="Остановить все полеты"
            >
              Стоп все
            </button>
          )}
        </div>
      </div>
      <div className="flex border-b border-gray-700">
        <button
          className={`flex-1 py-3 text-center font-medium transition-colors ${activeTab === 'control'
            ? 'bg-gray-700 text-blue-400'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          onClick={() => setActiveTab('control')}
        >
          Управление
        </button>
        <button
          className={`flex-1 py-3 text-center font-medium transition-colors ${activeTab === 'logs'
            ? 'bg-gray-700 text-blue-400'
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          onClick={() => setActiveTab('logs')}
        >
          Логи
          {missionLog.length > 0 && (
            <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {missionLog.length}
            </span>
          )}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'control' && (
          <div className="space-y-4">
            {visibleDrones.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">🛸</div>
                <p className="text-base">Нет дронов на карте</p>
                <p className="text-sm mt-1">
                  Разместите дрон со стоянки, чтобы управлять им из панели.
                </p>
              </div>
            )}
            {visibleDrones.length > 0 && (
              <div className="space-y-2">
                {visibleDrones.map(drone => (
                <div
                  key={drone.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200
                    ${selectedDroneId === drone.id 
                      ? 'ring-2 ring-blue-400 bg-blue-900/30' 
                      : 'bg-gray-900/50 hover:bg-gray-800/50'
                    }`}
                  onClick={() => onSelectDrone(drone.id)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedDroneId === drone.id 
                          ? 'bg-blue-400' 
                          : drone.isFlying 
                            ? 'bg-green-400 animate-pulse' 
                            : 'bg-gray-500'
                      }`}></div>
                      <div>
                        <h4 className="font-bold text-white">{drone.name}</h4>
                        <p className="text-xs text-gray-300">{getStatusText(drone)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${drone.battery < 30 ? 'text-red-400' : 'text-green-400'}`}>
                        {drone.battery}%
                      </div>
                      <div className="text-xs text-gray-400">Батарея</div>
                    </div>
                  </div>
                  {drone.isFlying && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-300 mb-1">
                        <span>Прогресс:</span>
                        <span>{Math.round(drone.flightProgress || 0)}%</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(drone.flightProgress)} transition-all duration-300 ease-out`}
                          style={{ width: `${drone.flightProgress || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                ))}
              </div>
            )}
            {selectedDrone && (
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-white mb-3">
                  Управление: {selectedDrone.name}
                </h3>
                <div className={`p-3 rounded-lg border ${getStatusColor(selectedDrone)} mb-4`}>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-400">Статус:</div>
                    <div className="font-medium text-white">{getStatusText(selectedDrone)}</div>

                    <div className="text-gray-400">Точек маршрута:</div>
                    <div className="font-medium text-white">{selectedDronePathLength}</div>

                    <div className="text-gray-400">Общая дистанция:</div>
                    <div className="font-medium text-white">
                      {selectedDrone.missionParameters?.totalDistance || 0} м
                    </div>

                    <div className="text-gray-400">Оцен. время:</div>
                    <div className="font-medium text-white">
                      {formatTimeSeconds(estimatedTimeSec ?? selectedDrone.missionParameters?.estimatedTime)}
                      <span className="text-gray-500 text-xs font-normal ml-1">(мин:сек)</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-white">Маршрутизация</h4>

                  {!selectedDrone.isFlying && (
                    <>
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={onToggleRouteMode}
                          className={`flex-1 py-2 rounded transition-colors ${isRouteEditMode
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                        >
                          {isRouteEditMode ? 'Закончить' : 'Построить маршрут'}
                        </button>
                        <button
                          onClick={() => onDroneClick(selectedDrone)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                          title="Подробности"
                        >
                          ℹ️
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => onUndoLastPoint(selectedDrone.id)}
                          disabled={!selectedDrone.path?.length}
                          className={`flex-1 py-2 rounded transition-colors ${selectedDrone.path?.length
                            ? 'bg-yellow-600 hover:bg-yellow-700'
                            : 'bg-gray-700 cursor-not-allowed opacity-50'
                            }`}
                        >
                          Отменить последнюю
                        </button>
                        <button
                          onClick={() => onClearRoute(selectedDrone.id)}
                          disabled={!selectedDrone.path?.length}
                          className={`flex-1 py-2 rounded transition-colors ${selectedDrone.path?.length
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-gray-700 cursor-not-allowed opacity-50'
                            }`}
                        >
                          Очистить маршрут
                        </button>
                      </div>

                      {isRouteEditMode && (
                        <div className="bg-blue-900/30 p-3 rounded text-sm mt-2">
                          <p className="text-blue-300">Режим добавления точек маршрута</p>
                          <p className="text-gray-400 text-xs mt-1">
                            Кликните по карте, чтобы добавить точку маршрута для {selectedDrone.name}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  <div className="mt-4">
                    <h4 className="font-semibold text-white mb-2">Управление полетом</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedDroneStatus === flightStatus.IDLE && selectedDronePathLength >= 2 && (
                        <button
                          onClick={() => onStartFlight(selectedDrone.id)}
                          className="col-span-2 bg-green-600 hover:bg-green-700 py-2 rounded flex items-center justify-center gap-2"
                        >
                          🚀 Запустить дрона
                        </button>
                      )}
                      {selectedDroneStatus === flightStatus.FLYING && (
                        <>
                          <button
                            onClick={() => onPauseFlight(selectedDrone.id)}
                            className="bg-yellow-600 hover:bg-yellow-700 py-2 rounded flex items-center justify-center gap-2"
                          >⏸️ Пауза</button>
                          <button
                            onClick={() => onStopFlight(selectedDrone.id)}
                            className="bg-red-600 hover:bg-red-700 py-2 rounded flex items-center justify-center gap-2"
                          >⏹️ Стоп</button>
                        </>
                      )}
                      {selectedDroneStatus === flightStatus.PAUSED && (
                        <>
                          <button
                            onClick={() => onResumeFlight(selectedDrone.id)}
                            className="bg-green-600 hover:bg-green-700 py-2 rounded flex items-center justify-center gap-2"
                          >▶️ Продолжить</button>
                          <button
                            onClick={() => onStopFlight(selectedDrone.id)}
                            className="bg-red-600 hover:bg-red-700 py-2 rounded flex items-center justify-center gap-2"
                          >⏹️ Стоп</button>
                        </>
                      )}
                      {(selectedDroneStatus === flightStatus.TAKEOFF || selectedDroneStatus === flightStatus.LANDING) && (
                        <button
                          disabled
                          className="col-span-2 bg-gray-600 py-2 rounded cursor-not-allowed opacity-50 flex items-center justify-center gap-2"
                        >
                          ⏳ {selectedDroneStatus === flightStatus.TAKEOFF ? 'Взлетает...' : 'Садится...'}
                        </button>
                      )}
                      {selectedDroneStatus === flightStatus.COMPLETED && (
                        <>
                          <div className="col-span-2 text-center text-sm text-green-300">✅ Миссия завершена</div>
                          {selectedDronePathLength >= 2 && (
                            <button
                              onClick={() => onStartFlight(selectedDrone.id)}
                              className="col-span-2 bg-green-600 hover:bg-green-700 py-2 rounded flex items-center justify-center gap-2"
                            >
                              🔄 Перезапустить миссию
                            </button>
                          )}
                        </>
                      )}
                      {selectedDroneStatus === flightStatus.IDLE && selectedDronePathLength < 2 && (
                        <div className="col-span-2 bg-yellow-900/50 border border-yellow-700 rounded p-2 text-center text-yellow-200 text-sm">
                          Для запуска полета добавьте минимум 2 точки маршрута
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!selectedDrone && dronesData.length > 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🛸</div>
                <p>Выберите дрон для управления</p>
                <p className="text-sm mt-1">Нажмите на любой дрон из списка выше</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Журнал событий</h3>
              {missionLog.length > 0 && (
                <button
                  onClick={onClearLogs}
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors"
                >
                  Очистить
                </button>
              )}
            </div>

            {missionLog.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>Журнал событий пуст</p>
                <p className="text-sm mt-1">Запустите полеты для отслеживания событий</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {missionLog.map((log, index) => (
                  <div
                    key={`${log.id}-${index}`}
                    className="bg-gray-900/50 rounded-lg p-3 border-l-4 border-blue-500 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{log.message.match(/^[^\s]+\s/)?.[0] || '📋'}</span>
                        <span className="font-medium text-white">{log.droneName}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-1">{log.message.replace(/^[^\s]+\s/, '')}</p>
                    {log.data && Object.keys(log.data).length > 0 && (
                      <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
                        {Object.entries(log.data).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span>{key}:</span>
                            <span className="text-gray-300">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="p-3 bg-gray-900 border-t border-gray-700">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-gray-800/50 rounded">
            <div className="text-lg font-bold text-white">{visibleDrones.length}</div>
            <div className="text-xs text-gray-400">На карте</div>
          </div>
          <div className="p-2 bg-gray-800/50 rounded">
            <div className="text-lg font-bold text-green-400">{flyingDrones.length}</div>
            <div className="text-xs text-gray-400">В полете</div>
          </div>
          <div className="p-2 bg-gray-800/50 rounded">
            <div className="text-lg font-bold text-white">{missionLog.length}</div>
            <div className="text-xs text-gray-400">Событий</div>
          </div>
        </div>
      </div>
    </div>
  );
};
