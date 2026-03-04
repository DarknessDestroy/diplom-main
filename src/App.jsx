import { useState, useCallback, useEffect, useRef } from 'react';
import { SearchBox } from './components/Search_Box';
import { Sidebar } from './components/Sidebar';
import { ShabloneScreen } from './components/Shablone_Screen';
import { YandexMap } from './components/YandexMap';
import { DroneModal } from './components/Drone_OnClick_List_Sidebar';
import { DroneParking } from './components/Drone_Parking';
import { WeatherWidget } from './components/WeatherWidget';
import { dronesData, initialMapCenter, flightStatus } from './constants/drones_data';
import { MISSION_TEMPLATES_STORAGE_KEY } from './constants/mission';
import {
  calculateDistance,
  calculateFlightTime,
  calculateOptimalSpeed,
  calculateBearing
} from './utils/flightCalculator';

const VIEW_TRANSITION_MS = 300;
const EXIT_PANELS_MS = VIEW_TRANSITION_MS;
/** Минимальная дистанция (м): если дрон ближе к первой точке — перелёт до неё не добавляется */
const FIRST_WAYPOINT_TRANSIT_THRESHOLD_M = 10;

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [exitingToTemplates, setExitingToTemplates] = useState(false);
  const [missionTemplates, setMissionTemplates] = useState(() => {
    try {
      const raw = localStorage.getItem(MISSION_TEMPLATES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((t) => ({
        id: t.id,
        name: t.name || 'Без названия',
        path: Array.isArray(t.path) ? t.path : []
      }));
    } catch {
      return [];
    }
  });

  const [templateEditMode, setTemplateEditMode] = useState(null);
  const [templateDraftPath, setTemplateDraftPath] = useState([]);
  const [templateDraftName, setTemplateDraftName] = useState('');
  const [noTransitionTemplateSwitch, setNoTransitionTemplateSwitch] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(MISSION_TEMPLATES_STORAGE_KEY, JSON.stringify(missionTemplates));
    } catch (e) {
      console.warn('Failed to save mission templates', e);
    }
  }, [missionTemplates]);

  useEffect(() => {
    if (!noTransitionTemplateSwitch) return;
    const id = requestAnimationFrame(() => {
      setNoTransitionTemplateSwitch(false);
    });
    return () => cancelAnimationFrame(id);
  }, [noTransitionTemplateSwitch]);

  const addMissionTemplate = useCallback((template) => {
    const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setMissionTemplates((prev) => [...prev, { id, name: template.name || 'Шаблон', path: template.path || [] }]);
  }, []);
  const updateMissionTemplate = useCallback((id, template) => {
    setMissionTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: template.name ?? t.name, path: template.path ?? t.path } : t))
    );
  }, []);
  const deleteMissionTemplate = useCallback((id) => {
    setMissionTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const startCreateTemplate = useCallback(() => {
    setTemplateEditMode('create');
    setTemplateDraftPath([]);
    setTemplateDraftName('');
  }, []);
  const startEditTemplateRoute = useCallback((id) => {
    const t = missionTemplates.find((x) => x.id === id);
    if (!t) return;
    setTemplateEditMode({ type: 'edit', id });
    setTemplateDraftPath([...(t.path || [])]);
    setTemplateDraftName(t.name || '');
  }, [missionTemplates]);
  const cancelTemplateEdit = useCallback(() => {
    setNoTransitionTemplateSwitch(true);
    setTemplateEditMode(null);
    setTemplateDraftPath([]);
    setTemplateDraftName('');
  }, []);
  const saveTemplateDraft = useCallback(() => {
    const name = templateDraftName.trim() || 'Маршрут патрулирования';
    if (templateEditMode === 'create') {
      addMissionTemplate({ name, path: [...templateDraftPath] });
    } else if (templateEditMode && templateEditMode.type === 'edit') {
      updateMissionTemplate(templateEditMode.id, { name, path: [...templateDraftPath] });
    }
    setNoTransitionTemplateSwitch(true);
    setTemplateEditMode(null);
    setTemplateDraftPath([]);
    setTemplateDraftName('');
  }, [templateEditMode, templateDraftName, templateDraftPath, addMissionTemplate, updateMissionTemplate]);
  const addTemplateDraftPoint = useCallback((latlng) => {
    setTemplateDraftPath((prev) => [...prev, [latlng.lat, latlng.lng]]);
  }, []);
  const undoTemplateDraftPoint = useCallback(() => {
    setTemplateDraftPath((prev) => (prev.length ? prev.slice(0, -1) : []));
  }, []);

  const [templateToApplyId, setTemplateToApplyId] = useState(null);
  const computeMissionParamsFromPath = useCallback((path, maxSpeed = 70, battery = 100) => {
    if (!path || path.length < 2) return null;
    let totalDistance = 0;
    const distances = [];
    for (let i = 0; i < path.length - 1; i++) {
      const [lat1, lng1] = path[i];
      const [lat2, lng2] = path[i + 1];
      const distance = calculateDistance(lat1, lng1, lat2, lng2);
      totalDistance += distance;
      distances.push(distance);
    }
    const optimalSpeed = calculateOptimalSpeed(totalDistance, maxSpeed / 3.6);
    const flightTime = calculateFlightTime(totalDistance, optimalSpeed);
    const batteryConsumption = Math.min(totalDistance / 100, battery - 10);
    const missionParams = {
      totalDistance: Math.round(totalDistance),
      optimalSpeed: Math.round(optimalSpeed * 3.6),
      estimatedTime: Math.round(flightTime),
      batteryConsumption: Math.round(batteryConsumption),
      waypoints: path.length,
      distances,
      segmentTimes: distances.map((d) => Math.max(1000, (d / optimalSpeed) * 1000)),
      totalTime: 0
    };
    missionParams.totalTime = missionParams.segmentTimes.reduce((sum, t) => sum + t, 0);
    return missionParams;
  }, []);

  const applyTemplateToDrone = useCallback((droneId, tplId) => {
    const tpl = missionTemplates.find((t) => t.id === tplId);
    if (!tpl || !tpl.path || !tpl.path.length) return;
    setDrones((prev) => {
      const path = tpl.path.map((p) => [p[0], p[1]]);
      const next = prev.map((d) =>
        d.id === droneId ? { ...d, path } : d
      );
      const drone = next.find((d) => d.id === droneId);
      if (drone && path.length >= 2) {
        const params = computeMissionParamsFromPath(path, drone.maxSpeed, drone.battery);
        return next.map((d) =>
          d.id === droneId ? { ...d, path, missionParameters: params } : d
        );
      }
      return next;
    });
    setTemplateToApplyId(null);
  }, [missionTemplates, computeMissionParamsFromPath]);

  const [drones, setDrones] = useState(() =>
    dronesData.map(drone => ({
      ...drone,
      position: null,
      path: [],
      isVisible: false,
      battery: 100,
      status: 'на земле',
      flightStatus: flightStatus.IDLE,
      speed: 0,
      altitude: 0,
      heading: 0,
      totalDistance: 0,
      currentMission: null,
      flightProgress: 0,
      remainingBattery: 5,
      estimatedFlightTime: 0,
      currentWaypointIndex: 0,
      missionTimerId: null,
      missionStartTime: null,
      missionElapsedTime: 0,
      missionParameters: null,
      flightLog: []
    }))
  );

  const dronesRef = useRef(drones);
  useEffect(() => {
    dronesRef.current = drones;
  }, [drones]);

  const [mapCenter, setMapCenter] = useState(initialMapCenter);
  const [selectedDroneForModal, setSelectedDroneForModal] = useState(null);
  const [mapZoom, setMapZoom] = useState(13);
  const [globalMissionLog, setGlobalMissionLog] = useState([]);
  const [weatherFlightSafe, setWeatherFlightSafe] = useState(true);
  const [weatherFlightReasons, setWeatherFlightReasons] = useState([]);
  const activeTimersRef = useRef(new Map());

  const handleWeatherFlightConditions = useCallback((conditions) => {
    setWeatherFlightSafe(conditions.safe);
    setWeatherFlightReasons(conditions.reasons || []);
  }, []);

  const [placementMode, setPlacementMode] = useState(false);
  const [droneToPlace, setDroneToPlace] = useState(null);
  const [isRouteEditMode, setIsRouteEditMode] = useState(false);
  const [selectedDroneForSidebar, setSelectedDroneForSidebar] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [parkingOpen, setParkingOpen] = useState(false);

  useEffect(() => {
    if (!templateToApplyId || selectedDroneForSidebar == null) return;
    const drone = drones.find((d) => d.id === selectedDroneForSidebar);
    if (!drone || !drone.isVisible) return;
    if (drone.isFlying) return;
    applyTemplateToDrone(selectedDroneForSidebar, templateToApplyId);
  }, [templateToApplyId, selectedDroneForSidebar, drones, applyTemplateToDrone]);

  const startDronePlacement = (droneId) => {
    setDroneToPlace(droneId);
    setPlacementMode(true);
  };

  const placeDroneOnMap = (latlng) => {
    if (!droneToPlace || !placementMode) return;
    const drone = drones.find(d => d.id === droneToPlace);
    if (!drone) return;

    const positionToSet = {
      lat: latlng.lat,
      lng: latlng.lng
    };

    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneToPlace) return d;
        return {
          ...d,
          position: positionToSet,
          isVisible: true,
          battery: 100,
          status: 'на земле',
          flightStatus: flightStatus.IDLE,
          speed: 0,
          altitude: 0,
          path: [],
          missionParameters: null,
          flightProgress: 0,
          currentWaypointIndex: 0,
          flightLog: []
        };
      })
    );
    setSelectedDroneForSidebar(droneToPlace);
    setMapCenter([positionToSet.lat, positionToSet.lng]);
    setPlacementMode(false);
    setDroneToPlace(null);
    addToGlobalLog(droneToPlace, `🛸 Дрон "${drone.name}" размещен на карте`, {
      coordinates: `lat: ${positionToSet.lat.toFixed(6)}, lng: ${positionToSet.lng.toFixed(6)}`
    });
  };

  const cancelDronePlacement = () => {
    setPlacementMode(false);
    setDroneToPlace(null);
  };

  const removeDroneFromMap = (droneId) => {
    if (drones.find(d => d.id === droneId)?.flightStatus === flightStatus.FLYING) {
      stopDroneFlight(droneId);
    }

    const timerId = activeTimersRef.current.get(droneId);
    if (timerId) {
      clearInterval(timerId);
      activeTimersRef.current.delete(droneId);
    }

    const drone = drones.find(d => d.id === droneId);

    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;
        return {
          ...d,
          isVisible: false,
          path: [],
          flightStatus: flightStatus.IDLE,
          isFlying: false,
          missionParameters: null,
          missionTimerId: null,
          missionStartTime: null,
          missionElapsedTime: 0,
          flightLog: []
        };
      })
    );
    if (selectedDroneForSidebar === droneId) {
      setSelectedDroneForSidebar(null);
      setIsRouteEditMode(false);
    }
    if (drone) {
      addToGlobalLog(droneId, `🗑️ Дрон "${drone.name}" убран с карты`);
    }
  };

  const handleMapClick = (latlng) => {
    if (templateEditMode) {
      addTemplateDraftPoint(latlng);
      return;
    }
    if (placementMode && droneToPlace) {
      placeDroneOnMap(latlng);
      return;
    }
    if (selectedDroneForSidebar !== null && isRouteEditMode) {
      const drone = drones.find(d => d.id === selectedDroneForSidebar);
      if (drone && !drone.isFlying) {
        addRoutePoint(selectedDroneForSidebar, latlng);
      }
    }
  };

  const addRoutePoint = (droneId, latlng) => {
    setDrones(prev =>
      prev.map(d =>
        d.id === droneId ? {
          ...d,
          path: [...d.path, [latlng.lat, latlng.lng]]
        } : d
      )
    );
    setTimeout(() => {
      const missionParams = calculateMissionParameters(droneId);
      if (missionParams) {
        setDrones(prev =>
          prev.map(d => {
            if (d.id !== droneId) return d;
            return {
              ...d,
              missionParameters: missionParams
            };
          })
        );
        addToDroneLog(droneId, '📍 Добавлена точка маршрута', {
          pointNumber: drones.find(d => d.id === droneId)?.path?.length || 0,
          coordinates: `lat: ${latlng.lat.toFixed(6)}, lng: ${latlng.lng.toFixed(6)}`
        });
      }
    }, 0);
  };

  const undoLastPoint = (droneId) => {
    if (!droneId) droneId = selectedDroneForSidebar;
    if (!droneId) return;

    const drone = drones.find(d => d.id === droneId);
    if (!drone || !drone.path || drone.path.length === 0) return;

    setDrones(prev =>
      prev.map(d =>
        d.id === droneId ? { ...d, path: d.path.slice(0, -1) } : d
      )
    );

    addToDroneLog(droneId, '↩️ Отменена последняя точка маршрута');
  };

  const clearRoute = (droneId) => {
    if (!droneId) droneId = selectedDroneForSidebar;
    if (!droneId) return;

    const drone = drones.find(d => d.id === droneId);
    if (!drone || !drone.path || drone.path.length === 0) return;

    setDrones(prev =>
      prev.map(d =>
        d.id === droneId ? {
          ...d,
          path: [],
          missionParameters: null
        } : d
      )
    );
    addToDroneLog(droneId, '🗑️ Маршрут очищен');
  };

  const calculateMissionParameters = (droneId) => {
    const drone = drones.find(d => d.id === droneId);
    if (!drone || !drone.path || drone.path.length < 2) return null;

    let totalDistance = 0;
    const distances = [];

    for (let i = 0; i < drone.path.length - 1; i++) {
      const [lat1, lng1] = drone.path[i];
      const [lat2, lng2] = drone.path[i + 1];
      const distance = calculateDistance(lat1, lng1, lat2, lng2);
      totalDistance += distance;
      distances.push(distance);
    }

    const optimalSpeed = calculateOptimalSpeed(totalDistance, drone.maxSpeed / 3.6);
    const flightTime = calculateFlightTime(totalDistance, optimalSpeed);
    const batteryConsumption = Math.min(totalDistance / 100, drone.battery - 10);

    const missionParams = {
      totalDistance: Math.round(totalDistance),
      optimalSpeed: Math.round(optimalSpeed * 3.6),
      estimatedTime: Math.round(flightTime),
      batteryConsumption: Math.round(batteryConsumption),
      waypoints: drone.path.length,
      distances,
      segmentTimes: distances.map(distance =>
        Math.max(1000, (distance / optimalSpeed) * 1000)
      ),
      totalTime: 0
    };

    missionParams.totalTime = missionParams.segmentTimes.reduce((sum, time) => sum + time, 0);
    return missionParams;
  };

  const addToDroneLog = (droneId, message, data = {}) => {
    const drone = drones.find(d => d.id === droneId);
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      message,
      data
    };

    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;
        return {
          ...d,
          flightLog: [logEntry, ...d.flightLog].slice(0, 20)
        };
      })
    );
    const safeData = {};
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'object' && data[key] !== null) {
        safeData[key] = JSON.stringify(data[key]);
      } else {
        safeData[key] = data[key];
      }
    });

    addToGlobalLog(droneId, message, safeData);
  };

  const addToGlobalLog = (droneId, message, data = {}) => {
    const drone = drones.find(d => d.id === droneId);
    const safeData = {};
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'object' && data[key] !== null) {
        safeData[key] = JSON.stringify(data[key]);
      } else {
        safeData[key] = data[key];
      }
    });

    const globalLogEntry = {
      id: Date.now(),
      droneId,
      droneName: drone?.name || 'Неизвестный дрон',
      timestamp: new Date().toISOString(),
      message,
      data: safeData
    };

    setGlobalMissionLog(prev => [globalLogEntry, ...prev].slice(0, 100));
  };

  const startDroneFlight = useCallback((droneId) => {
    const drone = drones.find(d => d.id === droneId);
    if (!drone || !drone.path || drone.path.length < 2) {
      alert('Для запуска полета нужно проложить маршрут минимум из 2 точек');
      return;
    }

    if (drone.flightStatus === flightStatus.FLYING || drone.flightStatus === flightStatus.TAKEOFF || drone.flightStatus === flightStatus.LANDING) {
      alert('Дрон уже в процессе полета');
      return;
    }

    const firstWaypoint = drone.path[0];
    const needTransitToFirst =
      drone.position &&
      firstWaypoint &&
      calculateDistance(
        drone.position.lat,
        drone.position.lng,
        firstWaypoint[0],
        firstWaypoint[1]
      ) > FIRST_WAYPOINT_TRANSIT_THRESHOLD_M;

    const flightPath = needTransitToFirst
      ? [[drone.position.lat, drone.position.lng], ...drone.path]
      : drone.path;

    const missionParams = computeMissionParamsFromPath(
      flightPath,
      drone.maxSpeed,
      drone.battery
    );
    if (!missionParams) return;

    if (drone.battery < missionParams.batteryConsumption + 10) {
      alert(`Недостаточно заряда батареи. Требуется минимум ${missionParams.batteryConsumption + 10}%, доступно: ${drone.battery}%`);
      return;
    }
    if (selectedDroneForSidebar === droneId && isRouteEditMode) {
      setIsRouteEditMode(false);
    }

    const alreadyAtFirstPoint = !needTransitToFirst;

    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;
        return {
          ...d,
          flightStatus: alreadyAtFirstPoint ? flightStatus.FLYING : flightStatus.TAKEOFF,
          isFlying: true,
          altitude: alreadyAtFirstPoint ? 100 : 50,
          currentMission: {
            startTime: new Date().toISOString(),
            totalWaypoints: d.path.length,
            totalDistance: missionParams.totalDistance,
            estimatedTime: missionParams.estimatedTime,
            missionParams,
            flightPath
          },
          currentWaypointIndex: 0,
          flightProgress: 0,
          speed: missionParams.optimalSpeed / 3.6,
          heading: 0,
          missionParameters: missionParams,
          missionStartTime: Date.now(),
          missionElapsedTime: 0
        };
      })
    );

    addToDroneLog(droneId, '🚀 Старт миссии', {
      waypoints: drone.path.length,
      totalDistance: missionParams.totalDistance,
      estimatedTime: missionParams.estimatedTime
    });
    if (needTransitToFirst) {
      const transitDist = Math.round(
        calculateDistance(
          drone.position.lat,
          drone.position.lng,
          firstWaypoint[0],
          firstWaypoint[1]
        )
      );
      addToDroneLog(droneId, '📍 Перелёт до первой точки миссии', {
        distance: `${transitDist} м`
      });
    }

    if (alreadyAtFirstPoint) {
      addToDroneLog(droneId, '🛸 Дрон уже в воздухе — начало маршрута');
      setTimeout(() => startFlightMovement(droneId), 0);
    } else {
      setTimeout(() => {
        setDrones(prev =>
          prev.map(d => {
            if (d.id !== droneId) return d;
            return {
              ...d,
              flightStatus: flightStatus.FLYING,
              altitude: 100
            };
          })
        );
        addToDroneLog(droneId, '🛫 Взлет выполнен', { altitude: 100 });
        startFlightMovement(droneId);
      }, 2000);
    }
  }, [drones, selectedDroneForSidebar, isRouteEditMode]);

  const startFlightMovement = (droneId) => {
    const drone = dronesRef.current.find(d => d.id === droneId);
    if (!drone || !drone.missionParameters) return;

    const missionParams = drone.missionParameters;
    let startTime;

    if (drone.missionElapsedTime > 0) {
      startTime = Date.now() - drone.missionElapsedTime;
    } else {
      startTime = Date.now();
    }

    const existingTimer = activeTimersRef.current.get(droneId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const timerId = setInterval(() => {
      const currentDrone = dronesRef.current.find(d => d.id === droneId);
      if (!currentDrone || currentDrone.flightStatus !== flightStatus.FLYING) {
        clearInterval(timerId);
        activeTimersRef.current.delete(droneId);
        return;
      }

      const elapsedTime = Date.now() - startTime;

      if (elapsedTime >= missionParams.totalTime) {
        completeDroneFlight(droneId);
        return;
      }

      let accumulatedTime = 0;
      let currentSegment = 0;

      for (let i = 0; i < missionParams.segmentTimes.length; i++) {
        if (elapsedTime <= accumulatedTime + missionParams.segmentTimes[i]) {
          currentSegment = i;
          break;
        }
        accumulatedTime += missionParams.segmentTimes[i];
      }

      const segmentProgress = (elapsedTime - accumulatedTime) / missionParams.segmentTimes[currentSegment];
      const clampedProgress = Math.min(1, Math.max(0, segmentProgress));

      if (currentSegment === missionParams.segmentTimes.length - 1 && clampedProgress >= 0.99) {
        completeDroneFlight(droneId);
        return;
      }

      const pathForFlight = currentDrone.currentMission?.flightPath ?? currentDrone.path;
      const startPoint = pathForFlight[currentSegment];
      const endPoint = pathForFlight[currentSegment + 1];

      const currentLat = startPoint[0] + (endPoint[0] - startPoint[0]) * clampedProgress;
      const currentLng = startPoint[1] + (endPoint[1] - startPoint[1]) * clampedProgress;

      const segmentCount = pathForFlight.length - 1;
      setDrones(prev =>
        prev.map(d => {
          if (d.id !== droneId) return d;

          const totalProgress = segmentCount > 0
            ? ((currentSegment + clampedProgress) / segmentCount) * 100
            : 100;
          const batteryDrain = (missionParams.batteryConsumption * elapsedTime) / missionParams.totalTime;
          const remainingBattery = Math.max(0, 100 - batteryDrain);

          if (remainingBattery <= 1) {
            addToDroneLog(droneId, '🔋 Критически низкий заряд батареи! Аварийная посадка');
            completeDroneFlight(droneId);
            return d;
          }

          return {
            ...d,
            position: { lat: currentLat, lng: currentLng },
            currentWaypointIndex: currentSegment,
            flightProgress: totalProgress,
            battery: Math.round(remainingBattery),
            heading: calculateBearing(startPoint[0], startPoint[1], endPoint[0], endPoint[1]),
            missionElapsedTime: elapsedTime
          };
        })
      );

    }, 100);

    activeTimersRef.current.set(droneId, timerId);

    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;
        return {
          ...d,
          missionTimerId: timerId
        };
      })
    );
  };

  const completeDroneFlight = (droneId) => {
    const timerId = activeTimersRef.current.get(droneId);
    if (timerId) {
      clearInterval(timerId);
      activeTimersRef.current.delete(droneId);
    }

    const drone = dronesRef.current.find(d => d.id === droneId);
    const isFlyToFirstOnly = drone?.currentMission?.flyToFirstOnly;

    if (isFlyToFirstOnly) {
      const flightPath = drone?.currentMission?.flightPath;
      const lastPoint = flightPath?.length ? flightPath[flightPath.length - 1] : null;
      setDrones(prev =>
        prev.map(d => {
          if (d.id !== droneId) return d;
          return {
            ...d,
            flightStatus: flightStatus.IDLE,
            isFlying: false,
            status: 'на земле',
            speed: 0,
            altitude: 100,
            position: lastPoint ? { lat: lastPoint[0], lng: lastPoint[1] } : d.position,
            currentWaypointIndex: 0,
            flightProgress: 0,
            missionTimerId: null,
            missionStartTime: null,
            missionElapsedTime: 0,
            currentMission: null
          };
        })
      );
      addToDroneLog(droneId, '📍 Дрон завис над первой точкой. Нажмите «Запустить миссию».');
      return;
    }

    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;
        return {
          ...d,
          flightStatus: flightStatus.LANDING,
          speed: 5,
          altitude: 50
        };
      })
    );

    addToDroneLog(droneId, '🛬 Начинается посадка');

    setTimeout(() => {
      setDrones(prev =>
        prev.map(d => {
          if (d.id !== droneId) return d;
          const path = d.currentMission?.flightPath;
          const lastPoint = path?.length ? path[path.length - 1] : null;
          return {
            ...d,
            flightStatus: flightStatus.COMPLETED,
            isFlying: false,
            status: 'на земле',
            speed: 0,
            altitude: 0,
            position: lastPoint ? { lat: lastPoint[0], lng: lastPoint[1] } : d.position,
            currentWaypointIndex: 0,
            flightProgress: 100,
            missionTimerId: null,
            missionStartTime: null,
            missionElapsedTime: 0,
            currentMission: {
              ...d.currentMission,
              endTime: new Date().toISOString(),
              completed: true
            }
          };
        })
      );

      addToDroneLog(droneId, '✅ Миссия завершена успешно');
    }, 3000);
  };

  const stopDroneFlight = (droneId) => {
    const timerId = activeTimersRef.current.get(droneId);
    if (timerId) {
      clearInterval(timerId);
      activeTimersRef.current.delete(droneId);
    }

    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;
        return {
          ...d,
          flightStatus: flightStatus.IDLE,
          isFlying: false,
          status: 'на земле',
          speed: 0,
          altitude: 0,
          missionTimerId: null,
          missionStartTime: null,
          missionElapsedTime: 0,
          flightProgress: 0,
          currentWaypointIndex: 0
        };
      })
    );

    addToDroneLog(droneId, '⏹️ Полёт принудительно остановлен');
  };

  const pauseDroneFlight = (droneId) => {
    const timerId = activeTimersRef.current.get(droneId);
    if (timerId) {
      clearInterval(timerId);
      activeTimersRef.current.delete(droneId);
    }

    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;
        return {
          ...d,
          flightStatus: flightStatus.PAUSED,
          missionTimerId: null
        };
      })
    );

    addToDroneLog(droneId, '⏸️ Полёт приостановлен');
  };

  const resumeDroneFlight = (droneId) => {
    const drone = drones.find(d => d.id === droneId);
    if (drone && drone.flightStatus === flightStatus.PAUSED) {
      setDrones(prev =>
        prev.map(d => {
          if (d.id !== droneId) return d;
          return {
            ...d,
            flightStatus: flightStatus.FLYING
          };
        })
      );

      startFlightMovement(droneId);
      addToDroneLog(droneId, '▶️ Полёт возобновлён');
    }
  };

  const getActiveFlights = () => {
    return drones.filter(d => d.flightStatus === flightStatus.FLYING || d.flightStatus === flightStatus.TAKEOFF);
  };

  const centerMapToFirstWaypoint = useCallback(() => {
    if (selectedDroneForSidebar == null) return;
    const drone = drones.find(d => d.id === selectedDroneForSidebar);
    if (!drone?.path?.length) return;
    const first = drone.path[0];
    setMapCenter([first[0], first[1]]);
  }, [drones, selectedDroneForSidebar]);

  const flyDroneToFirstWaypoint = useCallback((droneId) => {
    const drone = drones.find(d => d.id === droneId);
    if (!drone?.path?.length) {
      return;
    }
    if (drone.flightStatus === flightStatus.FLYING || drone.flightStatus === flightStatus.TAKEOFF || drone.flightStatus === flightStatus.LANDING) {
      return;
    }
    const firstWaypoint = drone.path[0];
    if (!drone.position) {
      setDrones(prev =>
        prev.map(d =>
          d.id !== droneId ? d : { ...d, position: { lat: firstWaypoint[0], lng: firstWaypoint[1] } }
        )
      );
      setMapCenter([firstWaypoint[0], firstWaypoint[1]]);
      addToDroneLog(droneId, '📍 Дрон размещён на первой точке миссии');
      return;
    }
    const distToFirst = calculateDistance(
      drone.position.lat,
      drone.position.lng,
      firstWaypoint[0],
      firstWaypoint[1]
    );
    if (distToFirst <= FIRST_WAYPOINT_TRANSIT_THRESHOLD_M) {
      setDrones(prev =>
        prev.map(d =>
          d.id !== droneId ? d : { ...d, position: { lat: firstWaypoint[0], lng: firstWaypoint[1] } }
        )
      );
      setMapCenter([firstWaypoint[0], firstWaypoint[1]]);
      addToDroneLog(droneId, '📍 Дрон уже у первой точки миссии');
      return;
    }
    const flightPath = [[drone.position.lat, drone.position.lng], [firstWaypoint[0], firstWaypoint[1]]];
    const missionParams = computeMissionParamsFromPath(flightPath, drone.maxSpeed, drone.battery);
    if (!missionParams || drone.battery < missionParams.batteryConsumption + 10) {
      return;
    }
    setMapCenter([firstWaypoint[0], firstWaypoint[1]]);
    setDrones(prev =>
      prev.map(d => {
        if (d.id !== droneId) return d;
        return {
          ...d,
          flightStatus: flightStatus.TAKEOFF,
          isFlying: true,
          currentMission: {
            startTime: new Date().toISOString(),
            totalWaypoints: 1,
            totalDistance: missionParams.totalDistance,
            estimatedTime: missionParams.estimatedTime,
            missionParams,
            flightPath,
            flyToFirstOnly: true
          },
          currentWaypointIndex: 0,
          flightProgress: 0,
          speed: missionParams.optimalSpeed / 3.6,
          altitude: 50,
          heading: 0,
          missionParameters: missionParams,
          missionStartTime: Date.now(),
          missionElapsedTime: 0
        };
      })
    );
    addToDroneLog(droneId, '📍 Перелёт к первой точке миссии', {
      distance: `${Math.round(distToFirst)} м`
    });
    setTimeout(() => {
      setDrones(prev =>
        prev.map(d => {
          if (d.id !== droneId) return d;
          return { ...d, flightStatus: flightStatus.FLYING, altitude: 100 };
        })
      );
      addToDroneLog(droneId, '🛫 Взлёт выполнен');
      startFlightMovement(droneId);
    }, 2000);
  }, [drones]);

  const stopAllFlights = () => {
    drones.forEach(drone => {
      if (drone.isFlying) {
        stopDroneFlight(drone.id);
      }
    });
  };

  useEffect(() => {
    return () => {
      activeTimersRef.current.forEach(timerId => {
        clearInterval(timerId);
      });
      activeTimersRef.current.clear();
    };
  }, []);

  const handleStart = (templateId = null) => {
    setHasStarted(true);
    setTemplateToApplyId(templateId || null);
  };

  const handleDroneClick = (drone) => {
    setSelectedDroneForModal(drone);
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-transparent text-white px-2 sm:px-3 py-2 sm:py-3">

      {/* Backdrop for mobile overlays */}
      {(sidebarOpen || parkingOpen) && (
        <button
          type="button"
          aria-label="Закрыть"
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => { setSidebarOpen(false); setParkingOpen(false); }}
        />
      )}

      <div className="flex flex-1 gap-2 lg:gap-3 min-h-0 overflow-hidden flex-col lg:flex-row">
        {hasStarted && (
          <div
            className={`fixed left-0 top-0 bottom-0 z-50 w-[85%] max-w-sm transform transition-transform duration-300 ease-out lg:relative lg:translate-x-0 lg:w-72 lg:max-w-none lg:flex-shrink-0 ${
              exitingToTemplates ? 'opacity-0 pointer-events-none -translate-x-full' : ''
            } ${parkingOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            style={{
              transitionDuration: exitingToTemplates ? `${EXIT_PANELS_MS}ms` : undefined,
              paddingTop: 'env(safe-area-inset-top, 0px)',
            }}
          >
            <DroneParking
              drones={drones}
              onPlaceDrone={startDronePlacement}
              onRemoveDrone={removeDroneFromMap}
              onBackToTemplates={() => {
                setExitingToTemplates(true);
                setParkingOpen(false);
                setTimeout(() => {
                  setHasStarted(false);
                  setExitingToTemplates(false);
                }, EXIT_PANELS_MS);
              }}
              onClose={() => setParkingOpen(false)}
            />
          </div>
        )}
        <main className="flex-1 bg-transparent p-2 sm:p-3 rounded flex flex-col min-w-0 min-h-0">
          {templateEditMode ? (
            <div className="flex-1 flex flex-col min-h-0 relative">
              <div className="flex-1 min-h-0">
                <YandexMap
                  drones={[]}
                  mapCenter={mapCenter}
                  mapZoom={mapZoom}
                  onMapClick={handleMapClick}
                  editingPath={templateDraftPath}
                  forceResize={false}
                />
              </div>
              <div className="absolute bottom-4 left-4 right-4 z-10 bg-gray-800/95 border border-gray-600 rounded-xl p-4 shadow-xl max-w-md">
                <h3 className="font-semibold text-white mb-2">
                  {templateEditMode === 'create' ? 'Создание шаблона маршрута' : 'Редактирование маршрута'}
                </h3>
                <p className="text-gray-400 text-sm mb-3">
                  Кликайте по карте, чтобы добавить точки маршрута патрулирования.
                </p>
                <p className="text-white/80 text-sm mb-3">Точек: <strong>{templateDraftPath.length}</strong></p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    onClick={undoTemplateDraftPoint}
                    disabled={!templateDraftPath.length}
                    className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
                  >
                    Отменить последнюю
                  </button>
                </div>
                <div className="mb-3">
                  <label className="block text-sm text-gray-400 mb-1">Название шаблона</label>
                  <input
                    type="text"
                    value={templateDraftName}
                    onChange={(e) => setTemplateDraftName(e.target.value)}
                    placeholder="Например: Облёт периметра"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveTemplateDraft}
                    disabled={templateDraftPath.length < 2}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium"
                  >
                    Сохранить шаблон
                  </button>
                  <button
                    type="button"
                    onClick={cancelTemplateEdit}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 relative min-h-0 overflow-hidden">
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all ease-in-out ${
                  hasStarted ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
                style={{ transitionDuration: noTransitionTemplateSwitch ? '0ms' : `${VIEW_TRANSITION_MS}ms` }}
              >
                <ShabloneScreen
                  onStart={handleStart}
                  templates={missionTemplates}
                  onStartCreateTemplate={startCreateTemplate}
                  onEditTemplateRoute={startEditTemplateRoute}
                  onDeleteTemplate={deleteMissionTemplate}
                />
              </div>
              <div
                className={`absolute inset-0 flex flex-col min-h-0 transition-all ease-in-out ${
                  hasStarted && !exitingToTemplates ? 'opacity-100 translate-x-0' : 'opacity-0 pointer-events-none translate-x-full'
                }`}
                style={{ transitionDuration: noTransitionTemplateSwitch ? '0ms' : `${VIEW_TRANSITION_MS}ms` }}
              >
            <div className="w-full flex flex-col gap-2 flex-1 min-h-0">
              {placementMode && droneToPlace && (
                <div className="bg-yellow-900/70 border border-yellow-500 rounded-lg p-3 mb-2 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm text-yellow-200">
                          Кликните на карте, чтобы разместить дрон
                          {(() => {
                            const d = drones.find(d => d.id === droneToPlace);
                            return d ? ` "${d.name}"` : '';
                          })()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={cancelDronePlacement}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
              <div className="flex flex-col md:flex-row gap-2 mb-2 relative z-[1100]">
                <div className="flex-1">
                  <SearchBox
                    setMapCenter={setMapCenter}
                    setMapZoom={setMapZoom}
                  />
                </div>
              </div>
              <div className="flex-1 relative min-h-0">
                <div className="absolute top-2 right-2 z-[100] flex justify-end">
                  <div className="relative">
                    <WeatherWidget
                      latitude={mapCenter[0]}
                      longitude={mapCenter[1]}
                      onFlightConditionsChange={handleWeatherFlightConditions}
                    />
                  </div>
                </div>
                <YandexMap
                  drones={drones.filter(d => d.isVisible)}
                  mapCenter={mapCenter}
                  mapZoom={mapZoom}
                  onMapClick={handleMapClick}
                  onMapCenterChange={setMapCenter}
                  selectedDroneId={selectedDroneForSidebar}
                  forceResize={true}
                  routeEditMode={isRouteEditMode}
                  previewPath={templateToApplyId ? (missionTemplates.find(t => t.id === templateToApplyId)?.path) ?? null : null}
                />
              </div>

              {/* Кнопки управления под картой (мобильные), в потоке — карта сжимается */}
              <div
                className="flex-shrink-0 flex justify-between items-center gap-2 lg:hidden pt-2"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0.5rem)' }}
              >
                <button
                  type="button"
                  onClick={() => { setParkingOpen(true); setSidebarOpen(false); }}
                  className="min-h-[48px] flex-1 min-w-0 px-3 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-xl shadow-lg text-white font-medium flex items-center justify-center gap-1.5"
                >
                  <span>🛸</span>
                  <span>Стоянка</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExitingToTemplates(true);
                    setParkingOpen(false);
                    setSidebarOpen(false);
                    setTimeout(() => {
                      setHasStarted(false);
                      setExitingToTemplates(false);
                    }, EXIT_PANELS_MS);
                  }}
                  className="min-h-[48px] flex-1 min-w-0 px-3 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl shadow-lg text-white font-medium flex items-center justify-center gap-1.5"
                >
                  <span>←</span>
                  <span className="truncate">К шаблонам</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setSidebarOpen(true); setParkingOpen(false); }}
                  className="min-h-[48px] flex-1 min-w-0 px-3 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg text-white font-medium flex items-center justify-center gap-1.5"
                >
                  <span>⚙️</span>
                  <span>Панель</span>
                </button>
              </div>
            </div>
              </div>
            </div>
          )}
        </main>

        {hasStarted && (
          <div
            className={`fixed right-0 top-0 bottom-0 z-50 w-[85%] max-w-sm transform transition-transform duration-300 ease-out lg:relative lg:translate-x-0 lg:w-80 lg:max-w-none lg:flex-shrink-0 ${
              exitingToTemplates ? 'opacity-0 pointer-events-none translate-x-full' : ''
            } ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
            style={{
              transitionDuration: exitingToTemplates ? `${EXIT_PANELS_MS}ms` : undefined,
              paddingTop: 'env(safe-area-inset-top, 0px)',
            }}
          >
            <Sidebar
              dronesData={drones}
              selectedDroneId={selectedDroneForSidebar}
              onSelectDrone={setSelectedDroneForSidebar}
              missionLog={globalMissionLog}
              activeFlights={getActiveFlights()}
              onStartFlight={startDroneFlight}
              onPauseFlight={pauseDroneFlight}
              onResumeFlight={resumeDroneFlight}
              onStopFlight={stopDroneFlight}
              onStopAllFlights={stopAllFlights}
              onAddRoutePoint={addRoutePoint}
              onUndoLastPoint={undoLastPoint}
              onClearRoute={clearRoute}
              onClearLogs={() => setGlobalMissionLog([])}
              onDroneClick={handleDroneClick}
              isRouteEditMode={isRouteEditMode}
              onToggleRouteMode={() => setIsRouteEditMode(prev => !prev)}
              onCenterToFirstWaypoint={centerMapToFirstWaypoint}
              onFlyToFirstWaypoint={flyDroneToFirstWaypoint}
              flightAllowedByWeather={weatherFlightSafe}
              weatherFlightReasons={weatherFlightReasons}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}
      </div>

      {selectedDroneForModal && (
        <DroneModal
          drone={selectedDroneForModal}
          onClose={() => setSelectedDroneForModal(null)}
        />
      )}

      {false && hasStarted && (
        <footer
          className={`mt-2 bg-gradient-to-r from-gray-700 to-gray-800 p-3 rounded text-center text-white transition-all ease-in-out ${
            exitingToTemplates ? 'opacity-0 pointer-events-none translate-y-2' : 'opacity-100 translate-y-0'
          }`}
          style={{ transitionDuration: exitingToTemplates ? `${EXIT_PANELS_MS}ms` : `${VIEW_TRANSITION_MS}ms` }}
        >
          <div className="md:flex-row justify-between items-center">
            <div>
              © 2026 Система управления дронами.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;