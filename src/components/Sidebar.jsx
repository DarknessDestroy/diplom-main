import { useState } from 'react';
import { DroneCard } from './Drone_card';
import { DroneModal } from './DroneModal';

// Функция для правильного склонения слова "дрон"
const getDroneWord = (count) => {
  if (count % 10 === 1 && count % 100 !== 11) {
    return 'дрон';
  } else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
    return 'дрона';
  } else {
    return 'дронов';
  }
};

// Функция для правильного склонения слова "активен"
const getActiveWord = (count) => {
  if (count % 10 === 1 && count % 100 !== 11) {
    return 'активен';
  } else {
    return 'активно';
  }
};

export function Sidebar({ dronesData }) {
  const [selectedDrone, setSelectedDrone] = useState(null);

  const handleDroneClick = (drone) => {
    setSelectedDrone(drone);
  };

  const handleCloseModal = () => {
    setSelectedDrone(null);
  };

  // Подсчитываем активные дроны (те, что в полете)
  const activeDronesCount = dronesData.filter(drone => drone.status === 'в полете').length;
  const totalDronesCount = dronesData.length;

  return (
    <>
      <aside className="w-full md:w-[350px] bg-gray-800 rounded flex flex-col border border-gray-700">
        {/* Фиксированный заголовок */}
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-center text-white">Информация о дронах</h2>
          <div className="text-sm text-gray-400 text-center mt-1 space-y-1">
            <p>
              Всего: <span className="text-white font-medium">{totalDronesCount}</span> {getDroneWord(totalDronesCount)}
            </p>
            <p className={`font-medium ${
              activeDronesCount > 0 ? 'text-green-400' : 'text-gray-400'
            }`}>
              {activeDronesCount > 0 ? (
                <>
                  <span className="text-white">{activeDronesCount}</span> {getDroneWord(activeDronesCount)} {getActiveWord(activeDronesCount)}
                </>
              ) : (
                'Нет активных дронов'
              )}
            </p>
          </div>
        </div>
        
        {/* Прокручиваемая область с карточками дронов */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          {dronesData.map(drone => (
            <div key={drone.id} className="bg-gray-900 rounded-lg p-3 border border-gray-700 hover:border-blue-500 transition-colors">
              {/* Карточка дрона */}
              <DroneCard
                drone={drone}
                onClick={handleDroneClick}
              />
              
              {/* Информация о маршруте */}
              <div className="mt-2 flex justify-between items-center text-xs">
                <span className="text-gray-400">
                  Маршрут: <span className="text-blue-400">{drone.path?.length || 0}</span> точек
                </span>
                <span className="text-gray-500">
                  ID: {drone.id}
                </span>
              </div>
              
              {/* Координаты */}
              <div className="mt-1 text-xs text-gray-500">
                Координаты: {drone.position.lat.toFixed(5)}, {drone.position.lng.toFixed(5)}
              </div>
            </div>
          ))}
        </div>
        
        {/* Фиксированный футер с легендой */}
        <div className="p-4 border-t border-gray-700 bg-gray-850">
          <div className="text-xs text-gray-400">
            <p className="mb-2 font-medium">Легенда статусов:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>В полете</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                <span>На земле</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span>Батарея {'>'} 70%</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span>Батарея 30-70%</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              Кликните на карточку для детальной информации
            </div>
          </div>
        </div>
      </aside>

      {/* Модальное окно с детальной информацией */}
      {selectedDrone && (
        <DroneModal
          drone={selectedDrone}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}