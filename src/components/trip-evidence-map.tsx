"use client";
import { DataTable } from "./ui/data-table";
import { Button } from "./ui/button";
import { useEffect, useRef, useState } from "react";
import type { SampledPositions, TripPosition } from "@/contracts/admin";
import {
  loadGoogleMaps,
  MAPS_AUTH_FAILURE,
  type GoogleMap,
  type GoogleMarker,
} from "@/lib/google-maps";
import { Notice, Timestamp } from "./primitives";

/** Discrete recorded samples and an expiring Redis point, never a reconstructed live route. */
export function TripEvidenceMap({
  tripId,
  preview,
  initial,
  samples,
}: {
  tripId: string;
  preview: boolean;
  initial: TripPosition;
  samples: SampledPositions;
}) {
  const [position, setPosition] = useState(initial);
  const [clock, setClock] = useState(Date.parse(initial.asOf));
  const [error, setError] = useState("");
  const [mapError, setMapError] = useState("");
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<GoogleMap | null>(null);
  const markers = useRef<GoogleMarker[]>([]);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY;
  const live =
    position.location &&
    clock - Date.parse(position.location.at) >= 0 &&
    clock - Date.parse(position.location.at) < 30000
      ? position.location
      : null;
  const hasEvidence = !!samples.items.length || !!live;

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
  useEffect(() => {
    if (preview || initial.state === "not_applicable") return;
    let controller: AbortController | undefined;
    let ended = false;
    async function refresh() {
      if (document.hidden || ended) return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch(
          `/api/admin/trips/${encodeURIComponent(tripId)}/location`,
          { cache: "no-store", signal: request.signal },
        );
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Your session expired. Sign in again."
              : "Driver position could not be refreshed.",
          );
        const next = (await response.json()) as TripPosition;
        if (!request.signal.aborted) {
          setPosition(next);
          ended = next.state === "not_applicable";
          setClock(Date.now());
          setError("");
        }
      } catch (e) {
        if (!request.signal.aborted) {
          setError(e instanceof Error ? e.message : "Position unavailable.");
          setPosition((current) => ({
            ...current,
            location: null,
            state: "unavailable",
          }));
        }
      }
    }
    const timer = setInterval(() => void refresh(), 15000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [tripId, preview, initial.state]);

  useEffect(() => {
    if (!key || !element.current || !hasEvidence) {
      setReady(false);
      return;
    }
    let cancelled = false;
    void loadGoogleMaps(key)
      .then((api) => {
        if (cancelled || !element.current) return;
        const first = samples.items[0] ?? live!;
        map.current = new api.Map(element.current, {
          center: { lat: first.latitude, lng: first.longitude },
          zoom: 13,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID ?? "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: "cooperative",
        });
        const points = [...samples.items, ...(live ? [live] : [])];
        if (points.length > 1)
          map.current.fitBounds(
            {
              south: Math.min(...points.map((p) => p.latitude)),
              north: Math.max(...points.map((p) => p.latitude)),
              west: Math.min(...points.map((p) => p.longitude)),
              east: Math.max(...points.map((p) => p.longitude)),
            },
            40,
          );
        setReady(true);
      })
      .catch((e) => {
        if (!cancelled)
          setMapError(
            e instanceof Error ? e.message : "Evidence map unavailable.",
          );
      });
    return () => {
      cancelled = true;
      markers.current.forEach((marker) => {
        marker.map = null;
      });
      map.current = null;
    };
  }, [key, samples, hasEvidence]);

  useEffect(() => {
    if (!ready || !map.current || !key) return;
    let cancelled = false;
    void loadGoogleMaps(key)
      .then((api) => {
        if (cancelled || !map.current) return;
        markers.current.forEach((marker) => {
          marker.map = null;
        });
        markers.current = samples.items.map((point, index) => {
          const marker = new api.marker.AdvancedMarkerElement({
            map: map.current!,
            position: { lat: point.latitude, lng: point.longitude },
            title: `Historical sample ${index + 1}, ${point.at}`,
            gmpClickable: true,
          });
          const label = document.createElement("span");
          label.className = `map-marker sample ${selected === index ? "selected" : ""}`;
          label.textContent = String(index + 1);
          marker.append(label);
          marker.addEventListener("gmp-click", () => setSelected(index));
          return marker;
        });
        if (live) {
          const marker = new api.marker.AdvancedMarkerElement({
            map: map.current!,
            position: { lat: live.latitude, lng: live.longitude },
            title: `Current driver position, ${live.at}`,
            gmpClickable: false,
          });
          const label = document.createElement("span");
          label.className = "map-marker";
          label.textContent = "D";
          marker.append(label);
          markers.current.push(marker);
        }
      })
      .catch(() => setMapError("Evidence map unavailable."));
    return () => {
      cancelled = true;
    };
  }, [ready, samples, selected, key, clock, position]);

  function selectPoint(index: number) {
    setSelected(index);
    const point = samples.items[index];
    map.current?.panTo({ lat: point.latitude, lng: point.longitude });
  }
  return (
    <section
      className="trip-evidence"
      aria-label="Driver position and historical location evidence"
    >
      <h3>Driver position and recorded samples</h3>
      <p className="scope-note">
        {live ? (
          <>
            Current driver position · <Timestamp value={live.at} />
          </>
        ) : position.state === "not_applicable" ? (
          "Current position is unavailable for an unassigned or ended trip."
        ) : (
          "Current driver position unavailable. Expired coordinates are withheld."
        )}
      </p>
      {error && <Notice>{error}</Notice>}
      <p className="scope-note">
        {samples.items.length} recent samples of {samples.total} stored ·
        Maximum {samples.limit}. Discrete historical observations; they do not
        establish a continuous path or current location.
      </p>
      {samples.items.length || live ? (
        <>
          {key && !mapError ? (
            <div
              ref={element}
              className="google-map"
              aria-label="Google map of discrete historical samples and current driver position"
            />
          ) : (
            <Notice>
              {mapError ||
                "Google Maps is not configured. Recorded evidence is available below."}
            </Notice>
          )}
          <div className="map-caption">
            Numbered points: historical samples. D: fresh current driver
            position. No lines are drawn between samples.
          </div>
        </>
      ) : (
        <p className="scope-note">
          No location evidence is available for this trip.
        </p>
      )}
      {live && (
        <p className="scope-note">
          Current coordinates: {live.latitude.toFixed(5)},{" "}
          {live.longitude.toFixed(5)} · Snapshot{" "}
          <Timestamp value={position.asOf} />
        </p>
      )}
      {samples.items.length > 0 && (
        <details>
          <summary>Recorded samples ({samples.items.length})</summary>
          <DataTable
            label="Historical samples"
            columns={[
              { id: "sample", label: "Sample" },
              { id: "time", label: "Recorded · WAT" },
              { id: "latitude", label: "Latitude" },
              { id: "longitude", label: "Longitude" },
            ]}
            rows={samples.items.map((point, index) => ({
              id: `${point.at}-${index}`,
              cells: [
                <Button
                  aria-pressed={selected === index}
                  onClick={() => selectPoint(index)}
                >
                  Sample {index + 1}
                </Button>,
                <Timestamp value={point.at} />,
                point.latitude.toFixed(5),
                point.longitude.toFixed(5),
              ],
            }))}
          />
        </details>
      )}
    </section>
  );
}
