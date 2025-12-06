import { useState } from 'react';
import { DroneCard } from './Drone_Sidebar_List';
import { DroneModal } from './Drone_OnClick_List_Sidebar';

const getDroneWord = (count) => {
  if (count % 10 === 1 && count % 100 !== 11) {
    return 'дрон';
  } else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
    return 'дрона';
  } else {
    return 'дронов';
  }
};
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

  const activeDronesCount = dronesData.filter(drone => drone.status === 'в полете').length;
  const totalDronesCount = dronesData.length;

  return (
    <>
      <aside className="w-full md:w-[350px] bg-gray-800 rounded flex flex-col border border-gray-700">

        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-center text-white">Информация о дронах</h2>
          <div className="text-sm text-gray-400 text-center mt-1 space-y-1">
            <p>
              Всего: <span className="text-white font-medium">{totalDronesCount}</span> {getDroneWord(totalDronesCount)}
            </p>
            <p className={`font-medium ${activeDronesCount > 0 ? 'text-green-400' : 'text-gray-400'
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

        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          {dronesData.map(drone => (
            <div key={drone.id} className="bg-gray-900 rounded-lg p-3 border border-gray-700 hover:border-blue-500 transition-colors">

              <DroneCard
                drone={drone}
                onClick={handleDroneClick}
              />

              <div className="mt-2 flex justify-between items-center text-xs">
                <span className="text-gray-400">
                  Маршрут: <span className="text-blue-400">{drone.path?.length || 0}</span> точек
                </span>
                <span className="text-gray-500">
                  ID: {drone.id}
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {selectedDrone && (
        <DroneModal
          drone={selectedDrone}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}