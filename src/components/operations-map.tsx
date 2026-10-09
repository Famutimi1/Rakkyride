"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "./icon";
export function OperationsMap() {
  const [area, setArea] = useState("Lagos, Nigeria");
  const [failed, setFailed] = useState(false);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  return (
    <div className="map-section">
      <div className="map-toolbar">
        <span>
          <Icon name="map" /> Lagos operations area
        </span>
        <div className="segmented">
          {["Lagos", "Lekki", "Amuwo Odofin"].map((place) => (
            <button
              key={place}
              aria-pressed={area === `${place}, Nigeria`}
              onClick={() => {
                setArea(`${place}, Nigeria`);
                setFailed(false);
              }}
            >
              {place === "Amuwo Odofin" ? "Amuwo" : place}
            </button>
          ))}
        </div>
      </div>
      {key && !failed ? (
        <iframe
          className="google-map"
          title={`Google Maps — ${area}`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          src={`https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(area)}&zoom=12`}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="map-unavailable">
          <span className="state-icon">
            <Icon name="map" size={32} />
          </span>
          <h3>Google Maps {failed ? "could not load" : "is not configured"}</h3>
          <p>
            {failed
              ? "The trip list remains available while the map is unavailable."
              : "The operations map will appear once the Google Maps browser key is configured."}
          </p>
          <Link className="button secondary" href="/admin/trips">
            Browse the trip list <Icon name="arrow" size={16} />
          </Link>
        </div>
      )}
      <div className="map-caption">
        <span className="badge neutral">◎ Base map only</span>
        <span>
          Open Live operations for fleet positions. No location markers are
          simulated.
        </span>
      </div>
    </div>
  );
}

export function TripRouteMap({
  origin,
  destination,
}: {
  origin: string;
  destination: string;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  const [failed, setFailed] = useState(false);
  return (
    <div className="map-section">
      {key && !failed ? (
        <iframe
          className="google-map"
          title="Google Maps estimated trip route"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          src={`https://www.google.com/maps/embed/v1/directions?${new URLSearchParams({ key, origin, destination, mode: "driving", units: "metric" })}`}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="map-unavailable">
          <h3>
            {failed ? "Route map unavailable" : "Google Maps is not configured"}
          </h3>
          <p>The recorded pickup and destination remain available above.</p>
        </div>
      )}
      <div className="map-caption">
        Google’s current estimated route; this does not show the actual path
        traveled.
      </div>
    </div>
  );
}
