"use client";
export interface MapPoint {
  lat: number;
  lng: number;
}
export interface GoogleMap {
  panTo(point: MapPoint): void;
  fitBounds(
    bounds: { south: number; north: number; west: number; east: number },
    padding?: number,
  ): void;
  getBounds():
    | { toJSON(): { south: number; north: number; west: number; east: number } }
    | undefined;
  addListener(event: string, listener: () => void): { remove(): void };
}
export interface GoogleMarker {
  map: GoogleMap | null;
  position: MapPoint;
  append(...nodes: Node[]): void;
  addEventListener(event: string, listener: () => void): void;
  addListener(event: string, listener: () => void): { remove(): void };
}
export interface MapsRuntime {
  Map: new (
    element: HTMLElement,
    options: {
      center: MapPoint;
      zoom: number;
      mapId: string;
      mapTypeControl: boolean;
      streetViewControl: boolean;
      fullscreenControl: boolean;
      gestureHandling: string;
    },
  ) => GoogleMap;
  marker: {
    AdvancedMarkerElement: new (options: {
      map: GoogleMap;
      position: MapPoint;
      title: string;
      content?: HTMLElement;
      gmpClickable: boolean;
    }) => GoogleMarker;
  };
}
type MapsWindow = Window & {
  google?: { maps: MapsRuntime };
  __rakkyMapsReady?: () => void;
  gm_authFailure?: () => void;
};
export const MAPS_AUTH_FAILURE = "rakky:maps-auth-failure";
let loading: Promise<MapsRuntime> | null = null;
export function loadGoogleMaps(key: string): Promise<MapsRuntime> {
  const host = window as MapsWindow;
  if (host.google?.maps.marker) return Promise.resolve(host.google.maps);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    let done = false;
    const fail = () => {
      if (done) return;
      done = true;
      script.remove();
      loading = null;
      reject(
        new Error("Google Maps could not load. The list remains available."),
      );
    };
    const timer = window.setTimeout(fail, 20000);
    host.__rakkyMapsReady = () => {
      if (done) return;
      window.clearTimeout(timer);
      if (!host.google?.maps.marker) {
        fail();
        return;
      }
      done = true;
      resolve(host.google.maps);
    };
    host.gm_authFailure = () => {
      window.dispatchEvent(new Event(MAPS_AUTH_FAILURE));
      fail();
    };
    const query = new URLSearchParams({
      key,
      loading: "async",
      callback: "__rakkyMapsReady",
      libraries: "marker",
      v: "quarterly",
      region: "NG",
      auth_referrer_policy: "origin",
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${query}`;
    script.async = true;
    script.onerror = fail;
    document.head.append(script);
  });
  return loading;
}
