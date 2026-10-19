import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDistance, type Coords } from './geo';
import { FACILITY_TYPE_LABEL, VERIFICATION_LABEL, type CareFacility } from './types';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const TYPE_STYLE: Record<CareFacility['type'], { color: string; glyph: string }> = {
  aed: { color: '#047857', glyph: 'AED' },
  hospital: { color: '#c62828', glyph: 'H' },
  emergency_station: { color: '#c62828', glyph: '+' },
  clinic: { color: '#155eef', glyph: 'PK' },
  pharmacy: { color: '#0e7490', glyph: 'NT' },
};

interface LeafletMapViewProps {
  origin: Coords;
  originIsGps: boolean;
  radiusKm: number;
  facilities: CareFacility[];
  selectedFacilityId: string | null;
  onSelectFacility: (id: string) => void;
}

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function LeafletMapView({ origin, originIsGps, radiusKm, facilities, selectedFacilityId, onSelectFacility }: LeafletMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const originLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelectFacility);
  onSelectRef.current = onSelectFacility;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [origin.lat, origin.lng], zoom: 13, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    originLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Origin marker + radius circle, and fit view to the search area.
  useEffect(() => {
    const map = mapRef.current;
    const layer = originLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const circle = L.circle([origin.lat, origin.lng], { radius: radiusKm * 1000, color: '#155eef', weight: 1.5, fillColor: '#155eef', fillOpacity: 0.06, dashArray: '4 6' }).addTo(layer);
    L.marker([origin.lat, origin.lng], {
      zIndexOffset: 1000,
      icon: L.divIcon({
        className: 'gm-origin-pin',
        html: `<span class="gm-origin-dot ${originIsGps ? 'is-gps' : ''}"></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    }).addTo(layer).bindPopup(`<strong>${originIsGps ? 'Vị trí GPS của bạn' : 'Điểm bắt đầu tìm kiếm'}</strong>`);
    map.flyToBounds(circle.getBounds(), { padding: [24, 24], animate: !prefersReducedMotion(), duration: 0.6 });
  }, [origin.lat, origin.lng, originIsGps, radiusKm]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markersRef.current.clear();
    facilities.forEach((fac) => {
      const style = TYPE_STYLE[fac.type];
      const selected = fac.id === selectedFacilityId;
      const marker = L.marker([fac.lat, fac.lng], {
        title: fac.name,
        icon: L.divIcon({
          className: 'gm-facility-pin',
          html: `<span class="gm-pin ${selected ? 'is-selected' : ''}" style="--pin:${style.color}">${style.glyph}</span>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          popupAnchor: [0, -16],
        }),
      });
      marker.bindPopup(`
        <div class="gm-popup">
          <p class="gm-popup__type">${FACILITY_TYPE_LABEL[fac.type]}${fac.distanceKm !== undefined ? ` · ${formatDistance(fac.distanceKm)}` : ''}</p>
          <p class="gm-popup__name">${escapeHtml(fac.name)}</p>
          ${fac.address ? `<p class="gm-popup__addr">${escapeHtml(fac.address)}</p>` : ''}
          <p class="gm-popup__status">${VERIFICATION_LABEL[fac.verification]}</p>
        </div>`);
      marker.on('click', () => onSelectRef.current(fac.id));
      marker.addTo(layer);
      markersRef.current.set(fac.id, marker);
    });
  }, [facilities, selectedFacilityId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedFacilityId) return;
    const marker = markersRef.current.get(selectedFacilityId);
    if (!marker) return;
    map.panTo(marker.getLatLng(), { animate: !prefersReducedMotion(), duration: 0.4 });
    marker.openPopup();
  }, [selectedFacilityId, facilities]);

  return <div ref={containerRef} className="h-full w-full" role="region" aria-label="Bản đồ cơ sở y tế và điểm AED" />;
}
