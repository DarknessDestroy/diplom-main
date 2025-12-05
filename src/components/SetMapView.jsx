import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export function SetMapView({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  
  return null;
}