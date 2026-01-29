import { useEffect, useRef, useState } from 'react';

// Глобальные флаги для API Яндекс.Карт
if (typeof window !== 'undefined') {
  if (!window.yandexMapsLoading) window.yandexMapsLoading = false;
  if (!window.yandexMapsLoaded) window.yandexMapsLoaded = false;
}

export function YandexMap({
  drones,
  mapCenter,
  mapZoom = 13,
  onMapClick,
  onDronePositionChange,
  placementMode = false,
  selectedDroneId = null,
  forceResize = false
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const droneMarkersRef = useRef({}); // Храним маркеры дронов по id
  const routePolylinesRef = useRef({}); // Храним линии маршрутов
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(null);
  const lastMapCenterRef = useRef(mapCenter);
  const lastMapZoomRef = useRef(mapZoom);

  const API_KEY = '2b39244b-bae4-482a-b3a8-d4b21860b4e8';

  // 1️⃣ Загрузка API Яндекс.Карт
  useEffect(() => {
    if (window.ymaps && window.yandexMapsLoaded) {
      setTimeout(initMap, 100);
      return;
    }
    if (window.yandexMapsLoading) {
      const interval = setInterval(() => {
        if (window.ymaps && window.yandexMapsLoaded) {
          clearInterval(interval);
          initMap();
        }
      }, 100);
      return;
    }

    window.yandexMapsLoading = true;
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${API_KEY}&lang=ru_RU`;
    script.async = true;

    script.onload = () => {
      if (!window.ymaps) {
        setError('API Яндекс.Карт не загрузилось');
        return;
      }
      window.ymaps.ready(() => {
        window.yandexMapsLoaded = true;
        window.yandexMapsLoading = false;
        initMap();
      });
    };

    script.onerror = () => {
      yandexMapsLoading = false;
      setError('Не удалось загрузить API Яндекс.Карт');
    };

    document.head.appendChild(script);
  }, []);

  // 2️⃣ Инициализация карты
  const initMap = () => {
    if (!mapContainerRef.current || !window.ymaps) return;
    if (mapInstanceRef.current) return;

    const map = new window.ymaps.Map(mapContainerRef.current, {
      center: mapCenter || [55.751244, 37.618423],
      zoom: mapZoom,
      // Отключаем кнопку разворота карты на весь экран
      controls: [],
    });

    mapInstanceRef.current = map;
    lastMapCenterRef.current = mapCenter;
    lastMapZoomRef.current = mapZoom;
    setMapLoaded(true);

    // Инициализируем объекты дронов
    drones.forEach(drone => {
      if (!drone.position) return;
      createDroneMarker(map, drone);
    });

    // Рисуем маршруты
    drones.forEach(drone => {
      if (drone.path && drone.path.length > 1) {
        createDroneRoute(map, drone);
      }
    });
  };

  // Создание маркера дрона
  const createDroneMarker = (map, drone) => {
    if (!drone.position || !drone.isVisible) return;

    const placemark = new window.ymaps.Placemark(
      [drone.position.lat, drone.position.lng],
      {
        balloonContent: `
          <div style="padding: 10px; font-family: Arial;">
            <strong>${drone.name}</strong><br/>
            Статус: ${drone.status}<br/>
            Батарея: ${drone.battery}%
          </div>
        `,
        hintContent: drone.name
      },
      {
        iconLayout: 'default#image',
        iconImageHref: '/ico.png',
        iconImageSize: [35, 35],
        iconImageOffset: [-17, -17],
        draggable: drone.status !== 'в полете',
        balloonOffset: [0, -50],
        balloonAutoPan: false,
        hideIconOnBalloonOpen: false
      }
    );

    // Обработка перетаскивания
    if (drone.status !== 'в полете') {
      placemark.events.add('dragend', (e) => {
        const coords = e.get('target').geometry.getCoordinates();
        if (onDronePositionChange) {
          onDronePositionChange(drone.id, { lat: coords[0], lng: coords[1] });
        }
      });
    }

    map.geoObjects.add(placemark);
    droneMarkersRef.current[drone.id] = placemark;
  };

  // Создание маршрута дрона
  const createDroneRoute = (map, drone) => {
    if (!drone.path || drone.path.length < 2) return;

    // Удаляем старый маршрут, если есть
    if (routePolylinesRef.current[drone.id]) {
      map.geoObjects.remove(routePolylinesRef.current[drone.id]);
    }

    const polyline = new window.ymaps.Polyline(
      drone.path.map(p => [p[0], p[1]]),
      {},
      {
        strokeColor: drone.id === selectedDroneId ? '#FF0000' : '#3b82f6',
        strokeWidth: 3,
        strokeOpacity: 0.7
      }
    );

    map.geoObjects.add(polyline);
    routePolylinesRef.current[drone.id] = polyline;
  };

  // 3️⃣ Обновление положения дронов (без смены центра карты)
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Обновляем существующие маркеры дронов
    drones.forEach(drone => {
      const existingMarker = droneMarkersRef.current[drone.id];

      if (drone.isVisible && drone.position) {
        if (existingMarker) {
          // Обновляем положение существующего маркера
          existingMarker.geometry.setCoordinates([drone.position.lat, drone.position.lng]);
        } else {
          // Создаем новый маркер
          createDroneMarker(map, drone);
        }
      } else if (existingMarker) {
        // Удаляем маркер если дрон не видим
        map.geoObjects.remove(existingMarker);
        delete droneMarkersRef.current[drone.id];
      }

      // Обновляем маршруты
      if (drone.path && drone.path.length > 1) {
        createDroneRoute(map, drone);
      } else if (routePolylinesRef.current[drone.id]) {
        // Удаляем маршрут если его нет
        map.geoObjects.remove(routePolylinesRef.current[drone.id]);
        delete routePolylinesRef.current[drone.id];
      }
    });

    // Удаляем маркеры дронов, которых больше нет в списке
    Object.keys(droneMarkersRef.current).forEach(droneId => {
      if (!drones.some(d => d.id.toString() === droneId)) {
        map.geoObjects.remove(droneMarkersRef.current[droneId]);
        delete droneMarkersRef.current[droneId];
      }
    });

    // Удаляем маршруты дронов, которых больше нет в списке
    Object.keys(routePolylinesRef.current).forEach(droneId => {
      if (!drones.some(d => d.id.toString() === droneId)) {
        map.geoObjects.remove(routePolylinesRef.current[droneId]);
        delete routePolylinesRef.current[droneId];
      }
    });

  }, [drones, selectedDroneId, mapLoaded]); // Убрал mapCenter и mapZoom из зависимостей

  // В YandexMap.jsx добавьте анимацию для летящего дрона
  // В функции обновления маркеров дронов добавьте:

  const createDroneIcon = (drone, isActive = false) => {
    const color = getDroneColor(drone.id);
    const isFlying = drone.isFlying;

    return L.divIcon({
      html: `
      <div style="
        width: ${isFlying ? '40px' : '32px'};
        height: ${isFlying ? '40px' : '32px'};
        background: ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        transform: rotate(${drone.heading || 0}deg);
        ${isFlying ? 'animation: pulse 2s infinite;' : ''}
        ${isActive ? 'box-shadow: 0 0 0 3px #FFD700;' : ''}
      ">
        <div style="
          width: ${isFlying ? '16px' : '12px'};
          height: ${isFlying ? '16px' : '12px'};
          background: white;
          border-radius: 50%;
          transform: rotate(-${drone.heading || 0}deg);
        "></div>
        ${isFlying ? `
          <div style="
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255,255,255,0.9);
            color: ${color};
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: bold;
            white-space: nowrap;
          ">
            ${Math.round((drone.speed || 0) * 3.6)} км/ч
          </div>
        ` : ''}
      </div>
      ${isFlying ? `
        <div style="
          position: absolute;
          bottom: -25px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          white-space: nowrap;
        ">
          ${drone.altitude || 0} м
        </div>
      ` : ''}
    `,
      iconSize: isFlying ? [40, 60] : [32, 32],
      iconAnchor: isFlying ? [20, 40] : [16, 16],
      className: 'drone-marker'
    });
  };


  // 4️⃣ Обновление центра и зума карты (только при поиске)
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !mapCenter) return;

    // Обновляем только если центр действительно изменился (поиск)
    const shouldUpdateCenter =
      lastMapCenterRef.current[0] !== mapCenter[0] ||
      lastMapCenterRef.current[1] !== mapCenter[1];

    const shouldUpdateZoom = lastMapZoomRef.current !== mapZoom;

    if (shouldUpdateCenter || shouldUpdateZoom) {
      if (shouldUpdateCenter) {
        mapInstanceRef.current.setCenter(mapCenter);
        lastMapCenterRef.current = mapCenter;
      }
      if (shouldUpdateZoom) {
        mapInstanceRef.current.setZoom(mapZoom);
        lastMapZoomRef.current = mapZoom;
      }
    }
  }, [mapCenter, mapZoom, mapLoaded]);

  // 5️⃣ Обработчик клика по карте
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const handleClick = (e) => {
      const coords = e.get('coords');
      if (typeof onMapClick === 'function') {
        onMapClick({ lat: coords[0], lng: coords[1] });
      }
    };

    map.events.add('click', handleClick);

    return () => map.events.remove('click', handleClick);
  }, [onMapClick, mapLoaded]);

  // 6️⃣ Обновление размера карты при изменении размера контейнера
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !mapContainerRef.current) return;

    const updateMapSize = () => {
      if (mapInstanceRef.current && mapContainerRef.current) {
        try {
          const map = mapInstanceRef.current;
          const container = mapContainerRef.current;
          const width = container.offsetWidth;
          const height = container.offsetHeight;
          
          if (width > 0 && height > 0) {
            // Используем встроенный метод Яндекс.Карт для обновления размера
            map.container.fitToViewport();
          }
        } catch (error) {
          // Альтернативный метод через setSize
          try {
            const map = mapInstanceRef.current;
            const container = mapContainerRef.current;
            if (map && container) {
              const width = container.offsetWidth;
              const height = container.offsetHeight;
              
              if (width > 0 && height > 0) {
                map.container.setSize([width, height]);
              }
            }
          } catch (e) {
            console.warn('Не удалось обновить размер карты:', e);
          }
        }
      }
    };

    // Обновляем размер при изменении размера окна
    window.addEventListener('resize', updateMapSize);

    // Используем ResizeObserver для отслеживания изменений размера контейнера
    let resizeObserver = null;
    if (mapContainerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        // Небольшая задержка для завершения CSS-анимаций
        setTimeout(updateMapSize, 100);
      });
      resizeObserver.observe(mapContainerRef.current);
    } else {
      // Fallback: периодическая проверка размера
      const intervalId = setInterval(() => {
        if (mapContainerRef.current && mapInstanceRef.current) {
          updateMapSize();
        }
      }, 500);
      
      return () => {
        clearInterval(intervalId);
        window.removeEventListener('resize', updateMapSize);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    }

    return () => {
      window.removeEventListener('resize', updateMapSize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [mapLoaded]);

  // 6.5️⃣ Принудительное обновление размера при изменении forceResize
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !mapContainerRef.current) return;
    
    // Задержка для завершения CSS-анимаций при скрытии/показе стоянки
    const timeoutId = setTimeout(() => {
      if (mapInstanceRef.current && mapContainerRef.current) {
        try {
          const map = mapInstanceRef.current;
          const container = mapContainerRef.current;
          const width = container.offsetWidth;
          const height = container.offsetHeight;
          
          if (width > 0 && height > 0) {
            map.container.fitToViewport();
          }
        } catch (error) {
          try {
            const map = mapInstanceRef.current;
            const container = mapContainerRef.current;
            if (map && container) {
              const width = container.offsetWidth;
              const height = container.offsetHeight;
              if (width > 0 && height > 0) {
                map.container.setSize([width, height]);
              }
            }
          } catch (e) {
            console.warn('Не удалось обновить размер карты:', e);
          }
        }
      }
    }, 350); // Задержка чуть больше, чем длительность CSS-анимации (300ms)

    return () => clearTimeout(timeoutId);
  }, [forceResize, mapLoaded]);


  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    const removeYandexElements = () => {
      const selectorsToRemove = [
        '.ymaps-2-1-79-gotoymaps__container',
        '.ymaps-2-1-79-gotoymaps__text-container',
        '.ymaps-2-1-79-gototech',
        '.ymaps-2-1-79-copyright__content',
        '.ymaps-2-1-79-copyright__agreement',
        '.ymaps-2-1-79-copyright__logo-cell'
      ];

      selectorsToRemove.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
          element.remove();
        });
      });
    };

    // Вызываем удаление после небольшой задержки, чтобы элементы успели появиться
    const timeoutId = setTimeout(removeYandexElements, 500); 

    return () => clearTimeout(timeoutId);
  }, [mapLoaded]);

  // 8️⃣ Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          // Удаляем все маркеры
          Object.values(droneMarkersRef.current).forEach(marker => {
            try { mapInstanceRef.current.geoObjects.remove(marker); } catch { }
          });
          Object.values(routePolylinesRef.current).forEach(polyline => {
            try { mapInstanceRef.current.geoObjects.remove(polyline); } catch { }
          });

          mapInstanceRef.current.destroy();
        } catch { }
        mapInstanceRef.current = null;
      }
      droneMarkersRef.current = {};
      routePolylinesRef.current = {};
      setMapLoaded(false);
    };
  }, []);

  if (error) {
    return (
      <div className="w-full h-[500px] bg-gray-800 rounded flex flex-col items-center justify-center p-4">
        <div className="text-red-500 text-2xl mb-2">⚠️</div>
        <h3 className="text-white font-bold mb-2">Ошибка загрузки карты</h3>
        <p className="text-gray-300 text-center mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null);
            yandexMapsLoaded = false;
            yandexMapsLoading = false;
            droneMarkersRef.current = {};
            routePolylinesRef.current = {};
            initMap();
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Перезагрузить карту
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-900 rounded overflow-hidden relative">

      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{
          height: '100%',
          width: '100%',
          cursor: placementMode ? 'crosshair' : 'grab',
        }}
      />
    </div>
  );
}