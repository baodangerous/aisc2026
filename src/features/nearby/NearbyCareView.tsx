import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  MapPin,
  PhoneCall,
  Navigation as NavigationIcon,
  Search,
  Zap,
  Building2,
  Compass,
  ExternalLink,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Info,
  RefreshCw,
  Crosshair,
  AlertTriangle,
  Stethoscope,
  Pill,
  Globe,
} from 'lucide-react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { apiClient } from '../../services/api/client';
import { CommunityFacility } from '../../domain/schemas';
import { LeafletMapView } from './LeafletMapView';
import { calculateDistanceKm } from '../../utils/formatters';
import { MetadataRow } from '../../components/common/MetadataSeparators';

// Source Origin Types
export type FacilitySource = 'google_places' | 'verified_official' | 'synthetic_simulation';

export interface CareFacility {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'emergency_station' | 'aed';
  address: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  phone?: string;
  isOpenNow?: boolean;
  operatingHours?: string;
  source: FacilitySource;
  disclaimer?: string;
  googleMapsUrl?: string;
}

// Preset Vietnamese geographic regions for manual selection
export const PRESET_REGIONS = [
  { id: 'hcm_q1', name: 'Quận 1 — Bến Thành / Lê Lợi (TP.HCM)', lat: 10.7725, lng: 106.698 },
  { id: 'hcm_q3', name: 'Quận 3 — Võ Văn Tần / Trương Định (TP.HCM)', lat: 10.779, lng: 106.689 },
  { id: 'hcm_q5', name: 'Quận 5 — BV Chợ Rẫy / An Đông (TP.HCM)', lat: 10.755, lng: 106.666 },
  { id: 'hcm_q10', name: 'Quận 10 — Sư Vạn Hạnh / BV 115 (TP.HCM)', lat: 10.7733, lng: 106.6603 },
  { id: 'hcm_binhthanh', name: 'Bình Thạnh — Nơ Trang Long / Gia Định (TP.HCM)', lat: 10.802, lng: 106.696 },
  { id: 'hcm_thuduc', name: 'TP. Thủ Đức — ĐHQG / Khu Công nghệ cao (TP.HCM)', lat: 10.852, lng: 106.772 },
  { id: 'hn_hoankiem', name: 'Hoàn Kiếm — Tràng Tiền / BV Việt Đức (Hà Nội)', lat: 21.0285, lng: 105.8542 },
  { id: 'hn_dongda', name: 'Đống Đa — Tôn Thất Tùng / BV Bạch Mai (Hà Nội)', lat: 21.0074, lng: 105.8306 },
  { id: 'nt_khanhhoa', name: 'TP. Nha Trang — BV Tỉnh / Quảng Trường 2/4 (Khánh Hòa)', lat: 12.2388, lng: 109.1967 },
  { id: 'dn_haichau', name: 'Hải Châu — BV Đà Nẵng / Cầu Rồng (Đà Nẵng)', lat: 16.0678, lng: 108.2208 },
];

