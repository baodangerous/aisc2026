import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Clock, FileText, ArrowLeft, Copy, Check, AlertCircle } from 'lucide-react';

interface ProofData {
  id: string;
  incidentId: string;
  userId: string;
  summary: {
    scenario?: string;
    scenarioTitle?: string;
    durationSec?: number;
    adiSec?: number;
    readinessScore?: number;
    call115ElapsedSec?: number;
    compressionElapsedSec?: number;
  };
  payloadHash: string;
  version: string;
  legalDisclaimer: string;
  createdAt: string;
}

export const DigitalProofVerifyView: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const [proof, setProof] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!hash) {
      setError('Mã băm chứng chỉ không hợp lệ.');
      setLoading(false);
      return;
    }

    const fetchProof = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/proofs/${encodeURIComponent(hash)}`);
        if (!res.ok) {
          throw new Error('Chứng chỉ số không tồn tại hoặc đã bị thay đổi.');
        }
        const data = await res.json();
        setProof(data.proof);
      } catch (err: any) {
        setError(err.message || 'Lỗi kiểm tra tính toàn vẹn chứng chỉ.');
      } finally {
        setLoading(false);
      }
    };

    void fetchProof();
  }, [hash]);

  const copyHash = () => {
    if (!hash) return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về trang chủ</span>
        </Link>

        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Đang đối soát mã băm mật mã học (SHA-256)...</p>
          </div>
        ) : error || !proof ? (
          <div className="bg-white rounded-3xl border border-red-200 p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-xl font-bold text-slate-900">Không tìm thấy chứng chỉ</h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto">{error}</p>
            <Link
              to="/training"
              className="inline-flex min-h-[44px] items-center justify-center px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm"
            >
              Thực hiện bài luyện tập mới
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header with verified badge */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Chứng thực hợp lệ</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Chứng Chỉ Số Cứu Sinh
                  </h1>
                  <p className="text-sm text-emerald-100">
                    Bằng chứng mật mã học bất biến (Immutable Digital Proof)
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm shrink-0">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Hash Row */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>MÃ BĂM TOÀN VẸN (SHA-256)</span>
                  <button
                    type="button"
                    onClick={copyHash}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Đã sao chép' : 'Sao chép link'}</span>
                  </button>
                </div>
                <p className="font-mono text-xs sm:text-sm text-slate-800 break-all bg-white p-2.5 rounded-xl border border-slate-200">
                  {proof.payloadHash}
                </p>
              </div>

              {/* Verified Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Tình huống</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-base">
                    {proof.summary.scenarioTitle || proof.summary.scenario || 'Ngừng tuần hoàn ngoại viện (OHCA)'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Thời điểm ghi nhận</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{new Date(proof.createdAt).toLocaleString('vi-VN')}</span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Chỉ số trễ có thể phòng tránh (ADI)</p>
                  <p className="font-bold text-emerald-700 text-lg sm:text-xl">
                    {proof.summary.adiSec !== undefined ? `${proof.summary.adiSec} giây` : 'Đạt chuẩn'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Thời lượng hoàn thành</p>
                  <p className="font-bold text-slate-900 text-lg sm:text-xl">
                    {proof.summary.durationSec ? `${proof.summary.durationSec} giây` : '—'}
                  </p>
                </div>
              </div>

              {/* Legal Reference & Disclaimer */}
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-900">
                  <FileText className="w-4 h-4" />
                  <span>CĂN CỨ THAM CHIẾU PHÁP LÝ</span>
                </div>
                <p className="leading-relaxed">
                  {proof.legalDisclaimer}
                </p>
                <p className="text-blue-800/80 italic">
                  *Chứng chỉ ghi nhận thao tác luyện tập trên môi trường số; không thay thế bằng cấp y khoa chính quy hoặc kết quả can thiệp trên thực địa.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
