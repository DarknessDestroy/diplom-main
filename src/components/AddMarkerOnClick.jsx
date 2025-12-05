import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export function AddMarkerOnClick({ addPoint }) {
  const map = useMap();
  
  useEffect(() => {
    const handler = (e) => addPoint(e.latlng);
    map.on('click', handler);
    return () => map.off('click', handler);
  }, [map, addPoint]);
  
  return null;
}