// Rich baseline facilities across key regions in Vietnam
const BUILTIN_REGIONAL_FACILITIES: CareFacility[] = [
  // HCM Q10 & 115 Core
  {
    id: 'fac_station_115_hcm',
    name: 'Trung Tâm Cấp Cứu 115 TP. Hồ Chí Minh',
    type: 'emergency_station',
    address: '524 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM',
    lat: 10.7733,
    lng: 106.6603,
    phone: '115',
    operatingHours: '24/7',
    isOpenNow: true,
    source: 'verified_official',
    disclaimer: 'Cơ sở cấp cứu 115 chính thức trực thuộc Sở Y Tế TP.HCM.',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Trung+Tâm+Cấp+Cứu+115+TP+Hồ+Chí+Minh',
  },
  {
    id: 'fac_hosp_nd115',
    name: 'Bệnh viện Nhân Dân 115 (Khoa Cấp cứu & Đột quỵ)',
    type: 'hospital',
    address: '527 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM',
    lat: 10.7725,
    lng: 106.6612,
    phone: '02838652368',
    operatingHours: '24/7',
    isOpenNow: true,
    source: 'verified_official',
    disclaimer: 'Bệnh viện tuyến cuối đa khoa có đơn vị cấp cứu hồi sức và đột quỵ.',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Bệnh+viện+Nhân+Dân+115',
  },
  {
    id: 'fac_hosp_nhidong1',
    name: 'Bệnh viện Nhi Đồng 1 (Khoa Cấp cứu)',
    type: 'hospital',
    address: '341 Sư Vạn Hạnh, Phường 10, Quận 10, TP.HCM',
    lat: 10.7681,
    lng: 106.6698,
    phone: '02839271119',
    operatingHours: '24/7',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu minh họa — không dùng để điều hướng trong cấp cứu thật.',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Bệnh+viện+Nhi+Đồng+1',
  },
  {
    id: 'fac_pharm_lc_q10',
    name: 'Nhà thuốc FPT Long Châu — Sư Vạn Hạnh',
    type: 'pharmacy',
    address: '497 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM',
    lat: 10.7712,
    lng: 106.6625,
    phone: '18006928',
    operatingHours: '06:30 - 22:30',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu minh họa — không dùng để điều hướng trong cấp cứu thật.',
  },
  {
    id: 'fac_aed_vanhanhmall',
    name: 'Điểm AED Minh Họa — TTTM Vạn Hạnh Mall',
    type: 'aed',
    address: '11 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM',
    lat: 10.7705,
    lng: 106.6685,
    operatingHours: '09:30 - 22:00',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu mô phỏng theo đề án số hóa AED — Không dùng thay thế chỉ dẫn y tế trong cấp cứu thật.',
  },

  // HCM Q1
  {
    id: 'fac_hosp_saigon_q1',
    name: 'Bệnh viện Đa khoa Sài Gòn',
    type: 'hospital',
    address: '125 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
    lat: 10.7725,
    lng: 106.6985,
    phone: '02838297441',
    operatingHours: '24/7',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu minh họa — không dùng để điều hướng trong cấp cứu thật.',
  },
  {
    id: 'fac_clinic_q1',
    name: 'Trung tâm Y tế Quận 1',
    type: 'clinic',
    address: '338 Hai Bà Trưng, Phường Tân Định, Quận 1, TP.HCM',
    lat: 10.7905,
    lng: 106.6912,
    phone: '02838202061',
    operatingHours: '07:30 - 17:00',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu minh họa — không dùng để điều hướng trong cấp cứu thật.',
  },
  {
    id: 'fac_pharm_pmc_q1',
    name: 'Nhà thuốc Pharmacity — Bến Thành',
    type: 'pharmacy',
    address: '14 Phan Chu Trinh, Phường Bến Thành, Quận 1, TP.HCM',
    lat: 10.7718,
    lng: 106.6975,
    phone: '18006821',
    operatingHours: '24/7',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu minh họa — không dùng để điều hướng trong cấp cứu thật.',
  },
  {
    id: 'fac_aed_01',
    name: 'Điểm AED Minh Họa — Công viên 23/9',
    type: 'aed',
    address: 'Đường Lê Lai, Phường Bến Thành, Quận 1, TP.HCM',
    lat: 10.7702,
    lng: 106.6934,
    operatingHours: '24/7',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu mô phỏng theo đề án số hóa AED — Không dùng thay thế chỉ dẫn y tế trong cấp cứu thật.',
  },
  {
    id: 'fac_aed_02',
    name: 'Điểm AED Minh Họa — Nhà thi đấu Nguyễn Du',
    type: 'aed',
    address: '116 Nguyễn Du, Phường Bến Thành, Quận 1, TP.HCM',
    lat: 10.7745,
    lng: 106.6922,
    operatingHours: '06:00 - 22:00',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu mô phỏng theo đề án số hóa AED — Không dùng thay thế chỉ dẫn y tế trong cấp cứu thật.',
  },
  {
    id: 'fac_aed_03',
    name: 'Điểm AED Minh Họa — Co.opmart Cống Quỳnh',
    type: 'aed',
    address: '189C Cống Quỳnh, Phường Nguyễn Cư Trinh, Quận 1, TP.HCM',
    lat: 10.7656,
    lng: 106.6872,
    operatingHours: '08:00 - 22:00',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu mô phỏng theo đề án số hóa AED — Không dùng thay thế chỉ dẫn y tế trong cấp cứu thật.',
  },

  // HCM Q5
  {
    id: 'fac_hosp_choray',
    name: 'Bệnh viện Chợ Rẫy (Trung tâm Cấp cứu 24/7)',
    type: 'hospital',
    address: '201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP.HCM',
    lat: 10.7578,
    lng: 106.6595,
    phone: '02838554137',
    operatingHours: '24/7',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu minh họa — không dùng để điều hướng trong cấp cứu thật.',
  },
  {
    id: 'fac_hosp_umc',
    name: 'Bệnh viện Đại học Y Dược TP.HCM',
    type: 'hospital',
    address: '215 Hồng Bàng, Phường 11, Quận 5, TP.HCM',
    lat: 10.7554,
    lng: 106.6622,
    phone: '02838554269',
    operatingHours: '24/7',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu minh họa — không dùng để điều hướng trong cấp cứu thật.',
  },
  {
    id: 'fac_aed_parkson_q5',
    name: 'Điểm AED Minh Họa — Hùng Vương Plaza',
    type: 'aed',
    address: '126 Hồng Bàng, Phường 12, Quận 5, TP.HCM',
    lat: 10.7559,
    lng: 106.6601,
    operatingHours: '09:30 - 22:00',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu mô phỏng theo đề án số hóa AED — Không dùng thay thế chỉ dẫn y tế trong cấp cứu thật.',
  },

  // HCM Bình Thạnh
  {
    id: 'fac_hosp_giadinh',
    name: 'Bệnh viện Nhân dân Gia Định (Cấp cứu 24/7)',
    type: 'hospital',
    address: '01 Nơ Trang Long, Phường 7, Bình Thạnh, TP.HCM',
    lat: 10.8035,
    lng: 106.6953,
    phone: '02838412692',
    operatingHours: '24/7',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu minh họa — không dùng để điều hướng trong cấp cứu thật.',
  },
  {
    id: 'fac_aed_pearlplaza',
    name: 'Điểm AED Minh Họa — Pearl Plaza',
    type: 'aed',
    address: '561A Điện Biên Phủ, Phường 25, Bình Thạnh, TP.HCM',
    lat: 10.7989,
    lng: 106.7175,
    operatingHours: '09:00 - 22:00',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu mô phỏng theo đề án số hóa AED — Không dùng thay thế chỉ dẫn y tế trong cấp cứu thật.',
  },

  // Hà Nội Hoàn Kiếm
  {
    id: 'fac_hosp_vietduc_hn',
    name: 'Bệnh viện Hữu nghị Việt Đức (Cấp cứu Ngoại khoa)',
    type: 'hospital',
    address: '40 Tràng Thi, Hàng Bông, Hoàn Kiếm, Hà Nội',
    lat: 21.0288,
    lng: 105.8475,
    phone: '02438253531',
    operatingHours: '24/7',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu minh họa — không dùng để điều hướng trong cấp cứu thật.',
  },
  {
    id: 'fac_aed_trangtien_hn',
    name: 'Điểm AED Minh Họa — Tràng Tiền Plaza',
    type: 'aed',
    address: '24 Hai Bà Trưng, Tràng Tiền, Hoàn Kiếm, Hà Nội',
    lat: 21.0258,
    lng: 105.8548,
    operatingHours: '09:30 - 22:00',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu mô phỏng theo đề án số hóa AED — Không dùng thay thế chỉ dẫn y tế trong cấp cứu thật.',
  },

  // Hà Nội Đống Đa
  {
    id: 'fac_hosp_bachmai_hn',
    name: 'Bệnh viện Bạch Mai (Trung tâm Cấp cứu A9)',
    type: 'hospital',
    address: '78 Đường Giải Phóng, Phương Mai, Đống Đa, Hà Nội',
    lat: 21.0035,
    lng: 105.8402,
    phone: '02438693731',
    operatingHours: '24/7',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu minh họa — không dùng để điều hướng trong cấp cứu thật.',
  },

  // Đà Nẵng Hải Châu
  {
    id: 'fac_hosp_danang',
    name: 'Bệnh viện Đà Nẵng (Khoa Cấp cứu 24/7)',
    type: 'hospital',
    address: '124 Hải Phòng, Thạch Thang, Hải Châu, Đà Nẵng',
    lat: 16.0745,
    lng: 108.2178,
    phone: '02363821118',
    operatingHours: '24/7',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu minh họa — không dùng để điều hướng trong cấp cứu thật.',
  },
  {
    id: 'fac_aed_caurong_dn',
    name: 'Điểm AED Minh Họa — Công viên Cầu Rồng',
    type: 'aed',
    address: 'Đường Bạch Đằng, Phước Ninh, Hải Châu, Đà Nẵng',
    lat: 16.0605,
    lng: 108.2232,
    operatingHours: '24/7',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu mô phỏng theo đề án số hóa AED — Không dùng thay thế chỉ dẫn y tế trong cấp cứu thật.',
  },

  // Nha Trang Khánh Hòa
  {
    id: 'fac_hosp_khanhhoa',
    name: 'Bệnh viện Đa khoa Tỉnh Khánh Hòa (Cấp cứu)',
    type: 'hospital',
    address: '19 Yersin, Lộc Thọ, TP. Nha Trang, Khánh Hòa',
    lat: 12.2472,
    lng: 109.1915,
    phone: '02583822175',
    operatingHours: '24/7',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu minh họa — không dùng để điều hướng trong cấp cứu thật.',
  },
  {
    id: 'fac_aed_quangtruong24_nt',
    name: 'Điểm AED Minh Họa — Quảng Trường 2/4',
    type: 'aed',
    address: 'Đường Trần Phú, Lộc Thọ, TP. Nha Trang, Khánh Hòa',
    lat: 12.2388,
    lng: 109.1967,
    operatingHours: '24/7',
    isOpenNow: true,
    source: 'synthetic_simulation',
    disclaimer: 'Dữ liệu mô phỏng theo đề án số hóa AED — Không dùng thay thế chỉ dẫn y tế trong cấp cứu thật.',
  },
];

