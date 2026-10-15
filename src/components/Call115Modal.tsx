import React, { useState, useEffect } from 'react';
import { PhoneCall, X, AlertTriangle, ShieldCheck, MapPin, Activity, Copy, Check } from 'lucide-react';

interface Call115ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCallInitiated?: () => void;
  currentAddressHint?: string;
  incidentTypeHint?: string;
}

export const Call115Modal: React.FC<Call115ModalProps> = ({
  isOpen,
  onClose,
  onCallInitiated,
  currentAddressHint = 'Hiện trường đang đứng',
  incidentTypeHint = 'Nghi ngờ tình trạng cấp cứu ngoài bệnh viện',
}) => {
  const [gpsLocation, setGpsLocation] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(5);
          const lng = pos.coords.longitude.toFixed(5);
          setGpsLocation(`Tọa độ GPS: ${lat}, ${lng}`);
        },
        () => {
          // ignore or fallback silently
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDial = () => {
    if (onCallInitiated) onCallInitiated();
    window.location.href = 'tel:115';
  };

  const handleCopyLocation = () => {
    const textToCopy = `${currentAddressHint} ${gpsLocation ? `(${gpsLocation})` : ''}`.trim();
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl w-full max-w-[calc(100vw-24px)] sm:max-w-md p-4 sm:p-6 shadow-2xl border border-[#EAECF0] max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Kết nối 115 khẩn cấp"
      >
        {/* Close Button (min 44px tap target) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer active:scale-95"
          aria-label="Đóng cửa sổ gọi 115"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Kicker */}
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-600 mb-2">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Kết Nối Khẩn Cấp Tổng Đài 115</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
          Gọi 115 Ngay Lập Tức
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
          Ứng dụng mở trình gọi điện của thiết bị với số 115. GoldenMinutes không kết nối hoặc điều phối trực tiếp với hệ thống 115.
        </p>

        {/* Dispatcher Checklist Card */}
        <div className="my-3.5 bg-[#F9FAFB] border border-[#EAECF0] rounded-xl p-3 sm:p-4 text-xs space-y-2.5">
          <div className="font-bold text-[#101828] flex items-center justify-between pb-2 border-b border-[#EAECF0]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#175CD3]" />
              <span>3 Thông Tin Cần Báo Ngay Với Tổng Đài:</span>
            </div>
            <button
              type="button"
              onClick={handleCopyLocation}
              className="text-[11px] text-[#175CD3] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              title="Sao chép thông tin vị trí"
            >
              {copied ? <Check className="w-3 h-3 text-[#12B76A]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Đã chép' : 'Sao chép vị trí'}</span>
            </button>
          </div>

          <div className="flex items-start gap-2 text-[#344054]">
            <MapPin className="w-4 h-4 text-[#D92D20] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#101828]">1. Vị trí chính xác:</span>{' '}
              {currentAddressHint}
              {gpsLocation && (
                <div className="text-xs font-mono text-[#175CD3] mt-0.5 font-semibold">
                  {gpsLocation}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 text-[#344054]">
            <Activity className="w-4 h-4 text-[#175CD3] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#101828]">2. Tình trạng nạn nhân:</span>{' '}
              {incidentTypeHint}
            </div>
          </div>

          <div className="flex items-start gap-2 text-[#344054]">
            <PhoneCall className="w-4 h-4 text-[#12B76A] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#101828]">3. Số người bị nạn &amp;</span>{' '}
              người đang thực hiện sơ cứu tại chỗ.
            </div>
          </div>
        </div>

        {/* Action Buttons (min 48px / 44px) */}
        <button
          type="button"
          onClick={handleDial}
          className="w-full min-h-[48px] py-3 sm:py-3.5 px-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-sm sm:text-base font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
          aria-label="Bấm để gọi 115 ngay"
        >
          <PhoneCall className="w-4 h-4 animate-pulse" />
          <span>BẤM GỌI 115 NGAY</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] mt-2 py-2 text-center text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-all cursor-pointer active:scale-[0.98]"
        >
          Quay lại màn hình hướng dẫn
        </button>
      </div>
    </div>
  );
};
