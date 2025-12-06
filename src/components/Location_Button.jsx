import { useState } from 'react';

export function LocationButton({ setMapCenter, mapCenter }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);


  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Геолокация не поддерживается вашим браузером');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(

      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = [latitude, longitude];
        
        setCurrentLocation(newLocation);
        setMapCenter(newLocation);
        setIsLoading(false);
        
        console.log('Текущая геолокация:', newLocation);
      },

      (error) => {
        setIsLoading(false);
        switch(error.code) {
          case error.PERMISSION_DENIED:
            setError('Доступ к геолокации запрещен. Разрешите доступ в настройках браузера.');
            break;
          case error.POSITION_UNAVAILABLE:
            setError('Информация о местоположении недоступна.');
            break;
          case error.TIMEOUT:
            setError('Время запроса геолокации истекло.');
            break;
          default:
            setError('Произошла неизвестная ошибка при получении геолокации.');
        }
      },
      
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const isAtCurrentLocation = currentLocation && 
    mapCenter[0] === currentLocation[0] && 
    mapCenter[1] === currentLocation[1];

  return (
    <div className="relative">
      <button
        onClick={getCurrentLocation}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors
          ${isLoading 
            ? 'bg-gray-600 cursor-not-allowed' 
            : isAtCurrentLocation
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }
          text-white
        `}
        title={isAtCurrentLocation ? 'Вы находитесь на своей геолокации' : 'Перейти к моей геолокации'}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Определение...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{isAtCurrentLocation ? 'На моей геолокации' : 'Моя геолокация'}</span>
          </>
        )}
      </button>

      {error && (
        <div className="absolute top-full left-0 mt-2 bg-red-900 text-white p-2 rounded text-xs max-w-xs z-50">
          <div className="flex items-start">
            <svg className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="mt-1 text-red-300 hover:text-white text-xs"
          >
            Закрыть
          </button>
        </div>
      )}
    </div>
  );
}