// Inner Google Map Controller (only invoked if Google Maps API key is configured)
interface GoogleMapControllerProps {
  center: { lat: number; lng: number };
  facilities: CareFacility[];
  selectedFacilityId: string | null;
  onSelectFacility: (id: string) => void;
  selectedType: string;
  onPlacesFound: (places: CareFacility[]) => void;
  onErrorState: (err: string | null) => void;
}

const GoogleMapInnerController: React.FC<GoogleMapControllerProps> = ({
  center,
  facilities,
  selectedFacilityId,
  onSelectFacility,
  selectedType,
  onPlacesFound,
  onErrorState,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const lastSearchCenterRef = useRef<{ lat: number; lng: number; type: string } | null>(null);

  useEffect(() => {
    if (map) {
      map.panTo(center);
    }
  }, [map, center]);

  useEffect(() => {
    if (map && selectedFacilityId) {
      const target = facilities.find((f) => f.id === selectedFacilityId);
      if (target) {
        map.panTo({ lat: target.lat, lng: target.lng });
      }
    }
  }, [map, selectedFacilityId, facilities]);

  useEffect(() => {
    if (!placesLib || !map) return;
    if (selectedType === 'aed') return;

    const key = `${center.lat.toFixed(4)}_${center.lng.toFixed(4)}_${selectedType}`;
    if (
      lastSearchCenterRef.current &&
      lastSearchCenterRef.current.lat === center.lat &&
      lastSearchCenterRef.current.lng === center.lng &&
      lastSearchCenterRef.current.type === selectedType
    ) {
      return;
    }
    lastSearchCenterRef.current = { lat: center.lat, lng: center.lng, type: selectedType };

    const typeMapping: Record<string, string[]> = {
      all: ['hospital', 'pharmacy', 'doctor'],
      hospital: ['hospital'],
      clinic: ['doctor', 'medical_lab'],
      pharmacy: ['pharmacy', 'drugstore'],
    };

    const typesToSearch = typeMapping[selectedType] || ['hospital'];

    const searchNearbyPlaces = async () => {
      try {
        if ((placesLib as any).Place && typeof (placesLib as any).Place.searchNearby === 'function') {
          const request = {
            includedPrimaryTypes: typesToSearch,
            locationRestriction: {
              center: { lat: center.lat, lng: center.lng },
              radius: 6000,
            },
            fields: [
              'id',
              'displayName',
              'formattedAddress',
              'location',
              'currentOpeningHours',
              'regularOpeningHours',
              'primaryType',
              'types',
              'nationalPhoneNumber',
              'googleMapsURI',
            ],
            maxResultCount: 15,
          };

          const response = await (placesLib as any).Place.searchNearby(request);
          if (response && response.places && Array.isArray(response.places)) {
            const mappedGooglePlaces: CareFacility[] = response.places
              .filter((p: any) => p.location && (p.location.lat || typeof p.location.lat === 'function'))
              .map((p: any) => {
                const lat = typeof p.location.lat === 'function' ? p.location.lat() : p.location.lat;
                const lng = typeof p.location.lng === 'function' ? p.location.lng() : p.location.lng;
                const pType: string = p.primaryType || (p.types && p.types[0]) || 'hospital';

                let resolvedType: CareFacility['type'] = 'hospital';
                if (pType.includes('pharmacy') || pType.includes('drug')) resolvedType = 'pharmacy';
                else if (pType.includes('doctor') || pType.includes('clinic')) resolvedType = 'clinic';

                return {
                  id: `gplace_${p.id}`,
                  name: p.displayName || 'Cơ sở Y tế',
                  type: resolvedType,
                  address: p.formattedAddress || 'Địa chỉ đang cập nhật',
                  lat,
                  lng,
                  phone: p.nationalPhoneNumber || undefined,
                  isOpenNow: p.currentOpeningHours?.openNow ?? p.regularOpeningHours?.openNow,
                  source: 'google_places' as FacilitySource,
                  disclaimer: 'Dữ liệu thời gian thực từ Google Places API.',
                  googleMapsUrl: p.googleMapsURI || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.displayName || 'Bệnh viện')}&query_place_id=${p.id}`,
                };
              });

            onPlacesFound(mappedGooglePlaces);
            onErrorState(null);
          }
        }
      } catch (err: any) {
        console.warn('Google Places searchNearby error:', err);
        onErrorState('places_error');
      }
    };

    searchNearbyPlaces();
  }, [placesLib, map, center, selectedType, onPlacesFound, onErrorState]);

  return (
    <>
      <AdvancedMarker position={center} zIndex={50}>
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-[#175CD3]/20 animate-ping absolute" />
          <div className="w-6 h-6 rounded-full bg-[#175CD3] border-2 border-white text-white flex items-center justify-center shadow-md">
            <Compass className="w-3.5 h-3.5" />
          </div>
        </div>
      </AdvancedMarker>

      {facilities.map((fac) => {
        const isSelected = fac.id === selectedFacilityId;
        const isAed = fac.type === 'aed';
        const isHospital = fac.type === 'hospital' || fac.type === 'emergency_station';
        const isPharmacy = fac.type === 'pharmacy';

        return (
          <AdvancedMarker
            key={fac.id}
            position={{ lat: fac.lat, lng: fac.lng }}
            onClick={() => onSelectFacility(fac.id)}
            zIndex={isSelected ? 100 : 10}
          >
            <div
              className={`p-1.5 rounded-xl border-2 shadow-md transition-all cursor-pointer flex items-center gap-1 ${
                isSelected
                  ? 'bg-[#101828] text-white border-white scale-110'
                  : 'bg-white text-[#101828] border-[#EAECF0] hover:scale-105'
              }`}
            >
              {isAed ? (
                <Zap className={`w-4 h-4 ${isSelected ? 'text-[#FEDF89]' : 'text-[#DC6803]'}`} />
              ) : isHospital ? (
                <Building2 className={`w-4 h-4 ${isSelected ? 'text-[#FEE4E2]' : 'text-[#D92D20]'}`} />
              ) : isPharmacy ? (
                <Pill className={`w-4 h-4 ${isSelected ? 'text-[#99F6E0]' : 'text-[#0E9384]'}`} />
              ) : (
                <Stethoscope className={`w-4 h-4 ${isSelected ? 'text-[#B2DDFF]' : 'text-[#175CD3]'}`} />
              )}
              {isSelected && <span className="text-[11px] font-bold pr-1 max-w-[120px] truncate">{fac.name}</span>}
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
};

export const NearbyCareView: React.FC = () => {
  const googleMapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const isKeyAvailable = Boolean(googleMapsApiKey && googleMapsApiKey.length > 5);

  // Geographic center and selection state
  const [selectedRegionId, setSelectedRegionId] = useState<string>('hcm_q10');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [activeCenter, setActiveCenter] = useState<{ lat: number; lng: number }>(PRESET_REGIONS[3]); // Default HCM Q10

  // Geolocation interaction state
  const [geoState, setGeoState] = useState<'idle' | 'locating' | 'granted' | 'denied' | 'error'>('idle');
  const [geoAccuracyMeters, setGeoAccuracyMeters] = useState<number | null>(null);

  // Filters & Search
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

  // Data collections
  const [seedFacilities, setSeedFacilities] = useState<CareFacility[]>(BUILTIN_REGIONAL_FACILITIES);
  const [googlePlaces, setGooglePlaces] = useState<CareFacility[]>([]);
  const [loadingSeed, setLoadingSeed] = useState<boolean>(false);
  const [apiErrorState, setApiErrorState] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  const cardListRef = useRef<HTMLDivElement>(null);

  // Monitor network online/offline state
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch verified facilities from server store, fallback to built-in
  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const res = await apiClient.getMapData();
        if (res.facilities && res.facilities.length > 0) {
          const mapped: CareFacility[] = res.facilities.map((f: CommunityFacility) => {
            const isOfficial115 = f.id === 'fac_station_115_hcm' || f.id === 'fac_hosp_nd115';
            return {
              id: f.id,
              name: f.name,
              type: f.type,
              address: f.address,
              lat: f.lat,
              lng: f.lng,
              operatingHours: f.operatingHours,
              phone: f.type === 'emergency_station' ? '115' : f.type === 'hospital' ? '02838652368' : undefined,
              source: isOfficial115 ? ('verified_official' as FacilitySource) : ('synthetic_simulation' as FacilitySource),
              disclaimer: isOfficial115
                ? 'Cơ sở cấp cứu 115 chính thức trực thuộc Sở Y Tế TP.HCM.'
                : 'Dữ liệu minh họa — không dùng để điều hướng trong cấp cứu thật.',
              googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.name)}`,
            };
          });

          // Merge server facilities with regional baseline
          const combined = [...mapped];
          for (const item of BUILTIN_REGIONAL_FACILITIES) {
            if (!combined.some((c) => c.id === item.id || c.name === item.name)) {
              combined.push(item);
            }
          }
          setSeedFacilities(combined);
        }
      } catch (err) {
        console.warn('Using built-in regional facilities:', err);
      }
    };

    fetchFacilities();
  }, []);

  // User explicitly triggers GPS geolocation
  const handleRequestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoState('error');
      return;
    }

    setGeoState('locating');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserCoords(coords);
        setActiveCenter(coords);
        setGeoAccuracyMeters(Math.round(pos.coords.accuracy));
        setGeoState('granted');
      },
      (err) => {
        console.warn('Geolocation permission denied or error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoState('denied');
        } else {
          setGeoState('error');
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, []);

  // Handle region preset dropdown selection
  const handleSelectPresetRegion = (regionId: string) => {
    setSelectedRegionId(regionId);
    const found = PRESET_REGIONS.find((r) => r.id === regionId);
    if (found) {
      setActiveCenter({ lat: found.lat, lng: found.lng });
      if (geoState !== 'locating') {
        setUserCoords(null);
      }
    }
  };

  // Merge and prioritize facilities
  const combinedFacilities = useMemo(() => {
    const list: CareFacility[] = [];
    const seenNames = new Set<string>();

    // 1. Google Places results (if available via API key)
    for (const gp of googlePlaces) {
      const normalizedName = gp.name.toLowerCase().trim();
      seenNames.add(normalizedName);
      list.push(gp);
    }

    // 2. Verified official stations & Regional baseline
    for (const sf of seedFacilities) {
      const normalizedName = sf.name.toLowerCase().trim();
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName);
        list.push(sf);
      }
    }

    // Compute distance relative to active center
    return list
      .map((f) => {
        const dist = calculateDistanceKm(activeCenter.lat, activeCenter.lng, f.lat, f.lng);
        return { ...f, distanceKm: dist };
      })
      .filter((f) => {
        // Filter by type
        const matchesType =
          selectedType === 'all' ||
          (selectedType === 'hospital' && (f.type === 'hospital' || f.type === 'emergency_station')) ||
          (selectedType === 'clinic' && f.type === 'clinic') ||
          (selectedType === 'pharmacy' && f.type === 'pharmacy') ||
          (selectedType === 'aed' && f.type === 'aed');

        // Filter by search query
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !query ||
          f.name.toLowerCase().includes(query) ||
          f.address.toLowerCase().includes(query);

        return matchesType && matchesSearch;
      })
      .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  }, [googlePlaces, seedFacilities, activeCenter, selectedType, searchQuery]);

  // Scroll card into view when a marker or item is selected
  const handleSelectFacility = (id: string) => {
    setSelectedFacilityId(id);
    const element = document.getElementById(`facility-card-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <div className="min-h-[calc(100vh-var(--header-height))] bg-[#F9FAFB] text-[#1D2939] pb-24 md:pb-16">
      {/* 1. Top Header & Safety Banner */}
      <div className="bg-white border-b border-[#EAECF0] py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3.5">
          {/* Main Title & Tag */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Mạng Lưới Điểm Chạm Y Tế &amp; AED · Mở Toàn Quốc</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#101828]">
                Cơ Sở Hỗ Trợ Gần Bạn
              </h1>
              <p className="text-xs text-[#475467] mt-0.5">
                Tra cứu bệnh viện cấp cứu, phòng khám, nhà thuốc và điểm AED minh họa trên bản đồ mở miễn phí.
              </p>
            </div>

            {/* GPS Trigger Button */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {geoState === 'granted' && userCoords ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ECFDF3] border border-[#A6F4C5] rounded-xl text-xs font-semibold text-[#027A48]">
                  <Compass className="w-3.5 h-3.5 text-[#12B76A]" />
                  <span>GPS Chính xác {geoAccuracyMeters ? `(±${geoAccuracyMeters}m)` : ''}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestGeolocation}
                  disabled={geoState === 'locating'}
                  className="py-2 px-3.5 bg-[#175CD3] hover:bg-[#1849A9] active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  aria-label="Dùng vị trí hiện tại"
                >
                  <Crosshair className={`w-3.5 h-3.5 ${geoState === 'locating' ? 'animate-spin' : ''}`} />
                  <span>{geoState === 'locating' ? 'Đang định vị...' : 'Dùng vị trí hiện tại'}</span>
                </button>
              )}
            </div>
          </div>

          {/* ⚠️ Fixed Safety Banner */}
          <div className="p-3 bg-[#FEF3F2] border border-[#FEE4E2] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start sm:items-center gap-2.5 text-xs text-[#B42318] font-semibold">
              <ShieldAlert className="w-4 h-4 text-[#D92D20] shrink-0 mt-0.5 sm:mt-0" />
              <span>
                Nếu đang có tình huống nguy kịch, hãy gọi 115 ngay lập tức. Bản đồ không thay thế điều phối xe cấp cứu chuyên dụng.
              </span>
            </div>
            <a
              href="tel:115"
              className="py-1.5 px-3.5 bg-[#D92D20] hover:bg-[#B42318] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shrink-0 shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
              <span>GỌI 115 NGAY</span>
            </a>
          </div>

          {/* Area Picker & Keyword Search */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-1">
            {/* Manual Preset Region Selector */}
            <div className="md:col-span-5">
              <label className="text-xs font-bold text-[#475467] block mb-1">
                Khu vực tìm kiếm {geoState === 'denied' && <span className="text-[#D92D20] font-normal">(Do từ chối GPS)</span>}:
              </label>
              <select
                value={selectedRegionId}
                onChange={(e) => handleSelectPresetRegion(e.target.value)}
                className="w-full py-2 px-3 bg-[#F9FAFB] border border-[#EAECF0] rounded-xl text-xs font-medium text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#175CD3]"
              >
                {PRESET_REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Keyword Search Input */}
            <div className="md:col-span-7">
              <label className="text-xs font-bold text-[#475467] block mb-1">Tìm kiếm theo tên hoặc đường:</label>
              <div className="relative">
                <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ví dụ: Bệnh viện Nhân Dân 115, Chợ Rẫy, đường Sư Vạn Hạnh..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#175CD3]"
                />
              </div>
            </div>
          </div>

          {/* Map Engine Banner */}
          <div className="p-2.5 bg-[#F0FDF9] border border-[#99F6E0] rounded-xl text-xs text-[#0E9384] flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#0E9384] shrink-0" />
              <span>
                {isKeyAvailable
                  ? 'Đang kết nối dịch vụ Google Maps Platform.'
                  : 'Đang hoạt động trên nền tảng bản đồ mở OpenStreetMap (Hoàn toàn miễn phí — không yêu cầu thẻ ngân hàng hay API Key).'}
              </span>
            </div>
            <span className="text-[11px] font-bold text-[#0E9384] px-2 py-0.5 bg-white rounded border border-[#99F6E0] shrink-0">
              {isKeyAvailable ? 'Google Maps' : 'OpenStreetMap (Free)'}
            </span>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { key: 'all', label: 'Tất cả cơ sở', icon: Building2 },
              { key: 'hospital', label: 'Bệnh viện & Cấp cứu 115', icon: Building2 },
              { key: 'clinic', label: 'Phòng khám', icon: Stethoscope },
              { key: 'pharmacy', label: 'Nhà thuốc', icon: Pill },
              { key: 'aed', label: 'Máy AED (Minh họa)', icon: Zap },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedType === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedType(tab.key)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#175CD3] text-white shadow-2xs'
                      : 'bg-[#F2F4F7] text-[#475467] hover:bg-[#EAECF0] hover:text-[#101828]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Main Interactive Map & Facilities Grid */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
        {/* Map View Box */}
        <div className="bg-white border border-[#EAECF0] rounded-2xl p-2 sm:p-3 shadow-2xs overflow-hidden">
          <div className="h-[280px] sm:h-[380px] w-full rounded-xl overflow-hidden relative bg-[#F2F4F7]">
            {isKeyAvailable ? (
              <APIProvider apiKey={googleMapsApiKey} libraries={['places', 'marker', 'geometry', 'core']}>
                <Map
                  defaultCenter={activeCenter}
                  defaultZoom={14}
                  mapId="DEMO_MAP_ID"
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  clickableIcons={false}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  className="w-full h-full"
                >
                  <GoogleMapInnerController
                    center={activeCenter}
                    facilities={combinedFacilities}
                    selectedFacilityId={selectedFacilityId}
                    onSelectFacility={handleSelectFacility}
                    selectedType={selectedType}
                    onPlacesFound={(places) => setGooglePlaces(places)}
                    onErrorState={(err) => setApiErrorState(err)}
                  />
                </Map>
              </APIProvider>
            ) : (
              /* High-Performance, Free Leaflet + OpenStreetMap Map View */
              <LeafletMapView
                center={activeCenter}
                facilities={combinedFacilities}
                selectedFacilityId={selectedFacilityId}
                onSelectFacility={handleSelectFacility}
                userCoords={userCoords}
              />
            )}
          </div>
        </div>

        {/* 3. Facilities Cards List */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider flex items-center gap-2">
              <span>Kết Quả Tìm Kiếm</span>
              <span className="text-xs text-slate-400 font-normal">·</span>
              <span className="text-xs font-mono font-bold tabular-nums text-blue-600">
                {combinedFacilities.length} cơ sở
              </span>
            </h2>
            <span className="text-xs text-slate-500">Sắp xếp theo khoảng cách gần nhất</span>
          </div>

          {combinedFacilities.length === 0 ? (
            <div className="p-8 bg-white border border-[#EAECF0] rounded-2xl text-center space-y-2">
              <Building2 className="w-8 h-8 text-[#98A2B3] mx-auto" />
              <h3 className="text-sm font-bold text-[#101828]">Không tìm thấy cơ sở y tế phù hợp</h3>
              <p className="text-xs text-[#667085] max-w-sm mx-auto">
                Thử chọn tab "Tất cả cơ sở", đổi từ khóa tìm kiếm hoặc chuyển sang khu vực lân cận trong danh sách thả xuống.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4" ref={cardListRef}>
              {combinedFacilities.map((fac) => {
                const isSelected = fac.id === selectedFacilityId;
                const isAed = fac.type === 'aed';
                const isHospital = fac.type === 'hospital' || fac.type === 'emergency_station';
                const isPharmacy = fac.type === 'pharmacy';

                // Source configuration
                const isGoogleSource = fac.source === 'google_places';
                const isVerified = fac.source === 'verified_official';
                const isSimulated = fac.source === 'synthetic_simulation';

                const directDirectionUrl = `https://www.google.com/maps/dir/?api=1&destination=${fac.lat},${fac.lng}`;
                const viewOnMapUrl = fac.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fac.name)}`;

                return (
                  <div
                    key={fac.id}
                    id={`facility-card-${fac.id}`}
                    onClick={() => handleSelectFacility(fac.id)}
                    className={`bg-white border rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-2 border-[#175CD3] ring-2 ring-[#175CD3]/10'
                        : 'border-[#EAECF0] hover:border-[#175CD3]'
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Facility Metadata (Zero-Pill Compliance) */}
                      <div className="flex items-center justify-between">
                        <MetadataRow
                          items={[
                            isAed ? 'Điểm AED' : isHospital ? 'Bệnh viện Cấp cứu' : isPharmacy ? 'Nhà thuốc' : 'Phòng khám',
                            fac.distanceKm !== undefined ? `~${fac.distanceKm} km` : null,
                          ]}
                          className="text-xs font-semibold text-blue-700"
                        />
                        {fac.distanceKm !== undefined && (
                          <span className="text-xs font-mono tabular-nums font-bold text-blue-600">
                            {fac.distanceKm} km
                          </span>
                        )}
                      </div>

                      {/* Facility Name */}
                      <h3 className="text-sm sm:text-base font-bold text-[#101828] leading-snug">
                        {fac.name}
                      </h3>

                      {/* Address */}
                      <p className="text-xs text-[#475467] leading-relaxed flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#98A2B3] shrink-0 mt-0.5" />
                        <span>{fac.address}</span>
                      </p>

                      {/* Operating Hours */}
                      <div className="flex items-center gap-2 text-xs text-[#667085]">
                        <Clock className="w-3 h-3 text-[#98A2B3]" />
                        <span>
                          {fac.isOpenNow !== undefined
                            ? fac.isOpenNow
                              ? '🟢 Đang mở cửa'
                              : '🔴 Hiện đang đóng cửa'
                            : fac.operatingHours
                            ? `Giờ trực: ${fac.operatingHours}`
                            : '24/7 Cấp cứu'}
                        </span>
                      </div>

                      {/* Provenance Badge */}
                      <div className="pt-1">
                        {isGoogleSource && (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#027A48] bg-[#ECFDF3] px-2 py-0.5 rounded border border-[#A6F4C5]">
                            <CheckCircle2 className="w-3 h-3 text-[#12B76A]" />
                            <span>Nguồn: Google Places API</span>
                          </div>
                        )}

                        {isVerified && (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#175CD3] bg-[#EFF8FF] px-2 py-0.5 rounded border border-[#B2DDFF]">
                            <CheckCircle2 className="w-3 h-3 text-[#175CD3]" />
                            <span>Nguồn: Trạm Cấp cứu 115 Chính thức</span>
                          </div>
                        )}

                        {isSimulated && (
                          <div className="p-1.5 bg-[#FEF0C7] rounded border border-[#FEDF89] text-[11px] text-[#B54708] font-medium leading-tight">
                            <span>Nguồn: Dữ liệu minh họa — không dùng để điều hướng trong cấp cứu thật.</span>
                          </div>
                        )}
                      </div>

                      {/* AED Disclaimer */}
                      {isAed && (
                        <p className="text-[11px] text-[#B54708] bg-[#FFFAEB] p-1.5 rounded border border-[#FEDF89] leading-tight">
                          ⚠️ Điểm AED mô phỏng đề án. Trong tình huống thật, hãy gọi 115 và ép tim liên tục không gián đoạn.
                        </p>
                      )}
                    </div>

                    {/* Action Buttons: Gọi, Chỉ đường, Bản đồ (min 44px tap targets) */}
                    <div className="pt-3 border-t border-[#EAECF0] grid grid-cols-3 gap-2">
                      <a
                        href={fac.phone ? `tel:${fac.phone.replace(/\s+/g, '')}` : 'tel:115'}
                        onClick={(e) => e.stopPropagation()}
                        className="min-h-[44px] px-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-center shadow-xs cursor-pointer"
                        aria-label={`Gọi điện cho ${fac.name}`}
                      >
                        <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{fac.phone ? 'Gọi ngay' : 'Gọi 115'}</span>
                      </a>

                      <a
                        href={directDirectionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="min-h-[44px] px-2 bg-blue-50 hover:bg-blue-100 active:scale-[0.98] text-blue-700 border border-blue-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-center shadow-2xs cursor-pointer"
                        aria-label={`Mở chỉ đường tới ${fac.name}`}
                      >
                        <NavigationIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Chỉ đường</span>
                      </a>

                      <a
                        href={viewOnMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="min-h-[44px] px-2 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] text-slate-700 border border-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-center shadow-2xs cursor-pointer"
                        aria-label={`Xem ${fac.name} trên Google Maps`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Bản đồ</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
