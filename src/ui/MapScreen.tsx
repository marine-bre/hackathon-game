import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../lib/gameStore';
import { MAPTILER_API_KEY } from '../private/apiKeys';
import MapScreenOverlay from './MapScreenOverlay';

const TEL_AVIV_CENTER = [31.0853, 34.7818];
const ZOOM = 14.3;

const TEL_AVIV_BOUNDS = [
  [32.078, 34.77], // southWest (lat, lng)
  [32.09, 34.785], // northEast (lat, lng)
];

const AREA_TO_MINIGAME: Record<string, string> = {
  Florentin: 'Florentin',
  oldNorth: 'Old North',
  Kerem: 'Kerem',
  'Park Hamesila': 'parkHaMesilah',
  'Kiryat Hamemshala': 'Kiryat Hamemshala',
  Rothschild: 'rothschild',
  "Neve Sha'anan": 'tahanaMerkazit',
  tayelet: 'tayelet',
  memadion: 'memadion',
};

export function MapScreen() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const setSelectedNeighborhood = useGameStore((s) => s.setSelectedNeighborhood);
  const setGameState = useGameStore((s) => s.setGameState);
  const setSelectedMinigame = useGameStore((s) => s.setSelectedMinigame);
  const completedNeighborhoods = useGameStore((s) => s.completedNeighborhoods);
  const selectedCharacter = useGameStore((s) => s.selectedCharacter);
  const gameState = useGameStore((s) => s.gameState);
  const [avatarAnim, setAvatarAnim] = useState<{
    from: [number, number] | null;
    to: [number, number] | null;
    progress: number;
  }>({ from: null, to: null, progress: 0 });
  const lastNeighborhoodRef = useRef<string | null>(null);
  const avatarAnimRef = useRef<number | null>(null);
  const [avatarPos, setAvatarPos] = useState<{ x: number; y: number } | null>(null);

  // Pulse animation CSS
  useEffect(() => {
    if (!document.getElementById('pulse-polygon-style')) {
      const style = document.createElement('style');
      style.id = 'pulse-polygon-style';
      style.innerHTML = `
        @keyframes polygonPulse {
          0% { filter: drop-shadow(0 0 0px #3388ff88); }
          50% { filter: drop-shadow(0 0 12px #3388ffcc); }
          100% { filter: drop-shadow(0 0 0px #3388ff88); }
        }
        .pulse-polygon {
          animation: polygonPulse 1.5s infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Animate avatar on transition
  useEffect(() => {
    if (gameState !== 'transition' || !selectedCharacter) {
      setAvatarPos(null);
      setAvatarAnim({ from: null, to: null, progress: 0 });
      if (avatarAnimRef.current) cancelAnimationFrame(avatarAnimRef.current);
      return;
    }
    // Find centroids for last and current neighborhoods
    fetch('/tel_aviv_neighborhoods.geojson')
      .then((res) => res.json())
      .then((geojson) => {
        const getCentroid = (name: string | null): [number, number] | null => {
          if (!name) return null;
          const feature = geojson.features.find((f: any) => f.properties?.name === name);
          if (!feature || feature.geometry.type !== 'Polygon') return null;
          const coords = feature.geometry.coordinates[0];
          const n = coords.length;
          let x = 0,
            y = 0;
          coords.forEach(([lng, lat]: [number, number]) => {
            x += lng;
            y += lat;
          });
          return [y / n, x / n]; // [lat, lng]
        };
        const from = getCentroid(lastNeighborhoodRef.current);
        const to = getCentroid(useGameStore.getState().selectedNeighborhood as string);
        if (!from || !to) return;
        setAvatarAnim({ from, to, progress: 0 });
        let start: number | null = null;
        function animate(ts: number) {
          if (!start) start = ts;
          const duration = 900;
          const progress = Math.min((ts - start) / duration, 1);
          setAvatarAnim((prev) => ({ ...prev, progress }));
          if (progress < 1) {
            avatarAnimRef.current = requestAnimationFrame(animate);
          }
        }
        avatarAnimRef.current = requestAnimationFrame(animate);
      });
    return () => {
      if (avatarAnimRef.current) cancelAnimationFrame(avatarAnimRef.current);
    };
  }, [gameState, selectedCharacter]);

  // Update lastNeighborhoodRef on minigame win/lose
  useEffect(() => {
    if (gameState === 'map' && useGameStore.getState().selectedNeighborhood) {
      lastNeighborhoodRef.current = useGameStore.getState().selectedNeighborhood;
    }
  }, [gameState]);

  // Map rendering and overlays
  useEffect(() => {
    let isMounted = true;
    // Load Leaflet CSS
    const leafletCss = document.createElement('link');
    leafletCss.rel = 'stylesheet';
    leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCss);

    // Load Leaflet JS
    const leafletScript = document.createElement('script');
    leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletScript.async = true;
    leafletScript.onload = () => {
      // @ts-expect-error: Leaflet is loaded globally from CDN
      const L = window.L;
      if (!L || !mapRef.current || !isMounted) return;
      // Remove any previous map instance
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
      // Defensive: Only initialize if mapRef.current is still in the DOM
      if (!mapRef.current) return;
      const map = L.map(mapRef.current, {
        center: TEL_AVIV_CENTER,
        zoom: ZOOM,
        maxBounds: TEL_AVIV_BOUNDS,
        maxBoundsViscosity: 1.0,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomControl: false,
        attributionControl: true,
      });
      mapInstanceRef.current = map;
      L.tileLayer(
        `https://api.maptiler.com/maps/basic/256/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`,
        {
          attribution:
            '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }
      ).addTo(map);
      // Load GeoJSON
      fetch('/tel_aviv_neighborhoods.geojson')
        .then((res) => res.json())
        .then((geojson) => {
          if (!isMounted) return;

          // Color map for neighborhoods (high-contrast, varied)
          const AREA_COLORS: Record<string, string> = {
            Florentin: '#FF6B6B', // Vibrant Red
            oldNorth: '#4ECDC4', // Teal
            Kerem: '#FFD93D', // Bright Yellow
            'Park Hamesila': '#1A936F', // Deep Green
            Kaplan: '#FF6F91', // Pink
            Rothschild: '#845EC2', // Purple
            "Neve Sha'anan": '#FF9671', // Orange
            tayelet: '#0081CF', // Blue
            'Neve Tzedek': '#FFC75F', // Gold
            memadion: '#B0A8B9', // Gray
          };

          function style(feature?: { properties?: { name?: string } }) {
            const areaName = feature?.properties?.name;
            const isCompleted = areaName
              ? completedNeighborhoods.includes(areaName as import('../lib/gameStore').Neighborhood)
              : false;
            if (isCompleted) {
              return {
                color: '#bbb',
                weight: 2,
                fillColor: 'transparent',
                fillOpacity: 0,
                dashArray: '4 2',
                className: '',
              };
            }
            return {
              color: '#3388ff',
              weight: 2,
              fillColor: areaName && AREA_COLORS[areaName] ? AREA_COLORS[areaName] : '#e0e7ef',
              fillOpacity: 0.45,
              className: 'pulse-polygon',
            };
          }

          function highlight(e: unknown) {
            const areaName = (e as { target: { feature?: { properties?: { name?: string } } } })
              .target.feature?.properties?.name;
            const isCompleted = areaName
              ? completedNeighborhoods.includes(areaName as import('../lib/gameStore').Neighborhood)
              : false;
            if (isCompleted) return;
            (e as { target: { setStyle: (opts: unknown) => void } }).target.setStyle({
              weight: 4,
              color: '#1976d2',
            });
          }

          function reset(e: unknown) {
            const areaName = (e as { target: { feature?: { properties?: { name?: string } } } })
              .target.feature?.properties?.name;
            const isCompleted = areaName
              ? completedNeighborhoods.includes(areaName as import('../lib/gameStore').Neighborhood)
              : false;
            if (isCompleted) {
              (e as { target: { setStyle: (opts: unknown) => void } }).target.setStyle({
                weight: 2,
                color: '#bbb',
                dashArray: '4 2',
              });
            } else {
              (e as { target: { setStyle: (opts: unknown) => void } }).target.setStyle({
                weight: 2,
                color: '#3388ff',
              });
            }
          }

          function onEachFeature(
            feature: { properties?: { name?: string } },
            layer: {
              bindTooltip?: (name: string, opts: { sticky: boolean }) => void;
              on: (handlers: Record<string, (e: unknown) => void>) => void;
            }
          ) {
            const areaName = feature?.properties?.name;
            const isCompleted = areaName
              ? completedNeighborhoods.includes(areaName as import('../lib/gameStore').Neighborhood)
              : false;
            if (feature.properties && feature.properties.name && layer.bindTooltip) {
              layer.bindTooltip(feature.properties.name, { sticky: true });
            }
            if (!isCompleted) {
              layer.on({
                mouseover: highlight,
                mouseout: reset,
                click: () => {
                  const validNeighborhoods = [
                    'Florentin',
                    'oldNorth',
                    'Kerem',
                    'Park Hamesila',
                    'Kiryat Hamemshala',
                    'Rothschild',
                    "Neve Sha'anan",
                    'tayelet',
                    'Neve Tzedek',
                    'memadion',
                  ];
                  if (
                    areaName &&
                    AREA_TO_MINIGAME[areaName] &&
                    validNeighborhoods.includes(areaName)
                  ) {
                    setSelectedNeighborhood(areaName as import('../lib/gameStore').Neighborhood);
                    setSelectedMinigame(AREA_TO_MINIGAME[areaName]);
                    setGameState('transition');
                  } else {
                    alert(`No minigame mapped for ${areaName || 'this area'}`);
                  }
                },
              });
            }
          }

          L.geoJSON(geojson, {
            style,
            onEachFeature,
          }).addTo(map);

          // --- Add completion star markers at centroids ---
          const starMarkers: unknown[] = [];
          geojson.features.forEach((feature: any) => {
            const areaName = feature?.properties?.name;
            const isCompleted = areaName
              ? completedNeighborhoods.includes(areaName as import('../lib/gameStore').Neighborhood)
              : false;
            if (isCompleted && feature.geometry.type === 'Polygon') {
              // Compute centroid
              const coords = feature.geometry.coordinates[0];
              const n = coords.length;
              let x = 0,
                y = 0;
              coords.forEach(([lng, lat]: [number, number]) => {
                x += lng;
                y += lat;
              });
              const centroid = [y / n, x / n]; // [lat, lng]
              // Add marker
              const marker = L.marker(centroid, {
                icon: L.divIcon({
                  className: 'completed-star-marker',
                  html: '<span style="font-size:32px;">⭐️</span>',
                  iconSize: [32, 32],
                  iconAnchor: [16, 16],
                }),
                interactive: false,
              }).addTo(map);
              starMarkers.push(marker);
            }
          });
          // Attach starMarkers to mapInstanceRef for cleanup
          (mapInstanceRef.current as { _starMarkers?: unknown[] })._starMarkers = starMarkers;
        });
    };
    document.body.appendChild(leafletScript);
    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        // Remove star markers if present
        if ((mapInstanceRef.current as { _starMarkers?: unknown[] })._starMarkers) {
          (
            (mapInstanceRef.current as { _starMarkers?: unknown[] })._starMarkers as {
              remove: () => void;
            }[]
          ).forEach((m) => m.remove());
        }
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
      document.head.removeChild(leafletCss);
      document.body.removeChild(leafletScript);
    };
  }, [setSelectedNeighborhood, setGameState, setSelectedMinigame, completedNeighborhoods]);

  // Calculate avatar position for animation
  useEffect(() => {
    if (!avatarAnim.from || !avatarAnim.to) return;
    if (avatarAnim.progress >= 1) {
      setAvatarPos(null);
      return;
    }
    // Interpolate between from and to
    const lat = avatarAnim.from[0] + (avatarAnim.to[0] - avatarAnim.from[0]) * avatarAnim.progress;
    const lng = avatarAnim.from[1] + (avatarAnim.to[1] - avatarAnim.from[1]) * avatarAnim.progress;
    // Convert lat/lng to screen position
    // Use Leaflet's map projection if available
    if (mapRef.current && (window as any).L && mapInstanceRef.current) {
      const map = mapInstanceRef.current as any;
      const point = map.latLngToContainerPoint([lat, lng]);
      setAvatarPos({ x: point.x, y: point.y });
    }
  }, [avatarAnim]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div
        ref={mapRef}
        style={{
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          zIndex: 1,
        }}
      />
      <MapScreenOverlay
        completedNeighborhoods={completedNeighborhoods}
        selectedCharacter={selectedCharacter}
        gameState={gameState}
      />
      {/* Animated avatar overlay */}
      {gameState === 'transition' && selectedCharacter && avatarPos && (
        <img
          src={
            selectedCharacter === 'nimrod'
              ? '/HIP.PNG'
              : selectedCharacter === 'liat'
                ? '/POSH.png'
                : selectedCharacter === 'reuven'
                  ? '/YEMANI.PNG'
                  : selectedCharacter === 'josef'
                    ? '/NEVORISH.png'
                    : '/MOM.png'
          }
          alt="Character avatar"
          style={{
            position: 'absolute',
            left: avatarPos.x - 60,
            top: avatarPos.y - 60,
            width: 120,
            height: 120,
            objectFit: 'contain',
            borderRadius: '50%',
            border: '4px solid #fff',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            zIndex: 30,
            pointerEvents: 'none',
            transition: 'left 0.1s linear, top 0.1s linear',
          }}
        />
      )}
    </div>
  );
}
