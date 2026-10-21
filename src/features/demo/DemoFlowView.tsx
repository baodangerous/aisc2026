import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, BookOpen, HeartPulse, MapPin, MessageCircle, RotateCcw, ShoppingBag, Users, Building2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { isDemoMode } from '../../services/supabase/client';

const journeys = [
  {
    title: 'Người dân: luyện tập sơ cứu',
    description: 'Mở kịch bản OHCA, trả lời câu hỏi, hoàn tất bước hướng dẫn và xem báo cáo ADI/MRO.',
    steps: ['Bắt đầu kịch bản', 'Hoàn tất bài luyện', 'Xem kết quả và mốc thời gian'],
    href: '/training?scenario=sc_ohca_01',
    action: 'Bắt đầu luyện tập',
    icon: HeartPulse,
  },
  {
    title: 'Tìm AED và cơ sở y tế',
    description: 'Mở bản đồ, xem danh sách điểm đã nạp sẵn và thử tìm kiếm/lọc dữ liệu.',
    steps: ['Mở bản đồ', 'Tìm điểm hỗ trợ', 'Xem thông tin chi tiết'],
    href: '/nearby',
    action: 'Mở bản đồ',
    icon: MapPin,
  },
  {
    title: 'Cộng đồng: đăng bài và phản hồi',
    description: 'Thử tạo bài đăng, thích bài viết, bình luận hoặc gửi cảnh báo cộng đồng.',
    steps: ['Mở bảng tin', 'Tạo nội dung', 'Kiểm tra nội dung mới trong danh sách'],
    href: '/community',
    action: 'Mở cộng đồng',
    icon: MessageCircle,
  },
  {
    title: 'Tình nguyện viên: tiếp nhận hỗ trợ',
    description: 'Xem hàng đợi hỗ trợ mô phỏng và thử tiếp nhận/cập nhật trạng thái yêu cầu.',
    steps: ['Mở hàng đợi', 'Tiếp nhận yêu cầu', 'Hoàn tất phiên mô phỏng'],
    href: '/support',
    action: 'Mở hàng đợi',
    icon: Users,
  },
  {
    title: 'Cửa hàng: giỏ hàng và đơn đặt',
    description: 'Xem sản phẩm, thêm vào giỏ, nhập thông tin giao hàng và tạo đơn demo không thanh toán.',
    steps: ['Chọn sản phẩm', 'Cập nhật giỏ hàng', 'Tạo và kiểm tra đơn demo'],
    href: '/store',
    action: 'Mở cửa hàng',
    icon: ShoppingBag,
  },
  {
    title: 'Quản lý: dữ liệu tổ chức',
    description: 'Mở dashboard bằng tài khoản có quyền quản lý để kiểm tra dữ liệu và các khu vực quản trị.',
    steps: ['Đăng nhập vai trò phù hợp', 'Mở dashboard', 'Kiểm tra danh sách và thao tác khả dụng'],
    href: '/dashboard',
    action: 'Mở dashboard',
    icon: Building2,
  },
];

export const DemoFlowView: React.FC<{ onOpenLogin: () => void }> = ({ onOpenLogin }) => {
  const { user, isAuthenticated } = useAuth();

  const resetDemo = () => {
    if (!isDemoMode) return;
    const confirmed = window.confirm('Đặt lại dữ liệu demo trên trình duyệt này? Các thay đổi cục bộ và phiên luyện tập demo sẽ bị xóa.');
    if (!confirmed) return;
    [
      'goldenminutes.demo.tables.v1',
      'goldenminutes.demo.trainingSessions.v1',
      'goldenminutes.demo.account.v1',
    ].forEach((key) => localStorage.removeItem(key));
    window.location.assign('/?demo=1');
  };

  return (
    <div className="min-h-[calc(100vh-var(--header-height))] bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                <ShieldCheck className="size-4" /> Chế độ demo local
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Kịch bản trình diễn GoldenMinutes</h1>
              <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
                Chọn một luồng để thao tác trực tiếp trên giao diện GoldenMinutes. Dữ liệu demo được lưu trong trình duyệt; không tạo giao dịch thanh toán thật.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isAuthenticated ? (
                <button type="button" onClick={onOpenLogin} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  Chọn tài khoản demo <ArrowRight className="size-4" />
                </button>
              ) : (
                <div className="rounded-xl border border-border bg-background px-4 py-2 text-sm">
                  <div className="font-semibold">{user?.displayName || 'Tài khoản demo'}</div>
                  <div className="text-xs text-muted">Vai trò: {user?.role || 'user'}</div>
                </div>
              )}
              <button type="button" onClick={resetDemo} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted/20">
                <RotateCcw className="size-4" /> Đặt lại dữ liệu
              </button>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <Activity className="mb-2 size-5 text-primary" />
              <div className="font-semibold">Luồng có thể thao tác</div>
              <p className="mt-1 text-sm text-muted">Mở từng chức năng gốc, nhập dữ liệu và kiểm tra kết quả hiển thị.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <BookOpen className="mb-2 size-5 text-primary" />
              <div className="font-semibold">Dữ liệu mẫu có sẵn</div>
              <p className="mt-1 text-sm text-muted">Các danh sách chính được nạp dữ liệu để không phải bắt đầu từ màn hình trống.</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <ShieldCheck className="mb-2 size-5 text-primary" />
              <div className="font-semibold">Không ghi DB thật</div>
              <p className="mt-1 text-sm text-muted">Dữ liệu mock được lưu trên trình duyệt này, độc lập với Supabase thật.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {journeys.map((journey, index) => {
            const Icon = journey.icon;
            return (
              <section key={journey.href} className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted">Luồng {String(index + 1).padStart(2, '0')}</div>
                    <h2 className="mt-1 text-lg font-bold">{journey.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted">{journey.description}</p>
                  </div>
                </div>
                <ol className="mt-4 grid gap-2 border-t border-border pt-4">
                  {journey.steps.map((step, stepIndex) => (
                    <li key={step} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold text-muted">{stepIndex + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-5">
                  <Link to={journey.href} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                    {journey.action} <ArrowRight className="size-4" />
                  </Link>
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Lưu ý: đây là môi trường trình diễn. Vị trí AED/cơ sở, yêu cầu hỗ trợ và đơn hàng có thể là dữ liệu giả; không dùng dữ liệu này để điều hướng cấp cứu ngoài đời. Khi có tình huống khẩn cấp thực tế tại Việt Nam, gọi 115.
        </p>
      </div>
    </div>
  );
};
