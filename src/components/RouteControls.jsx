export function RouteControls({ undoLastPoint, clearRoute, disabled = false }) {
  return (
    <div className="flex gap-2 mb-2">
      <button
        onClick={undoLastPoint}
        disabled={disabled}
        className={`
          px-3 py-1 rounded text-sm font-medium transition
          ${disabled 
            ? 'bg-gray-500 cursor-not-allowed opacity-50' 
            : 'bg-yellow-500 hover:bg-yellow-600 text-black'
          }
        `}
        title={disabled ? 'Сначала завершите установку позиции' : 'Отменить последнюю точку маршрута'}
      >
        Отмена
      </button>
      <button
        onClick={clearRoute}
        disabled={disabled}
        className={`
          px-3 py-1 rounded text-sm font-medium transition
          ${disabled 
            ? 'bg-gray-500 cursor-not-allowed opacity-50' 
            : 'bg-red-500 hover:bg-red-600 text-white'
          }
        `}
        title={disabled ? 'Сначала завершите установку позиции' : 'Очистить весь маршрут'}
      >
        Очистить маршрут
      </button>
      
      {disabled && (
        <span className="text-xs text-yellow-400 flex items-center px-2">
          ⚡ Режим позиционирования активен
        </span>
      )}
    </div>
  );
}