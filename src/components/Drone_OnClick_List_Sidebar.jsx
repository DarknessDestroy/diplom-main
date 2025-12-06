import { useEffect } from 'react';

export function DroneModal({ drone, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!drone) return null;

  const getStatusColor = (status) => {
    switch(status) {
      case 'в полете': return 'text-green-400';
      case 'на земле': return 'text-gray-400';
      case 'возвращается': return 'text-orange-400';
      case 'пауза': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getBatteryColor = (battery) => {
    if (battery > 70) return 'text-green-400';
    if (battery > 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBatteryWidth = (battery) => {
    return `${Math.max(battery, 5)}%`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-gray-800 rounded-lg w-full max-w-md border border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Детальная информация</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            &times;
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{drone.name}</h3>
              <span className={`text-sm font-semibold ${getStatusColor(drone.status)}`}>
                {drone.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-gray-400 text-sm mb-1">Батарея</div>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-700 rounded-full h-2 mr-2">
                  <div 
                    className={`h-full rounded-full ${
                      drone.battery > 70 ? 'bg-green-500' : 
                      drone.battery > 30 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: getBatteryWidth(drone.battery) }}
                  />
                </div>
                <span className={`font-bold ${getBatteryColor(drone.battery)}`}>
                  {drone.battery}%
                </span>
              </div>
            </div>

            <div className="bg-gray-900 p-3 rounded">
              <div className="text-gray-400 text-sm mb-1">Скорость</div>
              <div className={`font-bold text-lg ${drone.speed === 0 ? 'text-gray-400' : 'text-white'}`}>
                {drone.speed} м/с
              </div>
              {drone.speed === 0 && drone.status === 'на земле' && (
                <div className="text-gray-500 text-xs mt-1">Дрон на земле</div>
              )}
            </div>

            <div className="bg-gray-900 p-3 rounded">
              <div className="text-gray-400 text-sm mb-1">Высота</div>
              <div className={`font-bold text-lg ${drone.altitude === 0 ? 'text-gray-400' : 'text-white'}`}>
                {drone.altitude} м
              </div>
              {drone.altitude === 0 && drone.status === 'на земле' && (
                <div className="text-gray-500 text-xs mt-1">Дрон на земле</div>
              )}
            </div>

            <div className="bg-gray-900 p-3 rounded">
              <div className="text-gray-400 text-sm mb-1">ID</div>
              <div className="text-white font-bold text-lg">{drone.id}</div>
            </div>
          </div>

          <div className="bg-gray-900 p-3 rounded mb-4">
            <h4 className="text-gray-400 text-sm mb-2">Координаты</h4>
            <div className="text-white">
              {drone.position ? (
                <>
                  <div>Широта: {drone.position.lat.toFixed(6)}°</div>
                  <div>Долгота: {drone.position.lng.toFixed(6)}°</div>
                </>
              ) : (
                <div className="text-gray-400">Не доступны</div>
              )}
            </div>
          </div>

          <div className="bg-gray-900 p-3 rounded">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-gray-400 text-sm">Маршрут</h4>
              <span className="text-blue-400 text-sm">
                {drone.path ? drone.path.length : 0} точек
              </span>
            </div>
            {drone.path && drone.path.length > 0 ? (
              <div className="text-white text-sm">
                <div>Начало: точка 1</div>
                <div>Конец: точка {drone.path.length}</div>
                <div className="text-gray-400 mt-1">
                  Расстояние: {drone.path.length * 100} м (примерно)
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">Маршрут не задан</div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-medium transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}