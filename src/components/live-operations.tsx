"use client";
import { Button } from "./ui/button";
import { FormField } from "./ui/filter-toolbar";
import { Dropdown } from "./ui/dropdown";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveSnapshot, ServiceType } from "@/contracts/admin";
import {
  loadGoogleMaps,
  MAPS_AUTH_FAILURE,
  type GoogleMap,
  type GoogleMarker,
} from "@/lib/google-maps";
import { liveServiceDrivers, showServiceMarker, driverServiceNames } from "@/lib/driver-services";
import { DriverServiceState } from "./driver-service-state";
import { Icon } from "./icon";
import { Notice, StatusBadge, Timestamp } from "./primitives";
const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY;
export function LiveOperations({
  initial,
  preview,
}: {
  initial: LiveSnapshot;
  preview: boolean;
}) {
  const [data, setData] = useState(initial),
    [selected, setSelected] = useState<string | null>(null),
    [follow, setFollow] = useState(false),
    [error, setError] = useState(""),
    [mapError, setMapError] = useState(""),
    [busy, setBusy] = useState(false),
    [needsSearch, setNeedsSearch] = useState(false),
    [mapReady, setMapReady] = useState(false),
    [clock, setClock] = useState(Date.parse(initial.asOf)),
    [pending, setPending] = useState<LiveSnapshot | null>(null);
  const [service,setService]=useState<ServiceType>(initial.scope.service);
  const matchingScope=data.scope.service===service;
  const drivers=matchingScope?liveServiceDrivers(data.drivers,service):[];
  const queue = useRef<HTMLElement>(null);
  const fresh = (at: string) =>
    clock - Date.parse(at) >= 0 && clock - Date.parse(at) < 30000;
  useEffect(() => {
    const failed = () => setMapError("Google Maps access is unavailable. Check API activation, billing and browser-key restrictions.");
    window.addEventListener(MAPS_AUTH_FAILURE, failed);
    return () => window.removeEventListener(MAPS_AUTH_FAILURE, failed);
  }, []);
  useEffect(() => {
    setClock(Date.now());
    const timer = setInterval(() => setClock(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  const element = useRef<HTMLDivElement>(null),
    map = useRef<GoogleMap | null>(null),
    markers = useRef<GoogleMarker[]>([]),
    request = useRef<AbortController | null>(null),
    scope = useRef(initial.scope);
  const refresh = useCallback(async () => {
    if (preview) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      const requestedScope={...scope.current};
      const query = new URLSearchParams(
        Object.entries(requestedScope).map(([k, v]) => [k, String(v)]),
      );
      const response = await fetch(`/api/admin/live?${query}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Your session expired. Sign in again."
            : "The live snapshot could not be refreshed.",
        );
      const snapshot = (await response.json()) as LiveSnapshot;
      if (controller.signal.aborted) return;
      if(snapshot.scope.service!==requestedScope.service)throw new Error("The server returned a different service scope. Refresh after updating the backend.");
      if (queue.current?.contains(document.activeElement)) setPending(snapshot);
      else {
        setData(snapshot);
        setPending(null);
      }
      setError("");
      setNeedsSearch(false);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "The snapshot is stale.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }, [preview]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15000);
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      request.current?.abort();
    };
  }, [refresh]);
  useEffect(() => {
    if (!key || !element.current) return;
    let cancelled = false;
    let listener: { remove(): void } | undefined;
    void loadGoogleMaps(key)
      .then((api) => {
        if (cancelled || !element.current) return;
        map.current = new api.Map(element.current, {
          center: { lat: 6.46, lng: 3.39 },
          zoom: 11,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ?? "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: "cooperative",
        });
        listener = map.current.addListener("idle", () => setNeedsSearch(true));
        setMapError("");
        setMapReady(true);
      })
      .catch((e) => {
        if (!cancelled)
          setMapError(e instanceof Error ? e.message : "Map unavailable.");
      });
    return () => {
      cancelled = true;
      listener?.remove();
      markers.current.forEach((marker) => {
        marker.map = null;
      });
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!key || !map.current) return;
    let cancelled = false;
    void loadGoogleMaps(key).then((api) => {
      if (cancelled || !map.current) return;
      markers.current.forEach((marker) => {
        marker.map = null;
      });
      markers.current = (matchingScope?liveServiceDrivers(data.drivers,service):[]).flatMap((driver) => {
        if (!driver.location||!showServiceMarker(driver,service)) return [];
        const content = document.createElement("button");
        content.type = "button";
        const stale = !fresh(driver.location.at);
        content.className = `map-marker ${stale ? "stale" : driver.availability === "available" ? "available" : "busy"} ${driver.id === selected ? "selected" : ""}`;
        content.textContent = stale
          ? "S"
          : driver.availability === "available"
            ? "D"
            : "T";
        content.setAttribute(
          "aria-label",
          `${driver.name}, ${stale ? "last-known stale location" : driver.availability}`,
        );
        const marker = new api.marker.AdvancedMarkerElement({
          map: map.current!,
          position: {
            lat: driver.location.latitude,
            lng: driver.location.longitude,
          },
          title: `${driver.name} · ${driver.availability}`,
          gmpClickable: true,
        });
        marker.append(content);
        marker.addEventListener("gmp-click", () => setSelected(driver.id));
        return [marker];
      });
    });
    return () => {
      cancelled = true;
    };
  }, [data, selected, mapError, mapReady, clock, service, matchingScope]);
  useEffect(() => {
    const driver = data.scope.service===service?liveServiceDrivers(data.drivers,service).find((d) => d.id === selected):undefined;
    if (follow && driver?.location && fresh(driver.location.at))
      map.current?.panTo({
        lat: driver.location.latitude,
        lng: driver.location.longitude,
      });
  }, [data, selected, follow, service]);
  function searchArea() {
    const bounds = map.current?.getBounds()?.toJSON();
    if (bounds) scope.current = { ...scope.current, ...bounds };
    void refresh();
  }
  return (
    <>
      <div className="live-toolbar">
        <div>
          <StatusBadge
            status={
              error
                ? "stale"
                : data.locationState === "ready"
                  ? "snapshot"
                  : "location_unavailable"
            }
          />
          <span>
            {matchingScope?<>Snapshot <Timestamp value={data.asOf} /></>:"Waiting for the selected service snapshot"}
          </span>
        </div>
        <Button
          type="submit"
          variant="secondary"
          disabled={preview || busy}
          onClick={() => void refresh()}
        >
          {busy ? "Refreshing…" : "Refresh snapshot"}
        </Button>
      </div>
      {pending?.scope.service===service && (
        <Button
          type="submit"
          variant="secondary"
          onClick={() => {
            setData(pending);
            setPending(null);
          }}
        >
          Updates available · Apply snapshot
        </Button>
      )}
      <FormField>
        Service supply
        <Dropdown
          aria-label="Service supply"
          value={service}
          disabled={preview}
          onValueChange={(value) => {
            const next=value as ServiceType;
            setService(next);
            setSelected(null);
            setFollow(false);
            setPending(null);
            markers.current.forEach(marker=>{marker.map=null;});
            markers.current=[];
            scope.current={...scope.current,service:next};
            void refresh();
          }}
        >
          <option value="ride">Passenger rides</option>
          <option value="courier">Courier</option>
        </Dropdown>
      </FormField>
      {error && (
        <Notice>
          {error} {matchingScope?"Last-known records for this service remain labeled with their snapshot timestamp.":"Records from another service are hidden."}
        </Notice>
      )}
      {data.capped && (
        <Notice>
          The snapshot is capped at {data.scope.limit} candidate drivers. This
          is not a complete fleet count.
        </Notice>
      )}
      <div className="live-grid">
        <section className="panel live-map-panel">
          <header className="panel-header">
            <h2>{driverServiceNames[service]} · Lagos supply</h2>
            <label className="follow-control">
              <input
                type="checkbox"
                checked={follow}
                onChange={(e) => setFollow(e.target.checked)}
              />
              Follow selected
            </label>
          </header>
          <div
            className="live-map"
            ref={element}
            aria-label="Google Maps fleet view"
          />
          {(!key || mapError) && (
            <div className="map-unavailable">
              <span className="state-icon">
                <Icon name="map" size={32} />
              </span>
              <h3>
                {mapError ? "Map unavailable" : "Google Maps is not configured"}
              </h3>
              <p>
                {mapError ||
                  "Configure the Google Maps browser key to view current authorized coordinates. The queue remains usable."}
              </p>
            </div>
          )}
          {key && !mapError && needsSearch && (
            <div className="search-area">
              <Button
                type="submit"
                variant="primary"
                disabled={preview || busy}
                onClick={searchArea}
              >
                Search this area
              </Button>
            </div>
          )}
          <div className="map-caption">
            <span>D · Available for {driverServiceNames[service].toLowerCase()}</span>
            <span>T · Active job in this service</span>
            <span>S · Stale last-known position after a failed refresh.</span>
          </div>
        </section>
        <section className="panel driver-queue" ref={queue}>
          <header className="panel-header">
            <div>
              <h2>{driverServiceNames[service]} snapshot</h2>
              <p>{drivers.length} enrolled partners in this bounded snapshot · {matchingScope?data.availableDriversInSnapshot??"Unknown":"…"} available</p>
            </div>
          </header>
          {drivers.length === 0 ? (
            <div className="query-state">
              <h3>
                {preview
                  ? "No fleet positions simulated"
                  : matchingScope?"No enrolled partners in this snapshot":"Loading selected service supply"}
              </h3>
              <p>
                {preview
                  ? "Preview mode does not fabricate driver coordinates."
                  : "Change the area or refresh the snapshot."}
              </p>
            </div>
          ) : (
            drivers.map((driver) => (
              <div
                key={driver.id}
                className={`driver-queue-row ${selected === driver.id ? "selected" : ""}`}
              >
                <button
                  className="driver-select"
                  aria-pressed={selected === driver.id}
                  onClick={() => setSelected(driver.id)}
                >
                  <strong>{driver.name}</strong>
                  <span>
                    {driver.vehicle} · {driver.plate}
                  </span>
                  <StatusBadge
                    status={
                      driver.location && !fresh(driver.location.at)
                        ? "stale"
                        : driver.availability
                    }
                  />
                </button>
                <DriverServiceState status={service==="ride"?driver.rideServiceStatus:driver.courierServiceStatus} enabled={service==="ride"?driver.rideOptIn:driver.courierOptIn} />
                {driver.activeTripService&&<small>Active job: {driverServiceNames[driver.activeTripService]}</small>}
                <small>
                  {driver.location ? (
                    <Timestamp value={driver.location.at} />
                  ) : (
                    "Location unavailable"
                  )}
                </small>
                <div>
                  <Link
                    className="text-link"
                    href={`/admin/drivers/${driver.id}`}
                  >
                    Inspect driver →
                  </Link>
                  {driver.activeTripId && (
                    <Link
                      className="text-link"
                      href={`/admin/trips/${driver.activeTripId}`}
                    >
                      Inspect trip →
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </>
  );
}
