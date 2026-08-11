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
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(search)}`,
      );
      const results: NominatimResult[] = await res.json();
      const first = results[0];
      if (!first) {
        setSearchError(true);
        return;
      }
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      mapRef.current?.setView([lat, lng], 15);
      markerRef.current?.setLatLng([lat, lng]);
      onChange(`https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`);
    } catch {
      setSearchError(true);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
