// Данные дронов
export const dronesData = [
  { id: 1, name: 'Дрон №1', battery: 85, speed: 15, altitude: 8, status: 'в полете' },
  { id: 2, name: 'Дрон №2', battery: 60, speed: 0, altitude: 0, status: 'на земле' },
  { id: 3, name: 'Дрон №3', battery: 30, speed: 10, altitude: 10, status: 'в полете' },
  { id: 4, name: 'Дрон №4', battery: 90, speed: 20, altitude: 4, status: 'в полете' },
  { id: 5, name: 'Дрон №5', battery: 45, speed: 5, altitude: 5, status: 'на земле' },
  { id: 6, name: 'Дрон №6', battery: 75, speed: 12, altitude: 6, status: 'в полете' },
  { id: 7, name: 'Дрон №7', battery: 25, speed: 0, altitude: 0, status: 'на земле' },
  { id: 8, name: 'Дрон №8', battery: 95, speed: 18, altitude: 4, status: 'в полете' },
];

// Начальная позиция карты
export const initialMapCenter = [55.755819, 37.617644];

// Иконка дрона
import L from 'leaflet';
export const droneIcon = new L.Icon({
  iconUrl: 'ico.png',
  iconSize: [35, 35],
});