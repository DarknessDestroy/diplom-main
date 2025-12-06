import { useState, useEffect, useRef } from 'react';

export function SearchBox({ setMapCenter }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef(null);

  // Очистка таймера
  const clearTimer = () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  };

  // Функция для поиска мест
  const performSearch = async (searchText) => {
    if (!searchText.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик изменения input с debounce
  const handleInputChange = (e) => {
    const text = e.target.value;
    setQuery(text);
    
    // Очищаем предыдущий таймер
    clearTimer();
    
    // Устанавливаем новый таймер
    if (text.trim()) {
      debounceTimer.current = setTimeout(() => {
        performSearch(text);
      }, 500); // Задержка 500мс
    } else {
      setResults([]);
    }
  };

  // Обработчик выбора места
  const handleSelect = (place) => {
    setQuery(place.display_name);
    setResults([]);
    
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    
    if (!isNaN(lat) && !isNaN(lon)) {
      setMapCenter([lat, lon]);
      console.log('Новый центр карты:', [lat, lon]);
    }
    
    clearTimer();
  };

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  return (
    <div className="relative w-full max-w-[400px] mb-2">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Поиск места или координат"
          className="w-full px-3 py-2 rounded border border-gray-300 text-black pr-10"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
      
      {results.length > 0 && (
        <ul className="absolute top-full left-0 w-full bg-white text-black border border-gray-300 rounded mt-1 max-h-48 overflow-y-auto z-50 shadow-lg">
          {results.map((place, idx) => (
            <li
              key={place.place_id || idx}
              className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
              onClick={() => handleSelect(place)}
            >
              <div className="font-medium">{place.display_name.split(',')[0]}</div>
              <div className="text-sm text-gray-600">
                {place.display_name.split(',').slice(1).join(',').trim()}
              </div>
            </li>
          ))}
        </ul>
      )}

      {query && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 w-full bg-white text-gray-500 border border-gray-300 rounded mt-1 p-2 z-50">
          Ничего не найдено
        </div>
      )}
    </div>
  );
}