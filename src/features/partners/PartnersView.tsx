import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Car,
  CheckCircle2,
  CircleDollarSign,
  GraduationCap,
  Handshake,
  HeartHandshake,
  ShieldCheck,
  Stethoscope,
  Video,
  Wallet,
} from 'lucide-react';

const partnerTracks = [
  {
    name: '1Life',
    type: 'Nội dung và đào tạo sơ cứu',
    icon: GraduationCap,
    tone: 'bg-emerald-50 text-emerald-700',
    proposal: 'Đồng phát triển nội dung đã được chuyên gia rà soát, tổ chức workshop CPR/AED và đào tạo người hướng dẫn.',
    value: 'Chất lượng chuyên môn, quy trình đào tạo và bộ tiêu chí kiểm duyệt nội dung.',
    pilot: 'Một workshop nhỏ, 2–3 kịch bản ưu tiên và đánh giá trước/sau đào tạo.',
  },
  {
    name: 'Grab',
    type: 'Mạng lưới cộng đồng và điểm tiếp cận',
    icon: Car,
    tone: 'bg-green-50 text-green-700',
    proposal: 'Đề xuất pilot tự nguyện với nhóm tài xế đã được đào tạo: nhận nội dung học nhanh, tìm cơ sở y tế/AED công khai và biết cách gọi 115.',
    value: 'Phân phối kiến thức đến cộng đồng di chuyển thường xuyên; không tự động điều phối tài xế đến hiện trường.',
    pilot: 'Chỉ triển khai sau khi có đồng thuận, quy trình an toàn, đào tạo và đầu mối điều phối được xác nhận.',
  },
  {
    name: 'MoMo',
    type: 'CSR và tài trợ tác động xã hội',
    icon: Wallet,
    tone: 'bg-pink-50 text-pink-700',
    proposal: 'Đề xuất chiến dịch CSR gây quỹ minh bạch cho đào tạo sơ cứu, thiết bị AED hoặc chương trình cộng đồng.',
    value: 'Theo dõi nguồn tài trợ, số người được đào tạo, số buổi tập huấn và báo cáo tác động.',
    pilot: 'Bắt đầu bằng trang chiến dịch/QR do đối tác phê duyệt; chưa tích hợp ví hoặc xử lý thanh toán trong bản demo.',
  },
  {
    name: 'Cơ sở y tế',
    type: 'Tiếp nhận yêu cầu và hướng dẫn từ xa',
    icon: Stethoscope,
    tone: 'bg-blue-50 text-blue-700',
    proposal: 'Mời cơ sở y tế đủ điều kiện đăng ký đầu mối trực, nhận yêu cầu đã được đồng ý chia sẻ và chọn tiếp nhận hoặc từ chối.',
    value: 'Có nhật ký trạng thái, người chịu trách nhiệm và kênh video riêng khi được chấp nhận.',
    pilot: 'Thử nghiệm với một đầu mối được xác minh; không hiển thị ETA hay trạng thái xe cấp cứu nếu chưa có nguồn dữ liệu chính thức.',
  },
];

const roadmap = [
  { step: '01', title: 'Tiếp nhận có kiểm soát', text: 'Người dùng gọi 115 trước, chọn loại tình huống và chủ động đồng ý chia sẻ vị trí nếu muốn.' },
  { step: '02', title: 'Đơn vị đủ quyền phản hồi', text: 'Điều phối viên hoặc cơ sở tham gia đã được xác minh xem thông tin tối thiểu, rồi chấp nhận hoặc từ chối yêu cầu.' },
  { step: '03', title: 'Kết nối video riêng', text: 'Sau khi chấp nhận, hai bên nhận token/phòng riêng có thời hạn; không ghi hình mặc định và không thay thế 115.' },
  { step: '04', title: 'Theo dõi và đóng phiên', text: 'Ghi nhận thời điểm tiếp nhận/kết thúc, thu hồi quyền truy cập và chỉ chia sẻ báo cáo tổng hợp đã giảm định danh.' },
];

