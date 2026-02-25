import { useState, useEffect, useCallback, useRef } from 'react';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

// Краткое описание по коду погоды WMO
const weatherLabel = (code) => {
  if (code === null || code === undefined) return { short: '—', icon: '🌡️' };
  const map = {
    0: { short: 'Ясно', icon: '☀️' },
    1: { short: 'Преим. ясно', icon: '🌤️' },
    2: { short: 'Переменная облачность', icon: '⛅' },
    3: { short: 'Пасмурно', icon: '☁️' },
    45: { short: 'Туман', icon: '🌫️' },
    48: { short: 'Изморозь', icon: '🌫️' },
    51: { short: 'Морось', icon: '🌧️' },
    53: { short: 'Морось', icon: '🌧️' },
    55: { short: 'Морось', icon: '🌧️' },
    61: { short: 'Дождь', icon: '🌧️' },
    63: { short: 'Дождь', icon: '🌧️' },
    65: { short: 'Ливень', icon: '⛈️' },
    71: { short: 'Снег', icon: '❄️' },
    73: { short: 'Снег', icon: '❄️' },
    75: { short: 'Снег', icon: '❄️' },
    77: { short: 'Снежная крупа', icon: '🌨️' },
    80: { short: 'Ливень', icon: '🌦️' },
    81: { short: 'Ливень', icon: '🌦️' },
    82: { short: 'Ливень', icon: '⛈️' },
    85: { short: 'Снег', icon: '🌨️' },
    86: { short: 'Снег', icon: '🌨️' },
    95: { short: 'Гроза', icon: '⛈️' },
    96: { short: 'Гроза с градом', icon: '⛈️' },
    99: { short: 'Гроза с градом', icon: '⛈️' }
  };
  return map[code] || { short: 'Погода', icon: '🌡️' };
};

const PANEL_DURATION_MS = 220;

export function WeatherWidget({ latitude, longitude, className = '' }) {
  const [expanded, setExpanded] = useState(false);
  const [closing, setClosing] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const closeTimeoutRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Плавное появление панели
  useEffect(() => {
    if (!expanded && !closing) {
      setPanelVisible(false);
      return;
    }
    if (expanded && !closing) {
      const t = requestAnimationFrame(() => {
        requestAnimationFrame(() => setPanelVisible(true));
      });
      return () => cancelAnimationFrame(t);
    }
  }, [expanded, closing]);

  const handleClose = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setExpanded(false);
      setClosing(false);
      closeTimeoutRef.current = null;
    }, PANEL_DURATION_MS);
  }, []);

  useEffect(() => () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  const fetchWeather = useCallback(async () => {
    const lat = latitude ?? 44.605;
    const lng = longitude ?? 33.522;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,apparent_temperature',
        timezone: 'auto'
      });
      const res = await fetch(`${OPEN_METEO_URL}?${params}`);
      if (!res.ok) throw new Error('Ошибка запроса погоды');
      const json = await res.json();
      setData(json.current ? { ...json.current, time: json.current?.time } : null);
    } catch (e) {
      setError(e.message || 'Не удалось загрузить погоду');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000); // обновление раз в 10 мин
    return () => clearInterval(interval);
  }, [fetchWeather]);

  const w = data ? weatherLabel(data.weather_code) : { short: '—', icon: '🌡️' };
  const temp = data?.temperature_2m != null ? Math.round(data.temperature_2m) : '—';
  const feelsLike = data?.apparent_temperature != null ? Math.round(data.apparent_temperature) : null;
  const humidity = data?.relative_humidity_2m != null ? Math.round(data.relative_humidity_2m) : null;
  const windSpeed = data?.wind_speed_10m != null ? data.wind_speed_10m : null;
  const windDir = data?.wind_direction_10m != null ? data.wind_direction_10m : null;
  const pressure = data?.surface_pressure != null ? Math.round(data.surface_pressure) : null;

  const windDirText = (deg) => {
    if (deg == null) return '';
    if (deg < 23) return 'С';
    if (deg < 68) return 'СВ';
    if (deg < 113) return 'В';
    if (deg < 158) return 'ЮВ';
    if (deg < 203) return 'Ю';
    if (deg < 248) return 'ЮЗ';
    if (deg < 293) return 'З';
    if (deg < 338) return 'СЗ';
    return 'С';
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => (expanded || closing ? handleClose() : setExpanded(true))}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800/95 hover:bg-gray-700/95 border border-gray-600 rounded-lg shadow-lg transition-colors text-left min-w-0"
        title="Погода в реальном времени"
      >
        {loading && !data ? (
          <span className="text-gray-400 text-sm">Загрузка...</span>
        ) : error ? (
          <span className="text-red-400 text-sm" title={error}>Ошибка</span>
        ) : (
          <>
            <span className="text-xl leading-none">{w.icon}</span>
            <span className="text-white font-semibold tabular-nums">{temp}°</span>
            <span className="text-gray-400 text-xs hidden sm:inline">{w.short}</span>
            <span className="text-gray-500 ml-0.5">{expanded ? '▲' : '▼'}</span>
          </>
        )}
      </button>

      {(expanded || closing) && (
        <div
          className={`absolute top-full right-0 mt-1 w-64 bg-gray-800/98 border border-gray-600 rounded-xl shadow-xl p-4 z-[1001] transition-all duration-200 ease-out origin-top-right ${
            closing ? 'opacity-0 scale-95 translate-y-1' : panelVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1'
          }`}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-white">Погода</span>
          </div>
          {error && (
            <p className="text-red-400 text-sm mb-2">{error}</p>
          )}
          {data && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Температура</span>
                <span className="text-white font-medium">{temp} °C</span>
              </div>
              {feelsLike != null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Ощущается</span>
                  <span className="text-white">{feelsLike} °C</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Условия</span>
                <span className="text-white">{w.icon} {w.short}</span>
              </div>
              {humidity != null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Влажность</span>
                  <span className="text-white">{humidity} %</span>
                </div>
              )}
              {windSpeed != null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Ветер</span>
                  <span className="text-white">{windSpeed} км/ч {windDirText(windDir)}</span>
                </div>
              )}
              {pressure != null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Давление</span>
                  <span className="text-white">{Math.round(pressure * 0.75006)} мм рт. ст.</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-700 mt-2">
                <button
                  type="button"
                  onClick={fetchWeather}
                  disabled={loading}
                  className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                >
                  {loading ? 'Обновление...' : 'Обновить'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
