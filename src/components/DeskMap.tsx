'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  AttributionControl,
  GeoJSONSource,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ALERT_MATCH_LABELS, type AlertCardData } from '@/lib/alerts';
import {
  MAP_ATTRIBUTION,
  MAP_CENTER_EPSILON,
  MAP_DEFAULT_ZOOM,
  MAP_FLY_DURATION_MS,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_RADAR_TILE_URL,
  MAP_STYLE_URL,
  RADAR_ATTRIBUTION,
  toMapCenter,
  type MapCoordinates,
  type MapStation,
} from '@/lib/map/config';
import {
  MAP_ALERT_FILL_LAYER_ID,
  MAP_ALERT_LINE_LAYER_ID,
  MAP_ALERT_SOURCE_ID,
  MAP_RADAR_LAYER_ID,
  MAP_RADAR_SOURCE_ID,
  MAP_STATION_COLOR,
  MAP_STATION_LAYER_ID,
  MAP_STATION_SOURCE_ID,
  buildAlertFeatureCollection,
  buildStationFeatureCollection,
} from '@/lib/map/overlays';

export interface DeskMapProps extends MapCoordinates {
  /** Display label for the selected location. */
  label?: string;
  /** Active alerts; only polygon-based alerts create map features. */
  alerts?: ReadonlyArray<AlertCardData>;
  /** Nearby observation stations rendered as points. */
  stations?: ReadonlyArray<MapStation>;
}

type MapStatus = 'loading' | 'ready' | 'error';

const EMPTY_ALERTS: ReadonlyArray<AlertCardData> = [];
const EMPTY_STATIONS: ReadonlyArray<MapStation> = [];

/**
 * MapLibre v6 derives its default worker URL from `import.meta.url`. Next's
 * webpack build rewrites that to a `file://` path, which browsers cannot load,
 * so the worker is copied from the package into `public/` before dev/build and
 * referenced by its stable public path here.
 */
setWorkerUrl('/maplibre-gl-worker.mjs');

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Interactive MapLibre canvas for the desk screen.
 *
 * The map is created once and reused across location changes: the marker moves
 * and the camera flies (or jumps when motion is reduced) instead of rebuilding
 * the WebGL context. Construction and pre-load style failures fall back to a
 * readable message so the rest of the dashboard stays usable.
 */
