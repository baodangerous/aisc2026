import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { CareFacility } from './NearbyCareView';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));

interface LeafletMapViewProps {
  center: { lat: number; lng: number };
  facilities: CareFacility[];
  selectedFacilityId: string | null;
  onSelectFacility: (id: string) => void;
  userCoords: { lat: number; lng: number } | null;
}

export const LeafletMapView: React.FC<LeafletMapViewProps> = ({
  center,
  facilities,
  selectedFacilityId,
  onSelectFacility,
  userCoords,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // If map already initialized, do not re-create
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [center.lat, center.lng],
        zoom: 14,
        zoomControl: true,
        attributionControl: true,
      });

      // Free OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Update Map Center when `center` changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([center.lat, center.lng], {
        animate: true,
        duration: 0.6,
      });
    }
  }, [center.lat, center.lng]);

  // 3. Render / Update User Location Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userCoords) {
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
            <div class="w-8 h-8 rounded-full bg-blue-500/30 animate-ping absolute"></div>
            <div class="w-6 h-6 rounded-full bg-[#175CD3] border-2 border-white text-white flex items-center justify-center shadow-lg">
              <div class="w-2.5 h-2.5 rounded-full bg-white"></div>
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], {
          icon: userIcon,
          zIndexOffset: 1000,
        })
          .addTo(map)
          .bindPopup(
            `<div class="text-xs font-sans p-1">
              <p class="font-bold text-[#101828]">Vị trí hiện tại của bạn</p>
              <p class="text-[#667085] text-xs">Đã định vị qua GPS thiết bị</p>
            </div>`
          );
      } else {
        userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [userCoords]);

  // 4. Render Facility Markers & Popups
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous markers that are no longer present
    const currentFacilityIds = new Set(facilities.map((f) => f.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentFacilityIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add or update markers
    facilities.forEach((fac) => {
      const isAed = fac.type === 'aed';
      const isHospital = fac.type === 'hospital' || fac.type === 'emergency_station';
      const isPharmacy = fac.type === 'pharmacy';
      const isSelected = fac.id === selectedFacilityId;

      const bgColor = isAed ? '#DC6803' : isHospital ? '#D92D20' : isPharmacy ? '#0E9384' : '#175CD3';
      const typeLabel = isAed
        ? '⚡ Máy AED Tự Động'
        : isHospital
        ? '🏥 Bệnh Viện Cấp Cứu'
        : isPharmacy
        ? '💊 Nhà Thuốc'
        : '🩺 Phòng Khám';

      const sourceBadge =
        fac.source === 'verified_official'
          ? '<span class="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-semibold">Có hồ sơ xác minh nguồn</span>'
          : '<span class="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[11px] font-semibold">Thông tin địa điểm từ OpenStreetMap</span>';

      const popupHtml = `
        <div class="font-sans text-left max-w-[220px] p-0.5 space-y-1.5">
          <div class="flex items-center justify-between gap-1">
            <span class="text-[11px] font-bold text-gray-500 uppercase">${typeLabel}</span>
            ${fac.distanceKm !== undefined ? `<span class="text-[11px] font-bold text-[#175CD3] bg-gray-100 px-1.5 py-0.2 rounded font-mono">~${fac.distanceKm} km</span>` : ''}
          </div>
          <h4 class="text-xs font-bold text-[#101828] leading-tight">${escapeHtml(fac.name)}</h4>
          <p class="text-xs text-[#475467] leading-snug">${escapeHtml(fac.address)}</p>
          <div class="pt-0.5">
            ${sourceBadge}
          </div>
          <div class="pt-2 border-t border-gray-100 flex items-center gap-1">
            <a 
              href="${fac.phone ? `tel:${fac.phone.replace(/[^+0-9]/g, '')}` : 'tel:115'}"
              class="flex-1 text-center py-1 px-1.5 bg-[#D92D20] text-white text-[11px] font-bold rounded hover:bg-[#B42318] no-underline"
            >
              ${fac.phone ? 'Gọi ngay' : 'Gọi 115'}
            </a>
            <span class="flex-1 text-center py-1 px-1.5 bg-[#F2F4F7] text-[#475467] border border-[#D0D5DD] text-[11px] font-bold rounded">
              Xem trên bản đồ
            </span>
          </div>
        </div>
      `;

      const markerHtml = `
        <div class="facility-marker-wrapper transition-transform duration-200 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
          <div style="background-color: ${isSelected ? '#101828' : bgColor}; border-color: ${isSelected ? '#ffffff' : '#ffffff'};" class="w-7 h-7 rounded-xl border-2 text-white shadow-md flex items-center justify-center font-bold text-xs">
            ${isAed ? '⚡' : isHospital ? '🏥' : isPharmacy ? '💊' : '🩺'}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-facility-pin',
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16],
      });

      let marker = markersRef.current.get(fac.id);
      if (!marker) {
        marker = L.marker([fac.lat, fac.lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(popupHtml);

        marker.on('click', () => {
          onSelectFacility(fac.id);
        });

        markersRef.current.set(fac.id, marker);
      } else {
        marker.setLatLng([fac.lat, fac.lng]);
        marker.setIcon(customIcon);
        marker.setPopupContent(popupHtml);
      }

      if (isSelected) {
        marker.openPopup();
      }
    });
  }, [facilities, selectedFacilityId, onSelectFacility]);

  // 5. Center and Open Popup on selected facility
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedFacilityId) return;

    const targetMarker = markersRef.current.get(selectedFacilityId);
    const targetFacility = facilities.find((f) => f.id === selectedFacilityId);

    if (targetMarker && targetFacility) {
      map.panTo([targetFacility.lat, targetFacility.lng], {
        animate: true,
        duration: 0.5,
      });
      targetMarker.openPopup();
    }
  }, [selectedFacilityId, facilities]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      <div className="absolute bottom-1 left-2 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[11px] text-[#475467] shadow-xs border border-[#EAECF0] pointer-events-none z-10">
        Bệnh viện/phòng khám từ nguồn bản đồ công khai; hãy gọi 115 để xác nhận
      </div>
    </div>
  );
};
