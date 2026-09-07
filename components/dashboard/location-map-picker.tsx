'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { MapPinIcon, XIcon } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Riyadh — a reasonable default center for an Arabic-first platform when
// no location is set yet, rather than the Leaflet default (mid-Atlantic).
const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753];
const DEFAULT_ZOOM = 11;

/**
 * A real clickable/draggable-pin map (Leaflet + OpenStreetMap tiles — no
 * API key, no billing account needed, unlike Google Maps' JS SDK) instead
 * of asking the organizer to go find and paste a Google Maps link
 * themselves. The output is still a plain Google Maps URL (`?q=lat,lng`),
 * so it stays compatible with the existing `locationMapUrl` field and the
 * "open in maps" button on the public invitation page.
 *
 * No name/address search box — that used to call Nominatim, which has
 * essentially no coverage of real Saudi venue names (confirmed directly:
 * searching a real Riyadh wedding hall returned villages in Gaza/Yemen),
 * and the accurate alternative (Google Places) turned out to need a
 * reseller contract for a Saudi billing address, not just an API key —
 * a bigger step than this feature is worth right now. Click-or-drag the
 * pin is the one thing that's always correct, so it's the only thing
 * here.
 *
 * No pin is shown until there's a real value (an existing saved location)
 * or the organizer actually clicks the map — a pin sitting on the default
 * center from the moment the map loads looked like a location had already
 * been set, and a stray click/drag near it silently saved one nobody
 * meant to set. The clear (×) button undoes that either way.
 */
export function LocationMapPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (mapUrl: string) => void;
}) {
  const t = useTranslations('Events.form.map');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);

  useEffect(() => {
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      // Leaflet's default marker icon references image URLs relative to
      // the CSS file, which breaks under Next's bundler — point them at
      // the package's own dist assets explicitly instead.
      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      const existing = parseGoogleMapsUrl(value);
      const map = L.map(containerRef.current).setView(existing ?? DEFAULT_CENTER, DEFAULT_ZOOM);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      function placeMarker(latlng: import('leaflet').LatLng | import('leaflet').LatLngLiteral) {
        if (markerRef.current) {
          markerRef.current.setLatLng(latlng);
          return;
        }
        const marker = L.marker(latlng, { icon, draggable: true }).addTo(map);
        marker.on('dragend', () => {
          const { lat, lng } = marker.getLatLng();
          onChange(`https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`);
        });
        markerRef.current = marker;
      }

      if (existing) placeMarker({ lat: existing[0], lng: existing[1] });

      map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        placeMarker(e.latlng);
        onChange(
          `https://www.google.com/maps?q=${e.latlng.lat.toFixed(6)},${e.latlng.lng.toFixed(6)}`,
        );
      });

      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Deliberately only on mount — re-centering on every `value` change
    // would fight the user while they're dragging the pin themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClear() {
    onChange('');
    markerRef.current?.remove();
    markerRef.current = null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-lg border"
        aria-label={t('mapLabel')}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <MapPinIcon className="size-3.5 shrink-0" />
          {t('hint')}
        </p>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-destructive flex shrink-0 items-center gap-1 text-xs font-medium"
          >
            <XIcon className="size-3.5" />
            {t('clearPin')}
          </button>
        )}
      </div>
    </div>
  );
}

function parseGoogleMapsUrl(url: string): [number, number] | null {
  const match = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
}
