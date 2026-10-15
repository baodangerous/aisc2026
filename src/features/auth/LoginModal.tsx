import React, { useState } from 'react';
import { X, Shield, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from './AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { loginWithGoogle, isLoading, isFirebaseReady } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setErrorMsg(err.message || 'Không thể đăng nhập bằng tài khoản Google. Vui lòng thử lại.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl w-full max-w-[calc(100vw-24px)] sm:max-w-md p-5 sm:p-6 shadow-2xl border border-[#EAECF0] max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Đăng nhập tài khoản"
      >
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer active:scale-95"
          aria-label="Đóng cửa sổ"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#EFF8FF] text-[#175CD3] flex items-center justify-center font-bold shrink-0 shadow-xs">
            <Shield className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#101828] leading-tight">
              Đăng nhập GoldenMinutes
            </h2>
            <p className="text-xs text-[#667085]">
              Lưu tiến trình luyện tập và hồ sơ tình nguyện cộng đồng
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-3.5 p-2.5 bg-[#FEF3F2] border border-[#FEE4E2] rounded-xl text-xs text-[#B42318] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!isFirebaseReady ? (
          <div className="p-4 bg-[#FEF0C7] border border-[#FEDF89] rounded-xl text-xs text-[#B54708] space-y-2">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 text-[#DC6803]" aria-hidden="true" />
              <span>Cần kết nối Firebase</span>
            </div>
            <p className="leading-relaxed">
              Cần cấu hình Firebase để sử dụng tính năng đăng nhập và đồng bộ dữ liệu đám mây. Bạn vẫn có thể sử dụng đầy đủ các bài tập, xem hướng dẫn và sử dụng danh bạ cơ sở ở chế độ Guest Mode mà không cần đăng nhập.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[#475467] leading-relaxed">
              Đăng nhập an toàn với tài khoản Google để lưu trữ kết quả hoàn thành bài luyện, thời gian phản xạ sơ cứu (ADI) và hồ sơ tiến bộ cộng đồng.
            </p>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full min-h-[48px] py-3 px-4 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-900 border border-slate-300 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-3 shadow-xs transition-all cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isLoading ? 'Đang xác thực...' : 'Tiếp tục với Google (Miễn phí)'}</span>
            </button>

            <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#EAECF0] text-xs text-[#475467] space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-[#344054]">
                <Sparkles className="w-3.5 h-3.5 text-[#175CD3]" aria-hidden="true" />
                <span>Bảo mật theo Nghị định 13/2023/NĐ-CP</span>
              </div>
              <p className="leading-relaxed">
                GoldenMinutes là nền tảng hỗ trợ luyện tập, không thay thế khóa đào tạo sơ cấp cứu được chứng nhận và không phải dịch vụ điều phối 115.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