export function DeskMap({
  latitude,
  longitude,
  label = 'selected location',
  alerts = EMPTY_ALERTS,
  stations = EMPTY_STATIONS,
}: DeskMapProps) {
  const descriptionId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const hasLoadedRef = useRef(false);
  const positionRef = useRef<MapCoordinates>({ latitude, longitude });
  const labelRef = useRef(label);
  const [status, setStatus] = useState<MapStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    positionRef.current = { latitude, longitude };
    labelRef.current = label;
  }, [latitude, longitude, label]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    hasLoadedRef.current = false;
    setStatus('loading');

    let map: MapLibreMap;
    try {
      map = new MapLibreMap({
        container,
        style: MAP_STYLE_URL,
        center: toMapCenter(positionRef.current),
        zoom: MAP_DEFAULT_ZOOM,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        renderWorldCopies: false,
      });
    } catch {
      setStatus('error');
      return;
    }

    mapRef.current = map;

    const markerElement = document.createElement('div');
    markerElement.className = 'desk-map-marker';
    markerElement.setAttribute('role', 'img');
    markerElement.setAttribute('aria-label', `Selected location: ${labelRef.current}`);
    map
      .getCanvas()
      .setAttribute(
        'aria-label',
        `Interactive weather map centered on ${labelRef.current}. Use the zoom controls to change the map scale.`,
      );

    const marker = new Marker({ element: markerElement, anchor: 'center' })
      .setLngLat(toMapCenter(positionRef.current))
      .addTo(map);
    markerRef.current = marker;

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new ScaleControl({ maxWidth: 120, unit: 'imperial' }), 'bottom-left');
    map.addControl(
      new AttributionControl({ compact: true, customAttribution: MAP_ATTRIBUTION }),
      'bottom-right',
    );

    const handleLoad = () => {
      hasLoadedRef.current = true;
      setStatus('ready');
    };
    const handleError = () => {
      // Tile errors after a successful load should not replace a usable map.
      if (!hasLoadedRef.current) setStatus('error');
    };

    map.on('load', handleLoad);
    map.on('error', handleError);

    return () => {
      map.off('load', handleLoad);
      map.off('error', handleError);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map) return;

    const center = toMapCenter({ latitude, longitude });
    marker?.setLngLat(center);
    marker?.getElement().setAttribute('aria-label', `Selected location: ${label}`);
    map
      .getCanvas()
      .setAttribute(
        'aria-label',
        `Interactive weather map centered on ${label}. Use the zoom controls to change the map scale.`,
      );
    const currentCenter = map.getCenter();
    const moved =
      Math.abs(currentCenter.lng - longitude) > MAP_CENTER_EPSILON ||
      Math.abs(currentCenter.lat - latitude) > MAP_CENTER_EPSILON;
    if (!moved) return;

    if (prefersReducedMotion()) {
      map.jumpTo({ center, zoom: MAP_DEFAULT_ZOOM });
    } else {
      map.flyTo({
        center,
        zoom: MAP_DEFAULT_ZOOM,
        duration: MAP_FLY_DURATION_MS,
        essential: true,
      });
    }
  }, [latitude, longitude, label]);

  useEffect(() => {
    if (status !== 'ready') return;

    const map = mapRef.current;
    if (!map) return;

    // Base reflectivity sits beneath overlays so polygons/stations stay legible.
    if (!map.getSource(MAP_RADAR_SOURCE_ID)) {
      map.addSource(MAP_RADAR_SOURCE_ID, {
        type: 'raster',
        tiles: [MAP_RADAR_TILE_URL],
        tileSize: 256,
        attribution: RADAR_ATTRIBUTION,
        maxzoom: 10,
      });
    }

    if (!map.getLayer(MAP_RADAR_LAYER_ID)) {
      map.addLayer(
        {
          id: MAP_RADAR_LAYER_ID,
          type: 'raster',
          source: MAP_RADAR_SOURCE_ID,
          paint: {
            'raster-opacity': 0.6,
            'raster-fade-duration': 300,
          },
        },
        MAP_ALERT_FILL_LAYER_ID,
      );
    }

    const alertData = buildAlertFeatureCollection(alerts);
    const alertSource = map.getSource(MAP_ALERT_SOURCE_ID) as GeoJSONSource | undefined;
    if (alertSource) {
      alertSource.setData(alertData);
    } else {
      map.addSource(MAP_ALERT_SOURCE_ID, { type: 'geojson', data: alertData });
    }

    if (!map.getLayer(MAP_ALERT_FILL_LAYER_ID)) {
      map.addLayer({
        id: MAP_ALERT_FILL_LAYER_ID,
        type: 'fill',
        source: MAP_ALERT_SOURCE_ID,
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.18,
        },
      });
    }

    if (!map.getLayer(MAP_ALERT_LINE_LAYER_ID)) {
      map.addLayer({
        id: MAP_ALERT_LINE_LAYER_ID,
        type: 'line',
        source: MAP_ALERT_SOURCE_ID,
        paint: {
          'line-color': ['get', 'color'],
          'line-opacity': 0.9,
          'line-width': 1.5,
        },
      });
    }

    const stationData = buildStationFeatureCollection(stations);
    const stationSource = map.getSource(MAP_STATION_SOURCE_ID) as GeoJSONSource | undefined;
    if (stationSource) {
      stationSource.setData(stationData);
    } else {
      map.addSource(MAP_STATION_SOURCE_ID, { type: 'geojson', data: stationData });
    }

    if (!map.getLayer(MAP_STATION_LAYER_ID)) {
      map.addLayer({
        id: MAP_STATION_LAYER_ID,
        type: 'circle',
        source: MAP_STATION_SOURCE_ID,
        paint: {
          'circle-radius': 4,
          'circle-color': MAP_STATION_COLOR,
          'circle-stroke-color': '#05060d',
          'circle-stroke-width': 1.5,
        },
      });
    }
  }, [alerts, stations, status]);

  // Only polygon alerts have a map footprint; area-based alerts stay in the sidebar.
  const polygonAlertCount = alerts.filter((alert) => alert.polygon !== null).length;
  const alertSummary =
    polygonAlertCount === 1
      ? '1 active alert polygon'
      : `${polygonAlertCount} active alert polygons`;
  const stationSummary =
    stations.length === 1 ? '1 observation station' : `${stations.length} observation stations`;

  const stateClass = status === 'error' ? 'desk-map desk-map--error' : 'desk-map';

  return (
    <section
      aria-describedby={descriptionId}
      aria-label={`Weather map for ${label}`}
      className={stateClass}
      data-status={status}
    >
      <div className="desk-map-canvas" ref={containerRef} />

      <p className="sr-only" id={descriptionId}>
        {`Interactive map centered on ${label}. Base reflectivity radar, ${alertSummary}, and ${stationSummary} shown. Drag to pan, use the zoom controls to change the scale, and read the attribution for basemap sources.`}
      </p>

      <ul className="sr-only">
        {alerts.map((alert) => (
          <li key={alert.id}>
            {`${alert.event}: ${alert.severityLabel} severity, ${ALERT_MATCH_LABELS[alert.match]}`}
          </li>
        ))}
        {stations.map((station) => (
          <li key={station.id}>
            {station.name
              ? `Observation station ${station.name} (${station.id})`
              : `Observation station ${station.id}`}
          </li>
        ))}
      </ul>

      {status === 'ready' && polygonAlertCount + stations.length > 0 ? (
        <div aria-hidden="true" className="desk-map-legend" data-testid="map-overlay-summary">
          {polygonAlertCount > 0 ? (
            <span>{polygonAlertCount === 1 ? '1 alert' : `${polygonAlertCount} alerts`}</span>
          ) : null}
          {stations.length > 0 ? (
            <span>{stations.length === 1 ? '1 station' : `${stations.length} stations`}</span>
          ) : null}
        </div>
      ) : null}

      {status === 'loading' ? (
        <div className="desk-map-overlay" role="status">
          <p>Loading map…</p>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="desk-map-overlay desk-map-overlay--error" role="alert">
          <p className="desk-map-overlay-title">Map unavailable</p>
          <p>The interactive map could not be loaded. Weather data in the sidebar is unaffected.</p>
          <button
            className="app-button"
            onClick={() => setAttempt((value) => value + 1)}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default DeskMap;
