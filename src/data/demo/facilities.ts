import type { CareFacility } from '../../features/nearby/types';

type Row = [id: string, name: string, type: CareFacility['type'], address: string, province: string, lat: number, lng: number, hours?: string];

const FIXTURE_UPDATED_AT = '2026-10-18T08:00:00+07:00';

const rows: Row[] = [
  // TP. Hồ Chí Minh — hospitals & clinics
  ['hcm-h01', 'Bệnh viện Đa khoa An Phúc Sài Gòn', 'hospital', '215 Nguyễn Thị Minh Khai, Phường Nguyễn Cư Trinh, Quận 1', 'TP. Hồ Chí Minh', 10.7702, 106.6905, 'Cấp cứu 24/7'],
  ['hcm-h02', 'Bệnh viện Tim mạch Bình Minh', 'hospital', '48 Điện Biên Phủ, Phường 6, Quận 3', 'TP. Hồ Chí Minh', 10.7861, 106.6889, 'Cấp cứu 24/7'],
  ['hcm-h03', 'Trung tâm Cấp cứu Thủ Thiêm', 'emergency_station', '12 Mai Chí Thọ, Phường An Khánh, TP. Thủ Đức', 'TP. Hồ Chí Minh', 10.7871, 106.7219, 'Cấp cứu 24/7'],
  ['hcm-h04', 'Bệnh viện Đa khoa Phú Nhuận Xanh', 'hospital', '130 Phan Đăng Lưu, Phường 3, Quận Phú Nhuận', 'TP. Hồ Chí Minh', 10.8009, 106.6812, 'Cấp cứu 24/7'],
  ['hcm-h05', 'Bệnh viện Nhân Ái Quận 7', 'hospital', '90 Nguyễn Thị Thập, Phường Tân Phú, Quận 7', 'TP. Hồ Chí Minh', 10.7385, 106.7183, 'Cấp cứu 24/7'],
  ['hcm-h06', 'Bệnh viện Đa khoa Tân Bình Mới', 'hospital', '402 Cộng Hòa, Phường 13, Quận Tân Bình', 'TP. Hồ Chí Minh', 10.8017, 106.6455, 'Cấp cứu 24/7'],
  ['hcm-h07', 'Bệnh viện Hy Vọng Gò Vấp', 'hospital', '75 Quang Trung, Phường 10, Quận Gò Vấp', 'TP. Hồ Chí Minh', 10.8309, 106.6667, 'Cấp cứu 24/7'],
  ['hcm-h08', 'Bệnh viện Đa khoa Chợ Lớn Mới', 'hospital', '310 Hồng Bàng, Phường 11, Quận 5', 'TP. Hồ Chí Minh', 10.7553, 106.6602, 'Cấp cứu 24/7'],
  ['hcm-c01', 'Phòng khám Đa khoa Bến Nghé', 'clinic', '22 Lê Thánh Tôn, Phường Bến Nghé, Quận 1', 'TP. Hồ Chí Minh', 10.7787, 106.7024, '07:00 – 20:00'],
  ['hcm-c02', 'Phòng khám Gia đình An Khang', 'clinic', '61 Võ Văn Tần, Phường 6, Quận 3', 'TP. Hồ Chí Minh', 10.7768, 106.6923, '07:30 – 19:30'],
  ['hcm-c03', 'Phòng khám Đa khoa Bình Thạnh Xanh', 'clinic', '188 Xô Viết Nghệ Tĩnh, Phường 21, Quận Bình Thạnh', 'TP. Hồ Chí Minh', 10.7964, 106.7112, '07:00 – 21:00'],
  ['hcm-c04', 'Trạm Y tế Phường Thảo Điền', 'clinic', '9 Quốc Hương, Phường Thảo Điền, TP. Thủ Đức', 'TP. Hồ Chí Minh', 10.8045, 106.7329, '07:00 – 17:00'],
  ['hcm-c05', 'Phòng khám Đa khoa Quận 10 Nhân Hòa', 'clinic', '255 Ba Tháng Hai, Phường 10, Quận 10', 'TP. Hồ Chí Minh', 10.7724, 106.6708, '07:00 – 20:00'],
  ['hcm-c06', 'Trạm Y tế Làng Đại học', 'clinic', 'Khu phố 6, Phường Linh Trung, TP. Thủ Đức', 'TP. Hồ Chí Minh', 10.8701, 106.8031, '07:00 – 17:00'],
  // TP. Hồ Chí Minh — AED points
  ['hcm-a01', 'Điểm AED – Sảnh Tòa nhà Sông Sài', 'aed', '36 Tôn Đức Thắng, Phường Bến Nghé, Quận 1', 'TP. Hồ Chí Minh', 10.7801, 106.7058],
  ['hcm-a02', 'Điểm AED – Nhà văn hóa Phường Bến Thành', 'aed', '14 Lê Lai, Phường Bến Thành, Quận 1', 'TP. Hồ Chí Minh', 10.7712, 106.6965],
  ['hcm-a03', 'Điểm AED – Trung tâm Thể thao Kỳ Hòa Mới', 'aed', '238 Ba Tháng Hai, Quận 10', 'TP. Hồ Chí Minh', 10.7718, 106.6731],
  ['hcm-a04', 'Điểm AED – Công viên Lê Văn Tám (cổng chính)', 'aed', 'Hai Bà Trưng, Phường Đa Kao, Quận 1', 'TP. Hồ Chí Minh', 10.7889, 106.6953],
  ['hcm-a05', 'Điểm AED – Sảnh Trung tâm Hội nghị Phú Mỹ', 'aed', '801 Nguyễn Văn Linh, Phường Tân Phú, Quận 7', 'TP. Hồ Chí Minh', 10.7296, 106.7211],
  ['hcm-a06', 'Điểm AED – Ga xe buýt Thủ Đức Trung tâm', 'aed', 'Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức', 'TP. Hồ Chí Minh', 10.8504, 106.7577],
  ['hcm-a07', 'Điểm AED – Nhà thi đấu Phú Nhuận Mới', 'aed', '3 Hoàng Minh Giám, Quận Phú Nhuận', 'TP. Hồ Chí Minh', 10.8058, 106.6766],
  ['hcm-a08', 'Điểm AED – Thư viện Cộng đồng Quận 3', 'aed', '120 Trần Quốc Thảo, Phường Võ Thị Sáu, Quận 3', 'TP. Hồ Chí Minh', 10.7852, 106.6862],
  ['hcm-a09', 'Điểm AED – Ký túc xá Khu B Làng Đại học', 'aed', 'Đường Mạc Đĩnh Chi, Phường Đông Hòa, TP. Dĩ An', 'Bình Dương', 10.8845, 106.7822],
  ['hcm-a10', 'Điểm AED – Sảnh Bến tàu Bạch Đằng Mới', 'aed', '10B Tôn Đức Thắng, Phường Bến Nghé, Quận 1', 'TP. Hồ Chí Minh', 10.7745, 106.7071],

  // Hà Nội
  ['hn-h01', 'Bệnh viện Đa khoa Hồng Hà Thủ đô', 'hospital', '45 Phố Huế, Quận Hai Bà Trưng', 'Hà Nội', 21.0158, 105.8519, 'Cấp cứu 24/7'],
  ['hn-h02', 'Bệnh viện Tim mạch Tây Hồ An', 'hospital', '18 Thụy Khuê, Quận Tây Hồ', 'Hà Nội', 21.0436, 105.8231, 'Cấp cứu 24/7'],
  ['hn-c01', 'Phòng khám Đa khoa Hoàn Kiếm Xanh', 'clinic', '7 Hàng Bài, Quận Hoàn Kiếm', 'Hà Nội', 21.0249, 105.8527, '07:00 – 20:00'],
  ['hn-a01', 'Điểm AED – Nhà văn hóa Cầu Giấy Mới', 'aed', '99 Trần Đăng Ninh, Quận Cầu Giấy', 'Hà Nội', 21.0362, 105.7952],
  ['hn-a02', 'Điểm AED – Sảnh Trung tâm Triển lãm Ba Đình', 'aed', '22 Kim Mã, Quận Ba Đình', 'Hà Nội', 21.0318, 105.8231],

  // Hải Phòng / Quảng Ninh
  ['hp-h01', 'Bệnh viện Đa khoa Cảng Biển', 'hospital', '1 Nhà Thương, Quận Lê Chân', 'Hải Phòng', 20.8561, 106.6822, 'Cấp cứu 24/7'],
  ['qn-a01', 'Điểm AED – Quảng trường Bãi Cháy Mới', 'aed', 'Hạ Long, Phường Bãi Cháy', 'Quảng Ninh', 20.9541, 107.0503],

  // Miền Trung
  ['dn-h01', 'Bệnh viện Đa khoa Sông Hàn', 'hospital', '124 Hải Phòng, Quận Hải Châu', 'Đà Nẵng', 16.0718, 108.2156, 'Cấp cứu 24/7'],
  ['dn-c01', 'Phòng khám Đa khoa Mỹ Khê', 'clinic', '210 Võ Nguyên Giáp, Quận Sơn Trà', 'Đà Nẵng', 16.0632, 108.2459, '07:00 – 21:00'],
  ['dn-a01', 'Điểm AED – Nhà ga Hành khách Sông Hàn', 'aed', '2 Bạch Đằng, Quận Hải Châu', 'Đà Nẵng', 16.0679, 108.2241],
  ['hue-h01', 'Bệnh viện Đa khoa Hương Giang', 'hospital', '16 Lê Lợi, Phường Vĩnh Ninh', 'Huế', 16.4625, 107.5856, 'Cấp cứu 24/7'],
  ['na-h01', 'Bệnh viện Đa khoa Lam Hồng', 'hospital', '178 Trường Thi, TP. Vinh', 'Nghệ An', 18.6739, 105.6922, 'Cấp cứu 24/7'],
  ['kh-h01', 'Bệnh viện Đa khoa Biển Xanh Nha Trang', 'hospital', '19 Yersin, Phường Vạn Thạnh, Nha Trang', 'Khánh Hòa', 12.2483, 109.1904, 'Cấp cứu 24/7'],
  ['kh-a01', 'Điểm AED – Bảo tàng Biển Cầu Đá Mới', 'aed', 'Cầu Đá, Phường Vĩnh Nguyên, Nha Trang', 'Khánh Hòa', 12.2072, 109.2141],
  ['ld-c01', 'Phòng khám Đa khoa Đồi Thông', 'clinic', '5 Trần Phú, Phường 3, Đà Lạt', 'Lâm Đồng', 11.9365, 108.4378, '07:00 – 19:00'],

  // Miền Nam khác
  ['vt-h01', 'Bệnh viện Đa khoa Bãi Trước', 'hospital', '27 Lê Lợi, Phường 1, Vũng Tàu', 'Bà Rịa - Vũng Tàu', 10.3487, 107.0786, 'Cấp cứu 24/7'],
  ['bd-h01', 'Bệnh viện Đa khoa Thủ Dầu Một Mới', 'hospital', '5 Phạm Ngọc Thạch, TP. Thủ Dầu Một', 'Bình Dương', 10.9802, 106.6561, 'Cấp cứu 24/7'],
  ['ct-h01', 'Bệnh viện Đa khoa Ninh Kiều Tây Đô', 'hospital', '315 Nguyễn Văn Cừ, Quận Ninh Kiều', 'Cần Thơ', 10.0336, 105.7559, 'Cấp cứu 24/7'],
  ['ct-a01', 'Điểm AED – Bến Ninh Kiều (nhà chờ)', 'aed', 'Hai Bà Trưng, Quận Ninh Kiều', 'Cần Thơ', 10.0341, 105.7881],
];

export const FIXTURE_FACILITIES: CareFacility[] = rows.map(([id, name, type, address, province, lat, lng, hours]) => ({
  id: `fx-${id}`,
  name,
  type,
  address,
  province,
  lat,
  lng,
  operatingHours: hours ?? (type === 'aed' ? 'Theo giờ mở cửa của địa điểm' : 'Chưa có giờ hoạt động'),
  origin: 'fixture',
  verification: 'unverified',
  updatedAt: FIXTURE_UPDATED_AT,
  sourceLabel: 'Danh bạ GoldenMinutes',
}));
