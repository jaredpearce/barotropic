import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AlertCardData } from '@/lib/alerts';
import { DeskMap } from './DeskMap';
import {
  MAP_DEFAULT_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  OPENFREEMAP_DARK_STYLE_URL,
} from '@/lib/map/config';
import {
  MAP_ALERT_FILL_LAYER_ID,
  MAP_ALERT_LINE_LAYER_ID,
  MAP_ALERT_SOURCE_ID,
  MAP_STATION_LAYER_ID,
  MAP_STATION_SOURCE_ID,
} from '@/lib/map/overlays';

const mocks = vi.hoisted(() => {
  type Handler = () => void;

  class FakeMap {
    static instances: FakeMap[] = [];
    static failNext = false;

    readonly options: Record<string, unknown>;
    readonly handlers = new Map<string, Handler[]>();
    readonly controls: Array<{ control: unknown; position?: string }> = [];
    readonly sources = new Map<string, { data: unknown; setData: ReturnType<typeof vi.fn> }>();
    readonly layers = new Map<string, Record<string, unknown>>();
    readonly canvas = document.createElement('canvas');
    center: { lng: number; lat: number };
    removed = false;
    flyTo = vi.fn();
    jumpTo = vi.fn();

    constructor(options: Record<string, unknown>) {
      if (FakeMap.failNext) {
        FakeMap.failNext = false;
        throw new Error('WebGL is unavailable');
      }

      this.options = options;
      const center = options.center as [number, number];
      this.center = { lng: center[0], lat: center[1] };
      FakeMap.instances.push(this);
    }

    on(event: string, handler: Handler) {
      const handlers = this.handlers.get(event) ?? [];
      handlers.push(handler);
      this.handlers.set(event, handlers);
      return this;
    }

    off(event: string, handler: Handler) {
      this.handlers.set(
        event,
        (this.handlers.get(event) ?? []).filter((candidate) => candidate !== handler),
      );
      return this;
    }

    emit(event: string) {
      for (const handler of this.handlers.get(event) ?? []) handler();
    }

    addControl(control: unknown, position?: string) {
      this.controls.push({ control, position });
      return this;
    }

    addSource(id: string, specification: { data?: unknown }) {
      const source = {
        data: specification.data,
        setData: vi.fn((data: unknown) => {
          source.data = data;
        }),
      };
      this.sources.set(id, source);
      return this;
    }

    getSource(id: string) {
      return this.sources.get(id);
    }

    addLayer(layer: Record<string, unknown>) {
      this.layers.set(layer.id as string, layer);
      return this;
    }

    getLayer(id: string) {
      return this.layers.get(id);
    }

    getCenter() {
      return this.center;
    }

    getCanvas() {
      return this.canvas;
    }

    remove() {
      this.removed = true;
    }
  }

  class FakeMarker {
    static instances: FakeMarker[] = [];

    readonly element: HTMLElement;
    lngLat: [number, number] | null = null;

    constructor(options: { element: HTMLElement }) {
      this.element = options.element;
      FakeMarker.instances.push(this);
    }

    setLngLat(coordinates: [number, number]) {
      this.lngLat = coordinates;
      return this;
    }

    addTo() {
      return this;
    }

    getElement() {
      return this.element;
    }
  }

  class FakeControl {
    constructor(readonly options: unknown) {}
  }

  return { FakeMap, FakeMarker, FakeControl };
});

vi.mock('maplibre-gl', () => ({
  Map: mocks.FakeMap,
  Marker: mocks.FakeMarker,
  NavigationControl: mocks.FakeControl,
  ScaleControl: mocks.FakeControl,
  AttributionControl: mocks.FakeControl,
  setWorkerUrl: vi.fn(),
}));

const CARY = { latitude: 35.7915, longitude: -78.7811, label: 'Cary, NC' };
const SEATTLE = { latitude: 47.6062, longitude: -122.3321, label: 'Seattle, Washington' };

const POLYGON_ALERT: AlertCardData = {
  id: 'alert-1',
  event: 'Heat Advisory',
  severity: 'extreme',
  severityLabel: 'Extreme',
  match: 'polygon',
  geometry: { kind: 'polygon', polygonCount: 1, paths: [] },
  polygon: {
    type: 'Polygon',
    coordinates: [
      [
        [-79, 35],
        [-78, 35],
        [-78, 36],
        [-79, 36],
        [-79, 35],
      ],
    ],
  },
  retrievedAt: '2026-11-03T12:00:00Z',
};

