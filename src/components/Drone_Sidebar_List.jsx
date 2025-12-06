export function DroneCard({ drone, onClick }) {
  const getStatusColor = (status) => {
    switch(status) {
      case 'в полете': return 'bg-green-500';
      case 'на земле': return 'bg-gray-500';
      case 'возвращается': return 'bg-orange-500';
      case 'пауза': return 'bg-yellow-500';
      default: return 'bg-gray-500';
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
    <div 
      className="bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-blue-500 cursor-pointer transition-all duration-200 hover:bg-gray-750"
      onClick={() => onClick(drone)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(drone.status)}`}></div>
          <h3 className="font-bold text-white">{drone.name}</h3>
        </div>
        <span className="text-xs text-gray-400">ID: {drone.id}</span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Батарея</span>
          <span className={`font-medium ${getBatteryColor(drone.battery)}`}>
            {drone.battery}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-full rounded-full ${
              drone.battery > 70 ? 'bg-green-500' : 
              drone.battery > 30 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: getBatteryWidth(drone.battery) }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-gray-900 p-2 rounded">
          <div className="text-gray-400">Скорость</div>
          <div className={`font-medium ${drone.speed === 0 ? 'text-gray-400' : 'text-white'}`}>
            {drone.speed} м/с
          </div>
        </div>
        <div className="bg-gray-900 p-2 rounded">
          <div className="text-gray-400">Высота</div>
          <div className={`font-medium ${drone.altitude === 0 ? 'text-gray-400' : 'text-white'}`}>
            {drone.altitude} м
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-between items-center">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(drone.status)}`}>
          {drone.status}
        </span>
        {drone.status === 'на земле' && (
          <span className="text-xs text-gray-400">
            Скорость: {drone.speed} м/с, Высота: {drone.altitude} м
          </span>
        )}
      </div>
    </div>
  );
}