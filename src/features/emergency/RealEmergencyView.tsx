import React, { useEffect, useState } from 'react';
import {
  PhoneCall,
  AlertOctagon,
  Heart,
  Brain,
  Droplets,
  Activity,
  CheckCircle2,
  Video,
  MapPin,
  LoaderCircle,
} from 'lucide-react';
import { CPRMetronome } from '../../components/CPRMetronome';
import { Call115Modal } from '../../components/Call115Modal';
import { MEDICAL_DISCLAIMER_VI } from '../../content/approvedScenarios';
import { MetadataRow } from '../../components/common/MetadataSeparators';
import { EmergencyAIAssistant } from './EmergencyAIAssistant';
import { EmergencySceneReport } from './EmergencySceneReport';
import { FirstAidChatbot } from '../ai/FirstAidChatbot';
import { supabase } from '../../services/supabase/client';
import { useAuth } from '../auth/AuthContext';

type EmergencyType = 'ohca' | 'stroke' | 'bleeding' | 'choking';

export const RealEmergencyView: React.FC = () => {
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyType>('ohca');
  const [isCallModalOpen, setIsCallModalOpen] = useState<boolean>(false);
  const { authUser, isAuthenticated } = useAuth();
  const [remoteConsent, setRemoteConsent] = useState(false);
  const [shareLocation, setShareLocation] = useState(false);
  const [requestingGuide, setRequestingGuide] = useState(false);
  const [guideStatus, setGuideStatus] = useState('');
  const [guideRequestId, setGuideRequestId] = useState<string | null>(null);
  const [guideRoomUrl, setGuideRoomUrl] = useState<string | null>(null);
  const [guideRoomToken, setGuideRoomToken] = useState<string | null>(null);

  const emergencyOptions = [
    {
      id: 'ohca' as EmergencyType,
      title: 'Bất tỉnh / Ngừng tim',
      desc: 'Không phản ứng, không thở hoặc thở ngáp cá',
      icon: Heart,
      iconColor: 'text-rose-600',
    },
    {
      id: 'stroke' as EmergencyType,
      title: 'Dấu hiệu Đột quỵ (FAST)',
      desc: 'Méo miệng, yếu liệt tay, nói ngọng/đớ',
      icon: Brain,
      iconColor: 'text-amber-600',
    },
    {
      id: 'bleeding' as EmergencyType,
      title: 'Chảy máu nghiêm trọng',
      desc: 'Máu phun thành tia hoặc ồ ạt không cầm',
      icon: Droplets,
      iconColor: 'text-blue-600',
    },
    {
      id: 'choking' as EmergencyType,
      title: 'Nghẹn dị vật / Tắc thở',
      desc: 'Ôm cổ, tím tái, không ho hoặc nói được',
      icon: Activity,
      iconColor: 'text-purple-600',
    },
  ];

  const requestRemoteGuide = async () => {
    setGuideStatus('');
    if (!supabase || !authUser) { setGuideStatus('Đăng nhập để gửi yêu cầu hỗ trợ. Nếu không thể đăng nhập, tiếp tục trao đổi trực tiếp với tổng đài 115.'); return; }
    if (!remoteConsent) { setGuideStatus('Vui lòng xác nhận đã gọi 115 và đồng ý chia sẻ yêu cầu với người hướng dẫn.'); return; }
    setRequestingGuide(true);
    let coordinates: { latitude: number; longitude: number } | null = null;
    if (shareLocation && navigator.geolocation) {
      try {
        coordinates = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
          (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }), reject,
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
        ));
      } catch { setGuideStatus('Không lấy được vị trí. Bạn vẫn có thể gửi yêu cầu không kèm vị trí.'); setShareLocation(false); }
    }
    const { data, error: requestError } = await supabase.from('remote_assistance_requests').insert({
      requester_id: authUser.id,
      emergency_type: selectedEmergency,
      status: 'queued',
      called_115: true,
      location_shared: Boolean(coordinates),
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    }).select('id,status').single();
    setRequestingGuide(false);
    if (requestError) { setGuideStatus('Chưa gửi được yêu cầu. Hãy tiếp tục theo hướng dẫn 115 và thử lại khi an toàn.'); return; }
    setGuideRequestId(data.id);
    setGuideStatus('Yêu cầu đã vào hàng chờ hỗ trợ. Tiếp tục làm theo hướng dẫn của 115; ứng dụng chưa kết nối video trực tiếp.');
  };

  useEffect(() => {
    if (!guideRequestId || !supabase) return;
    const refresh = async () => {
      const { data } = await supabase.from('remote_assistance_requests').select('status,room_url').eq('id', guideRequestId).maybeSingle();
      if (!data) return;
      if (data.status === 'accepted' || data.status === 'in_progress') {
        if (typeof data.room_url === 'string' && !guideRoomToken) {
          const { data: sessionData } = await supabase.auth.getSession();
          const joined = await fetch(`/api/remote-assistance/${guideRequestId}/join`, {
            method: 'POST', headers: { Authorization: `Bearer ${sessionData.session?.access_token || ''}`, 'Content-Type': 'application/json' },
          });
          if (joined.ok) {
            const credentials = await joined.json();
            setGuideRoomUrl(credentials.roomUrl);
            setGuideRoomToken(credentials.token);
          }
        }
        setGuideStatus(data.room_url ? 'Người hướng dẫn đã sẵn sàng. Mở phòng video an toàn bên dưới; giữ liên lạc với 115.' : 'Yêu cầu đã được tiếp nhận. Người hướng dẫn sẽ liên hệ qua kênh được điều phối. Tiếp tục làm theo 115.');
      } else if (data.status === 'completed' || data.status === 'cancelled') {
        setGuideStatus(data.status === 'completed' ? 'Phiên hỗ trợ đã kết thúc. Tiếp tục làm theo hướng dẫn của nhân viên y tế.' : 'Yêu cầu hỗ trợ đã đóng. Nếu vẫn khẩn cấp, gọi lại 115.');
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 12000);
    return () => window.clearInterval(timer);
  }, [guideRequestId, guideRoomToken]);

  return (
    <div className="min-h-[calc(100vh-var(--header-height))] bg-[#F9FAFB] text-slate-800 pb-24 md:pb-16">
      {/* Top Banner - 115 Emergency Warning */}
      <div className="bg-gradient-to-r from-[#e31917] to-[#b31312] text-white px-4 py-3 shadow-lg shadow-[#e31917]/20 border-b border-[#b31312]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-5 h-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs sm:text-sm font-bold tracking-tight">
                CHẾ ĐỘ TÌNH HUỐNG THẬT — GỌI 115 NGAY LẬP TỨC
              </p>
              <p className="text-xs text-rose-100 hidden sm:block">
                Không cần đăng nhập · Thao tác ưu tiên tối khẩn · Bật loa ngoài khi gọi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCallModalOpen(true)}
            className="w-full sm:w-auto min-h-[44px] py-2.5 px-5 bg-white text-rose-600 hover:bg-rose-50 text-xs sm:text-sm font-black rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
            aria-label="Bấm gọi 115 ngay"
          >
            <PhoneCall className="w-4 h-4 fill-current animate-pulse" aria-hidden="true" />
            <span>BẤM GỌI 115 NGAY</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        <EmergencyAIAssistant />
        <EmergencySceneReport />
        <FirstAidChatbot />

        <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm sm:p-6" aria-labelledby="remote-guide-title">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"><Video className="size-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <h2 id="remote-guide-title" className="text-lg font-bold text-slate-900">Kết nối người hướng dẫn từ xa</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">Gọi 115 trước. Khi đội điều phối đã tiếp nhận, bạn có thể gửi yêu cầu để người hướng dẫn đủ thẩm quyền liên hệ trong lúc lực lượng đang di chuyển.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3 rounded-xl border border-blue-100 bg-white p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700"><input type="checkbox" checked={remoteConsent} onChange={(e) => setRemoteConsent(e.target.checked)} className="mt-0.5 size-4 accent-blue-700"/><span>Tôi đã gọi 115 và đồng ý gửi yêu cầu hỗ trợ cùng loại tình huống đang chọn cho điều phối viên.</span></label>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700"><input type="checkbox" checked={shareLocation} onChange={(e) => setShareLocation(e.target.checked)} className="mt-0.5 size-4 accent-blue-700"/><span><MapPin className="mr-1 inline size-4"/>Chia sẻ vị trí GPS hiện tại để điều phối hỗ trợ (không bắt buộc).</span></label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => setIsCallModalOpen(true)} className="min-h-11 rounded-xl bg-rose-700 px-4 font-bold text-white">Gọi 115 trước</button>
              <button type="button" disabled={requestingGuide || Boolean(guideRequestId)} onClick={() => void requestRemoteGuide()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 font-bold text-white disabled:opacity-50">{requestingGuide ? <LoaderCircle className="size-4 animate-spin"/> : <Video className="size-4"/>}{guideRequestId ? 'Đã gửi yêu cầu' : 'Yêu cầu người hướng dẫn'}</button>
            </div>
            {!isAuthenticated && <p className="text-xs text-amber-800">Yêu cầu điều phối cần tài khoản. Gọi 115 vẫn khả dụng khi chưa đăng nhập.</p>}
            {guideStatus && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-950">{guideStatus}</p>}
            {guideRoomUrl && guideRoomToken && <div className="overflow-hidden rounded-xl border border-blue-200 bg-white"><div className="p-3 text-sm font-semibold text-blue-900">Phòng video riêng với người hướng dẫn <span className="ml-1 font-normal text-slate-600">· tiếp tục nghe theo 115</span></div><iframe title="Hỗ trợ video cấp cứu GoldenMinutes" src={`${guideRoomUrl}?t=${encodeURIComponent(guideRoomToken)}`} allow="camera; microphone; fullscreen; display-capture" className="h-[min(60vh,600px)] w-full border-0"/></div>}
            {guideRequestId && <p className="font-mono text-xs text-slate-500">Mã yêu cầu: {guideRequestId}</p>}
          </div>
        </section>

        {/* Emergency Type Selector */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
            1. Chọn dấu hiệu nhận diện tại hiện trường:
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {emergencyOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedEmergency === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedEmergency(opt.id)}
                  className={`min-h-[110px] p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    isSelected
                      ? 'border-2 border-blue-600 bg-blue-50/60 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${opt.iconColor}`} aria-hidden="true" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{opt.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Protocol Steps */}
        {selectedEmergency === 'ohca' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Heart className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Hồi sinh tim phổi (CPR) — Ép tim liên tục 110 bpm
                  </h2>
                </div>
                <MetadataRow
                  items={['Chuẩn AHA 2020', 'Hội HSCC Việt Nam']}
                  className="text-xs text-emerald-700 font-semibold"
                />
              </div>

              {/* Step checklist */}
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Giao nhiệm vụ: Gọi 115 &amp; Tìm máy khử rung tim (AED)
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Chỉ định rõ một người xung quanh: "Anh/Chị hãy gọi ngay 115 bật loa ngoài và mang máy AED gần nhất lại đây!".
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Vị trí đặt tay chuẩn y khoa
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Đặt gót một bàn tay vào chính giữa ngực (nửa dưới xương ức). Tay kia đan lên trên. Cánh tay thẳng đứng 90° so với ngực nạn nhân.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Ép sâu 5–6 cm, thả ngực nở hết cỡ sau mỗi lần ép
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Ép liên tục, không dừng quá 10 giây cho đến khi nhân viên y tế 115 tiếp quản hoặc nạn nhân cựa quậy tỉnh lại.
                    </p>
                  </div>
                </div>
              </div>

              {/* Integrated Metronome for Real Emergency */}
              <div className="pt-2">
                <CPRMetronome bpm={110} autoStart={false} />
              </div>
            </div>
          </div>
        )}

        {selectedEmergency === 'stroke' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Brain className="w-5 h-5 text-blue-600 shrink-0" aria-hidden="true" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Xử trí Đột quỵ trong thời gian vàng (FAST)
                </h2>
              </div>
              <MetadataRow
                items={['Giờ vàng: 3–4.5h', 'Thời gian là Não']}
                className="text-xs text-blue-700 font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block">
                  Hành động cốt lõi
                </span>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>GỌI 115 NGAY</strong> và báo rõ: "Nghi ngờ đột quỵ cấp, khởi phát lúc ... giờ".</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Đặt người bệnh nằm nghiêng an toàn, đầu nâng nhẹ 30°, nới lỏng cổ áo.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Ghi nhớ chính xác thời điểm xuất hiện dấu hiệu bất thường đầu tiên.</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">
                  TUYỆT ĐỐI CẤM (Nguy hiểm tính mạng)
                </span>
                <ul className="space-y-1.5 text-xs text-rose-800">
                  <li>• KHÔNG chích máu đầu ngón tay hay dái tai.</li>
                  <li>• KHÔNG cho uống bất kỳ loại thuốc nào (kể cả An Cung hay hạ áp).</li>
                  <li>• KHÔNG cho ăn, uống nước, vắt chanh vì nguy cơ sặc phổi tử vong.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {selectedEmergency === 'bleeding' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Droplets className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Kiểm soát chảy máu nguy kịch (Stop the Bleed)
                </h2>
              </div>
              <MetadataRow
                items={['Chống Sốc Mất Máu', 'ACS Protocol']}
                className="text-xs text-rose-700 font-semibold"
              />
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">Ép đè trực tiếp hai bàn tay lên vết thương</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Dùng gạc/vải sạch đè toàn bộ lực cơ thể lên miệng vết thương không buông trong 5–10 phút.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">Băng ép hoặc Đặt Garô nếu máu vẫn phun ở chi</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Nếu là vết thương tay/chân và máu tiếp tục phun mạnh: Đặt garô phía trên vết thương 5 cm. Siết chặt đến khi máu ngừng chảy. Ghi giờ garô.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedEmergency === 'choking' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Thủ thuật Heimlich cấp cứu nghẹn dị vật
                </h2>
              </div>
              <MetadataRow
                items={['Khai Thông Đường Thở', 'ILCOR Guidelines']}
                className="text-xs text-amber-700 font-semibold"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-700 leading-relaxed">
              <p>1. Đứng sau lưng nạn nhân, vòng 2 tay quanh eo.</p>
              <p>2. Một tay nắm đấm đặt trên rốn, dưới mũi ức. Tay kia bọc lên nắm đấm.</p>
              <p>3. Giật mạnh vào trong và hất lên trên dứt khoát 5 lần liên tiếp để tạo áp lực đẩy dị vật ra ngoài.</p>
              <p>4. Nếu nạn nhân bất tỉnh: Đặt nằm ngửa xuống mặt phẳng và tiến hành CPR ép tim ngay lập tức.</p>
            </div>
          </div>
        )}

        {/* Disclaimer Footer */}
        <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 leading-relaxed text-center">
          <p>{MEDICAL_DISCLAIMER_VI}</p>
        </div>
      </div>

      <Call115Modal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        incidentTypeHint={
          selectedEmergency === 'ohca'
            ? 'Bất tỉnh không thở / Nghi ngờ ngừng tim'
            : selectedEmergency === 'stroke'
            ? 'Dấu hiệu đột quỵ não cấp (FAST)'
            : selectedEmergency === 'bleeding'
            ? 'Vết thương chảy máu nghiêm trọng'
            : 'Nghẹn tắc dị vật đường thở'
        }
      />
    </div>
  );
};
