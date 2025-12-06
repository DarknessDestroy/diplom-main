export function RouteControls({ undoLastPoint, clearRoute, disabled = false }) {
  return (
    <div className="flex gap-2 mb-2">
      <button
        onClick={undoLastPoint}
        disabled={disabled}
        className={`
          px-4 py-2 rounded font-medium transition
          ${disabled
            ? 'bg-gray-500 cursor-not-allowed opacity-50'
            : 'bg-yellow-500 hover:bg-yellow-600 text-black'
          }
        `}
        title={disabled ? 'Нет активных дронов для построения маршрута' : 'Отменить последнюю точку маршрута'}
      >
        Отмена
      </button>
      <button
        onClick={clearRoute}
        disabled={disabled}
        className={`
          px-4 py-2 rounded font-medium transition
          ${disabled
            ? 'bg-gray-500 cursor-not-allowed opacity-50'
            : 'bg-red-500 hover:bg-red-600 text-white'
          }
        `}
        title={disabled ? 'Нет активных дронов для очистки маршрута' : 'Очистить весь маршрут'}
      >
        Очистить маршрут
      </button>

      {disabled && (
        <div className="text-sm text-gray-400 ml-2 flex items-center">
          Сначала разместите дроны на карте
        </div>
      )}
    </div>
  );
}