export const PartnersView: React.FC = () => (
  <main className="gm-page space-y-8 text-foreground">
    <section className="overflow-hidden rounded-[1.75rem] border border-blue-200 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 p-6 text-white shadow-xl sm:p-10">
      <p className="text-xs font-extrabold uppercase tracking-[.18em] text-blue-200">Golden Pulse · Hợp tác tác động xã hội</p>
      <div className="mt-4 grid gap-6 md:grid-cols-[1.25fr_.75fr] md:items-end">
        <div>
          <h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-5xl">Kết nối nguồn lực để mỗi phút đều có ý nghĩa.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">GoldenMinutes là nền tảng luyện phản xạ sơ cứu, tìm điểm hỗ trợ và kết nối hướng dẫn từ xa có kiểm soát. Golden Pulse là hướng triển khai tác động xã hội và hợp tác bền vững.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/dashboard" className="gm-button bg-white text-blue-950 hover:bg-blue-50">Đăng ký tổ chức <ArrowRight className="size-4" /></Link>
            <Link to="/emergency" className="gm-button border border-white/30 bg-white/10 text-white hover:bg-white/15">Xem luồng hỗ trợ <Video className="size-4" /></Link>
          </div>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-bold"><HeartHandshake className="size-5 text-rose-200" /> Nguyên tắc hợp tác</div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-blue-50">
            <li>• Tác động xã hội đo được, không chỉ lượt tải.</li>
            <li>• Cấp cứu và gọi 115 luôn miễn phí, không đặt sau paywall.</li>
            <li>• Đối tác chỉ được hiển thị là đã xác minh sau khi hoàn tất thẩm định.</li>
          </ul>
        </div>
      </div>
    </section>

    <section className="gm-section" aria-labelledby="partner-tracks-title">
      <div>
        <p className="gm-eyebrow">Mô hình hợp tác đề xuất</p>
        <h2 id="partner-tracks-title" className="mt-1 text-2xl font-bold sm:text-3xl">Mỗi đối tác, một vai trò rõ ràng</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 gm-muted">Đây là đề xuất để tiếp cận đối tác, không phải thông báo hợp tác đã được ký kết.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {partnerTracks.map((partner) => {
          const Icon = partner.icon;
          return (
            <article key={partner.name} className="gm-card gm-card--interactive flex flex-col gap-4 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${partner.tone}`}><Icon className="size-6" aria-hidden="true" /></span>
                  <div><h3 className="text-lg font-extrabold">{partner.name}</h3><p className="text-sm gm-muted">{partner.type}</p></div>
                </div>
                <span className="gm-status gm-status--proposal">Đề xuất</span>
              </div>
              <p className="text-sm leading-6">{partner.proposal}</p>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Giá trị trao đổi</p>
                <p className="mt-1 text-sm leading-6">{partner.value}</p>
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Pilot khả thi</p>
                <p className="mt-1 text-sm leading-6 gm-muted">{partner.pilot}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>

    <section className="gm-section" aria-labelledby="remote-flow-title">
      <div>
        <p className="gm-eyebrow">Luồng hỗ trợ có kiểm soát</p>
        <h2 id="remote-flow-title" className="mt-1 text-2xl font-bold sm:text-3xl">Từ yêu cầu đến phòng video riêng</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 gm-muted">Luồng yêu cầu hỗ trợ từ xa đã có trong ứng dụng. Kết nối trực tiếp với bệnh viện, điều phối xe cấp cứu hoặc ETA theo thời gian thực cần thỏa thuận, xác minh và tích hợp riêng.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {roadmap.map((item) => (
          <article key={item.step} className="gm-card p-5">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary-soft text-sm font-black text-primary">{item.step}</span>
            <h3 className="mt-4 font-bold">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 gm-muted">{item.text}</p>
          </article>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="gm-card p-5 sm:p-6">
          <div className="flex items-center gap-2 font-bold"><ShieldCheck className="size-5 text-emerald-700" /> Đã có trong luồng ứng dụng</div>
          <ul className="mt-3 space-y-2 text-sm leading-6 gm-muted">
            <li>• Người dùng phải xác nhận đã gọi 115 trước khi gửi yêu cầu.</li>
            <li>• Chia sẻ GPS là tùy chọn và cần quyền trình duyệt.</li>
            <li>• Người có vai trò phù hợp có thể nhận yêu cầu; phòng video riêng được tạo qua nhà cung cấp đã cấu hình.</li>
          </ul>
        </article>
        <article className="gm-card p-5 sm:p-6">
          <div className="flex items-center gap-2 font-bold"><Building2 className="size-5 text-amber-700" /> Cần hoàn tất trước pilot bệnh viện</div>
          <ul className="mt-3 space-y-2 text-sm leading-6 gm-muted">
            <li>• Xác minh pháp nhân, đầu mối trực, phạm vi chuyên môn và giờ hoạt động.</li>
            <li>• Quy trình chấp nhận/từ chối, thời gian phản hồi mục tiêu và phương án khi không ai nhận.</li>
            <li>• Thỏa thuận chia sẻ dữ liệu, lưu trữ, xử lý sự cố và kiểm toán quyền truy cập.</li>
          </ul>
        </article>
      </div>
    </section>

    <section className="gm-card grid gap-6 p-5 sm:p-7 md:grid-cols-[1fr_.9fr] md:items-center">
      <div>
        <p className="gm-eyebrow">Doanh thu bền vững</p>
        <h2 className="mt-1 text-2xl font-bold">Tài trợ cho năng lực sẵn sàng, không bán quyền được cấp cứu</h2>
        <p className="mt-3 text-sm leading-6 gm-muted">Ưu tiên nguồn thu từ chương trình đào tạo B2B, gói diễn tập cho trường học/doanh nghiệp, tài trợ CSR có báo cáo tác động và cửa hàng thiết bị từ nhà cung cấp được thẩm định. Không thu phí để mở khóa nút gọi 115 hay hướng dẫn thiết yếu trong tình huống thật.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { icon: GraduationCap, title: 'Đào tạo B2B', text: 'Gói workshop và diễn tập định kỳ.' },
          { icon: CircleDollarSign, title: 'CSR minh bạch', text: 'Báo cáo chi tiêu và tác động.' },
          { icon: Stethoscope, title: 'Mạng lưới chuyên môn', text: 'Đối tác được xác minh, không mua thứ hạng.' },
          { icon: CheckCircle2, title: 'KPI tác động', text: 'Người được đào tạo, thời gian phản hồi, tỷ lệ hoàn tất.' },
        ].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-xl bg-slate-50 p-4"><Icon className="size-5 text-primary" /><h3 className="mt-2 text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-5 gm-muted">{text}</p></div>)}
      </div>
    </section>

    <p className="text-xs leading-6 gm-muted">Lưu ý: GoldenMinutes hiện là bản demo. Không có cam kết tích hợp với Grab, MoMo, 1Life, bệnh viện hay tổng đài 115 cho đến khi có xác nhận chính thức và kiểm thử vận hành.</p>
  </main>
);

