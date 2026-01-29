import { useEffect, useRef, useState } from 'react';

export function SearchBox({ setMapCenter, setMapZoom }) {
    const inputRef = useRef(null);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [ymapsReady, setYmapsReady] = useState(false);

    // Ваш API-ключ Яндекс.Карт
    const API_KEY = '2b39244b-bae4-482a-b3a8-d4b21860b4e8';

    // Инициализация Яндекс.Карт с API-ключом
    useEffect(() => {
        // Если Яндекс уже загружен
        if (window.ymaps && window.yandexMapsLoaded) {
            window.ymaps.ready(() => {
                setYmapsReady(true);
                console.log('Yandex Maps API already loaded');
            });
            return;
        }

        // Проверяем, не загружается ли уже
        if (window.yandexMapsLoading) return;
        window.yandexMapsLoading = true;

        // Загружаем API Яндекс.Карт с ключом
        const script = document.createElement('script');
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${API_KEY}&lang=ru_RU`;
        script.async = true;

        script.onload = () => {
            if (!window.ymaps) {
                console.error('Yandex Maps API object not created');
                return;
            }

            window.ymaps.ready(() => {
                console.log('Yandex Maps API loaded with key');
                setYmapsReady(true);
                window.yandexMapsLoaded = true;
                window.yandexMapsLoading = false;
            });
        };

        script.onerror = (error) => {
            console.error('Failed to load Yandex Maps API:', error);
            window.yandexMapsLoading = false;
            // Пробуем загрузить без ключа как fallback
            loadYmapsWithoutKey();
        };

        document.head.appendChild(script);

        return () => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, []);

    // Fallback: загрузка без ключа
    const loadYmapsWithoutKey = () => {
        const fallbackScript = document.createElement('script');
        fallbackScript.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
        fallbackScript.async = true;

        fallbackScript.onload = () => {
            if (window.ymaps) {
                window.ymaps.ready(() => {
                    console.log('Yandex Maps API loaded without key');
                    setYmapsReady(true);
                    window.yandexMapsLoaded = true;
                    window.yandexMapsLoading = false;
                });
            }
        };

        document.head.appendChild(fallbackScript);
    };

    // Запрос подсказок при изменении запроса
    useEffect(() => {
        if (!ymapsReady || query.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const fetchSuggestions = async () => {
            try {
                // Используем suggest для получения подсказок
                if (window.ymaps && window.ymaps.suggest) {
                    window.ymaps.suggest(query)
                        .then((items) => {
                            if (items && items.length > 0) {
                                const formattedSuggestions = items.map(item => ({
                                    name: item.displayName || item.value,
                                    value: item.value,
                                    description: item.description || ''
                                }));
                                setSuggestions(formattedSuggestions);
                                setShowSuggestions(true);
                            } else {
                                // Fallback: используем геокодер
                                fallbackGeocodeSuggestions();
                            }
                        })
                        .catch(() => {
                            // В случае ошибки используем геокодер
                            fallbackGeocodeSuggestions();
                        });
                } else {
                    // Если suggest не доступен, используем геокодер
                    fallbackGeocodeSuggestions();
                }
            } catch (error) {
                console.error('Error fetching suggestions:', error);
                setSuggestions([]);
            }
        };

        const fallbackGeocodeSuggestions = async () => {
            try {
                const response = await window.ymaps.geocode(query, { results: 5 });
                const suggestionsList = [];

                response.geoObjects.each((geoObject) => {
                    const name = geoObject.properties.get('name');
                    const description = geoObject.properties.get('description') || '';
                    const kind = geoObject.properties.get('metaDataProperty')?.GeocoderMetaData?.kind || '';

                    if (name) {
                        suggestionsList.push({
                            name: name,
                            value: name,
                            description: description,
                            kind: kind
                        });
                    }
                });

                setSuggestions(suggestionsList);
                setShowSuggestions(suggestionsList.length > 0);
            } catch (error) {
                console.error('Error in fallback geocode:', error);
                setSuggestions([]);
            }
        };

        // Дебаунс запросов
        const timeoutId = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timeoutId);
    }, [query, ymapsReady]);

    // Обработчик поиска
    const handleSearch = async (searchText = query) => {
        if (!searchText.trim() || !ymapsReady) return;

        setIsLoading(true);
        setShowSuggestions(false);

        try {
            // Выполняем геокодирование
            const response = await window.ymaps.geocode(searchText, { results: 1 });

            if (response.geoObjects.getLength() === 0) {
                alert('Ничего не найдено. Попробуйте другой запрос.');
                return;
            }

            const geoObject = response.geoObjects.get(0);
            const coordinates = geoObject.geometry.getCoordinates();

            // Обновляем центр карты
            setMapCenter([coordinates[0], coordinates[1]]);

            // Определяем оптимальный зум
            let zoom = 15; // Значение по умолчанию

            // Определяем зум по типу объекта
            const kind = geoObject.properties.get('metaDataProperty')?.GeocoderMetaData?.kind;
            if (kind) {
                switch (kind) {
                    case 'house': zoom = 18; break;
                    case 'street': zoom = 17; break;
                    case 'metro': zoom = 16; break;
                    case 'district': zoom = 15; break;
                    case 'locality': zoom = 14; break;
                    case 'area': zoom = 10; break;
                    case 'province': zoom = 8; break;
                    case 'country': zoom = 15; break;
                    default: zoom = 15;
                }
            }

            setMapZoom(zoom);
            console.log(`Found: ${geoObject.properties.get('name')}, zoom: ${zoom}`);

        } catch (error) {
            console.error('Search error:', error);
            // Пробуем альтернативный метод поиска
            try {
                await alternativeSearch(searchText);
            } catch (altError) {
                alert('Ошибка поиска. Проверьте соединение с интернетом.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Альтернативный метод поиска для браузеров с проблемами
    const alternativeSearch = async (searchText) => {
        // Создаем URL для прямого запроса к API Яндекс
        const encodedQuery = encodeURIComponent(searchText);
        const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${API_KEY}&format=json&geocode=${encodedQuery}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.response && data.response.GeoObjectCollection &&
                data.response.GeoObjectCollection.featureMember.length > 0) {

                const geoObject = data.response.GeoObjectCollection.featureMember[0].GeoObject;
                const pos = geoObject.Point.pos.split(' ');
                const coordinates = [parseFloat(pos[1]), parseFloat(pos[0])]; // Широта, долгота

                setMapCenter(coordinates);
                setMapZoom(17);
            }
        } catch (error) {
            throw error;
        }
    };

    const handleSuggestionSelect = async (suggestion) => {
        const searchText = suggestion.name || suggestion.value;

        setQuery(searchText);
        setShowSuggestions(false);
        setIsLoading(true);

        try {
            const response = await window.ymaps.geocode(searchText, { results: 1 });

            if (response.geoObjects.getLength() === 0) return;

            const geoObject = response.geoObjects.get(0);
            const coordinates = geoObject.geometry.getCoordinates();

            setMapCenter([coordinates[0], coordinates[1]]);
            setMapZoom(15);

        } catch (error) {
            console.error('Error selecting suggestion:', error);
        } finally {
            setIsLoading(false);
        }
    };


    // Обработчик клавиши Enter
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    // Очистка поля поиска
    const handleClear = () => {
        setQuery('');
        setSuggestions([]);
        setShowSuggestions(false);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Закрытие подсказок при клике вне компонента
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);


    return (
        <div className="w-full mb-2 relative">
            <div className="flex">
                {/* Поле ввода с иконкой */}
                <div className="relative flex-1">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                        placeholder="Поиск по адресу или месту"
                        className="w-full p-3 pl-10 pr-10 rounded-l-lg border border-gray-600 
                                 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                        disabled={isLoading}
                        autoComplete="off"
                    />

                    {/* Иконка поиска слева */}
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <svg
                            className={`w-5 h-5 ${isLoading ? 'text-blue-500' : 'text-gray-500'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>

                    {/* Кнопка очистки */}
                    {query && (
                        <button
                            onClick={handleClear}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 
                                     text-gray-400 hover:text-gray-600"
                            type="button"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Кнопка поиска */}
                <button
                    onClick={() => handleSearch()}
                    disabled={!query.trim() || isLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed 
                             text-white px-4 py-3 rounded-r-lg flex items-center gap-2"
                >
                    {isLoading ? (
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <span>Поиск</span>
                    )}
                </button>
            </div>

            {/* Всплывающие подсказки */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 
                  rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={index}
                            onClick={() => handleSuggestionSelect(suggestion)}
                            className="w-full text-left p-3 hover:bg-gray-100 border-b border-gray-200 
                         last:border-b-0 flex items-start gap-3 cursor-pointer"
                            style={{ cursor: 'pointer' }}
                        >
                            <div>
                                <div className="font-medium text-gray-800">
                                    {suggestion.name || suggestion.value}
                                </div>
                                {suggestion.description && (
                                    <div className="text-sm text-gray-500 mt-1">
                                        {suggestion.description}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Статусная информация */}
            <div className="mt-1 text-xs">
                {!ymapsReady && !isLoading && (
                    <span className="text-yellow-600">Загрузка поискового сервиса Яндекс...</span>
                )}
                {ymapsReady && query.length === 0 && (
                    <span className="text-gray-500">Введите адрес для поиска</span>
                )}
                {ymapsReady && query.length === 1 && (
                    <span className="text-gray-500">Введите еще 1 символ для подсказок</span>
                )}
                {ymapsReady && query.length >= 2 && suggestions.length === 0 && !isLoading && (
                    <span className="text-gray-500">Подсказок не найдено</span>
                )}
                {ymapsReady && query.length >= 2 && suggestions.length > 0 && (
                    <span className="text-gray-500">Найдено {suggestions.length} подсказок</span>
                )}
            </div>
        </div>
    );
}