const AREA_ALERT: AlertCardData = {
  ...POLYGON_ALERT,
  id: 'alert-area',
  event: 'Flood Watch',
  match: 'area',
  geometry: { kind: 'area', polygonCount: 0, paths: [] },
  polygon: null,
};

const STATIONS = [
  { id: 'KRDU', name: 'Raleigh-Durham International Airport', latitude: 35.89, longitude: -78.79 },
  { id: 'KJNX', name: 'Johnston Regional Airport', latitude: 35.54, longitude: -78.39 },
];

function lastMap() {
  const map = mocks.FakeMap.instances.at(-1);
  if (!map) throw new Error('Expected a map instance');
  return map;
}

beforeEach(() => {
  mocks.FakeMap.instances.length = 0;
  mocks.FakeMap.failNext = false;
  mocks.FakeMarker.instances.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DeskMap integration', () => {
  it('Use Case: creates the dark basemap at the selected location with map controls', () => {
    const { unmount } = render(<DeskMap {...CARY} />);

    const map = lastMap();
    expect(map.options).toMatchObject({
      style: OPENFREEMAP_DARK_STYLE_URL,
      center: [-78.7811, 35.7915],
      zoom: MAP_DEFAULT_ZOOM,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      attributionControl: false,
      dragRotate: false,
    });
    expect(map.controls).toHaveLength(3);
    expect(map.controls.map((entry) => entry.position)).toEqual([
      'top-right',
      'bottom-left',
      'bottom-right',
    ]);

    expect(screen.getByRole('region', { name: 'Weather map for Cary, NC' })).toHaveAttribute(
      'data-status',
      'loading',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading map');

    const marker = mocks.FakeMarker.instances[0];
    expect(marker.lngLat).toEqual([-78.7811, 35.7915]);
    expect(marker.element).toHaveAttribute('role', 'img');
    expect(marker.element).toHaveAttribute('aria-label', 'Selected location: Cary, NC');
    expect(marker.element).toHaveClass('desk-map-marker');
    expect(map.canvas.getAttribute('aria-label')).toContain('Cary, NC');

    unmount();
    expect(map.removed).toBe(true);
  });

  it('Use Case: hides the loading state after the style and tiles load', () => {
    render(<DeskMap {...CARY} />);
    const map = lastMap();

    act(() => map.emit('load'));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Weather map for Cary, NC' })).toHaveAttribute(
      'data-status',
      'ready',
    );
  });

  it('Use Case: falls back with a retry action when construction fails', async () => {
    const user = userEvent.setup();
    mocks.FakeMap.failNext = true;

    render(<DeskMap {...CARY} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Map unavailable');

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(mocks.FakeMap.instances).toHaveLength(1);
    expect(screen.getByRole('region', { name: 'Weather map for Cary, NC' })).toHaveAttribute(
      'data-status',
      'loading',
    );
  });

  it('Use Case: falls back when the style fails before the first load', () => {
    render(<DeskMap {...CARY} />);
    const map = lastMap();

    act(() => map.emit('error'));

    expect(screen.getByRole('alert')).toHaveTextContent('Map unavailable');
    expect(screen.getByRole('region', { name: 'Weather map for Cary, NC' })).toHaveAttribute(
      'data-status',
      'error',
    );
  });

  it('Use Case: keeps a loaded map usable when a later tile request fails', () => {
    render(<DeskMap {...CARY} />);
    const map = lastMap();

    act(() => map.emit('load'));
    act(() => map.emit('error'));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Weather map for Cary, NC' })).toHaveAttribute(
      'data-status',
      'ready',
    );
  });

  it('Use Case: moves the marker and flies to a newly selected location', () => {
    const { rerender } = render(<DeskMap {...CARY} />);
    const map = lastMap();
    const marker = mocks.FakeMarker.instances[0];

    rerender(<DeskMap {...SEATTLE} />);

    expect(marker.lngLat).toEqual([-122.3321, 47.6062]);
    expect(marker.element).toHaveAttribute('aria-label', 'Selected location: Seattle, Washington');
    expect(map.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [-122.3321, 47.6062],
        zoom: MAP_DEFAULT_ZOOM,
        essential: true,
      }),
    );
    expect(map.jumpTo).not.toHaveBeenCalled();
    expect(mocks.FakeMap.instances).toHaveLength(1);
  });

  it('Use Case: jumps instead of flying when the user prefers reduced motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );

    const { rerender } = render(<DeskMap {...CARY} />);
    const map = lastMap();

    rerender(<DeskMap {...SEATTLE} />);

    expect(map.jumpTo).toHaveBeenCalledWith({
      center: [-122.3321, 47.6062],
      zoom: MAP_DEFAULT_ZOOM,
    });
    expect(map.flyTo).not.toHaveBeenCalled();
  });

  it('Use Case: does not move the camera when the same location is rendered again', () => {
    const { rerender } = render(<DeskMap {...CARY} />);
    const map = lastMap();

    rerender(<DeskMap {...CARY} />);

    expect(map.flyTo).not.toHaveBeenCalled();
    expect(map.jumpTo).not.toHaveBeenCalled();
  });

  it('Use Case: renders severity-styled alert polygons and station points after load', () => {
    render(<DeskMap {...CARY} alerts={[POLYGON_ALERT]} stations={STATIONS} />);
    const map = lastMap();

    act(() => map.emit('load'));

    const alertSource = map.sources.get(MAP_ALERT_SOURCE_ID);
    expect(alertSource?.data).toMatchObject({
      type: 'FeatureCollection',
      features: [
        {
          id: 'alert-1',
          geometry: POLYGON_ALERT.polygon,
          properties: { severity: 'extreme', color: '#f43f5e' },
        },
      ],
    });
    expect(map.layers.get(MAP_ALERT_FILL_LAYER_ID)).toMatchObject({
      type: 'fill',
      source: MAP_ALERT_SOURCE_ID,
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.18 },
    });
    expect(map.layers.get(MAP_ALERT_LINE_LAYER_ID)).toMatchObject({
      type: 'line',
      source: MAP_ALERT_SOURCE_ID,
    });

    const stationSource = map.sources.get(MAP_STATION_SOURCE_ID);
    expect(stationSource?.data).toMatchObject({
      type: 'FeatureCollection',
      features: [
        {
          id: 'KRDU',
          geometry: { type: 'Point', coordinates: [-78.79, 35.89] },
          properties: { name: 'Raleigh-Durham International Airport' },
        },
        {
          id: 'KJNX',
          geometry: { type: 'Point', coordinates: [-78.39, 35.54] },
          properties: { name: 'Johnston Regional Airport' },
        },
      ],
    });
    expect(map.layers.get(MAP_STATION_LAYER_ID)).toMatchObject({
      type: 'circle',
      source: MAP_STATION_SOURCE_ID,
    });

    expect(screen.getByTestId('map-overlay-summary')).toHaveTextContent('1 alert');
    expect(screen.getByTestId('map-overlay-summary')).toHaveTextContent('2 stations');
  });

  it('Use Case: omits area-based alerts from the map while keeping station points', () => {
    render(<DeskMap {...CARY} alerts={[AREA_ALERT]} stations={STATIONS} />);
    const map = lastMap();

    act(() => map.emit('load'));

    expect(map.sources.get(MAP_ALERT_SOURCE_ID)?.data).toMatchObject({
      type: 'FeatureCollection',
      features: [],
    });
    expect(map.layers.has(MAP_STATION_LAYER_ID)).toBe(true);
    expect(screen.getByTestId('map-overlay-summary')).not.toHaveTextContent('alert');
  });

  it('Use Case: updates overlay data without duplicating sources or layers', () => {
    const { rerender } = render(<DeskMap {...CARY} alerts={[POLYGON_ALERT]} stations={STATIONS} />);
    const map = lastMap();
    act(() => map.emit('load'));

    const alertSource = map.sources.get(MAP_ALERT_SOURCE_ID);
    const layerCount = map.layers.size;

    rerender(<DeskMap {...CARY} alerts={[AREA_ALERT]} stations={STATIONS} />);

    expect(alertSource?.setData).toHaveBeenCalled();
    expect(map.sources.get(MAP_ALERT_SOURCE_ID)?.data).toMatchObject({
      features: [],
    });
    expect(map.layers.size).toBe(layerCount);
  });
});
