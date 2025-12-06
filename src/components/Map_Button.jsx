export function MapButton({ showMap, toggleMap }) {
  return (
    <button
      onClick={toggleMap}
      className=" text-white font-medium py-2 px-4 rounded transition-colors"
    >
      {showMap ? 'Скрыть карту' : 'Показать карту'}
    </button>
  );
}