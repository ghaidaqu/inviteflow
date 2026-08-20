'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchIcon, MapPinIcon } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Riyadh — a reasonable default center for an Arabic-first platform when
// no location is set yet, rather than the Leaflet default (mid-Atlantic).
const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753];
const DEFAULT_ZOOM = 11;

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
};

// Soft-biases search results toward the Gulf (bounded=0 means this nudges
// ranking rather than excluding everything outside the box — a place
// outside the region can still match, it just won't be preferred over an
// equally-good match inside it) and asks for Arabic names first. This is
// what actually helps "search like Google Maps" for local landmarks —
// without it, a query like a mall or hotel name gets buried under
// same-named places worldwide since Nominatim has no notion of "this is
// an Arabic-first, Gulf-first product" on its own.
const GULF_VIEWBOX = '34,32,60,12';

/**
 * A real clickable/draggable-pin map (Leaflet + OpenStreetMap tiles — no
 * API key, no billing account needed, unlike Google Maps' JS SDK) instead
 * of asking the organizer to go find and paste a Google Maps link
 * themselves. The output is still a plain Google Maps URL (`?q=lat,lng`),
 * so it stays compatible with the existing `locationMapUrl` field and the
 * "open in maps" button on the public invitation page.
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
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  // Multiple candidates to choose from instead of silently jumping to
  // whatever ranked first — "المطعم الفلاني" often matches several
  // branches, and picking the wrong one silently would be worse than not
  // finding it at all.
  const [results, setResults] = useState<NominatimResult[]>([]);

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

      const initial = parseGoogleMapsUrl(value) ?? DEFAULT_CENTER;
      const map = L.map(containerRef.current).setView(initial, DEFAULT_ZOOM);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker(initial, { icon, draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng();
        onChange(`https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`);
      });
      map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onChange(
          `https://www.google.com/maps?q=${e.latlng.lat.toFixed(6)},${e.latlng.lng.toFixed(6)}`,
        );
      });

      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Deliberately only on mount — re-centering on every `value` change
    // would fight the user while they're dragging the pin themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch() {
    if (!search.trim()) return;
    setIsSearching(true);
    setSearchError(false);
    setResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=0` +
          `&accept-language=ar&viewbox=${GULF_VIEWBOX}&bounded=0` +
          `&q=${encodeURIComponent(search)}`,
      );
      const found: NominatimResult[] = await res.json();
      if (found.length === 0) {
        setSearchError(true);
        return;
      }
      // Always show the pick(s), even a single one — never apply
      // silently. A silent auto-apply on the sole match looked like the
      // search "did nothing" (the only real feedback was the map,
      // scrolled out of view, quietly moving) and worse, Nominatim's one
      // match isn't always the right one: searching "برج المملكة" (the
      // Riyadh landmark) once auto-applied to "برج جدة" in a different
      // city entirely, with nothing surfaced to catch that. Showing it
      // as a pick — even a list of one — gives the organizer a visible
      // result to confirm before it becomes their event's location.
      setResults(found);
    } catch {
      setSearchError(true);
    } finally {
      setIsSearching(false);
    }
  }

  function applyResult(result: NominatimResult) {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    mapRef.current?.setView([lat, lng], 15);
    markerRef.current?.setLatLng([lat, lng]);
    onChange(`https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`);
    setResults([]);
    setSearch(result.display_name);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex gap-2">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (results.length > 0) setResults([]);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder={t('searchPlaceholder')}
        />
        <Button type="button" variant="outline" disabled={isSearching} onClick={handleSearch}>
          <SearchIcon className="size-4" />
        </Button>

        {results.length > 0 && (
          <ul className="bg-popover absolute inset-x-0 top-full z-10 mt-1 flex flex-col overflow-hidden rounded-lg border shadow-md">
            {results.map((result) => (
              <li key={`${result.lat},${result.lon}`}>
                <button
                  type="button"
                  onClick={() => applyResult(result)}
                  className="hover:bg-muted flex w-full items-start gap-2 px-3 py-2 text-start text-sm"
                >
                  <MapPinIcon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                  <span className="line-clamp-2">{result.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {searchError && <p className="text-destructive text-xs">{t('searchNotFound')}</p>}
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-lg border"
        aria-label={t('mapLabel')}
      />
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <MapPinIcon className="size-3.5 shrink-0" />
        {t('hint')}
      </p>
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
