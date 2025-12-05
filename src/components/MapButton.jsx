export function MapButton({ showMap, toggleMap }) {
  return (
    <button
      onClick={toggleMap}
      className="bg-blue-500 rounded hover:bg-blue-600 inline-block mb-2"
    >
      {showMap ? 'Скрыть карту' : 'Показать карту'}
    </button>
  );
}