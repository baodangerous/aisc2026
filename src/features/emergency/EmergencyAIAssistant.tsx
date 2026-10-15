import React, { useState } from 'react';
import { BrainCircuit, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { apiClient } from '../../services/api/client';
import type { FactExtractionOutput } from '../../domain/schemas';

const labels: Record<string, string> = {
  consciousness: 'Tri giác',
  breathing: 'Hô hấp',
  severeBleeding: 'Chảy máu nặng',
  strokeFace: 'Méo mặt',
  strokeArm: 'Yếu tay',
  strokeSpeech: 'Nói khó',
  choking: 'Hóc dị vật',
};

export const EmergencyAIAssistant: React.FC = () => {
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<FactExtractionOutput | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    const text = description.trim();
    if (text.length < 8) { setError('Hãy mô tả tình huống bằng ít nhất 8 ký tự.'); return; }
    setLoading(true); setError('');
    try {
      const response = await apiClient.extractFacts({ text });
      setResult(response.facts);
    } catch (cause) {
      const lower = text.toLowerCase();
      const fallback: FactExtractionOutput = {
        consciousness: lower.includes('bất tỉnh') || lower.includes('không phản ứng') ? 'unresponsive' : 'unknown',
        breathing: lower.includes('không thở') || lower.includes('ngừng thở') ? 'not_breathing' : 'unknown',
        severeBleeding: lower.includes('chảy máu nhiều') ? true : null,
        strokeFace: lower.includes('méo miệng') ? true : null,
        strokeArm: lower.includes('yếu tay') ? true : null,
        strokeSpeech: lower.includes('nói ngọng') ? true : null,
        choking: lower.includes('hóc') || lower.includes('nghẹn') ? true : null,
        extractedEvidence: ['Phân tích ngoại tuyến từ các dấu hiệu bạn đã nhập'],
        missingFacts: ['Xác nhận lại tri giác và hô hấp trực tiếp tại hiện trường'],
        confidence: 0.7,
        recommendedEmergencyPrompt: 'Gọi 115 ngay nếu nạn nhân bất tỉnh, không thở hoặc tình trạng xấu đi.',
      };
      setResult(fallback);
      setError('AI tạm thời không kết nối; đã chuyển sang phân tích an toàn ngoại tuyến.');
    } finally { setLoading(false); }
  };

  return <section className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 shadow-sm dark:border-indigo-900 dark:bg-indigo-950/30" aria-labelledby="ai-triage-title">
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-indigo-600 p-2 text-white"><BrainCircuit className="size-5" aria-hidden="true" /></div>
      <div><h2 id="ai-triage-title" className="font-bold text-slate-900 dark:text-slate-100">Phân tích mô tả bằng trợ lý</h2><p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">Trợ lý chỉ trích xuất dấu hiệu bạn đã mô tả, không chẩn đoán. Khi nguy hiểm, gọi 115 trước.</p></div>
    </div>
    <label className="mt-4 block text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor="emergency-description">Mô tả nhanh tình huống</label>
    <textarea id="emergency-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={1000} placeholder="Ví dụ: Người bệnh bất tỉnh, không phản ứng và đang thở ngáp..." className="mt-2 w-full rounded-xl border border-indigo-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-indigo-800 dark:bg-slate-900" />
    <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-slate-500">{description.length}/1000</span><button type="button" onClick={() => void analyze()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{loading ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}Phân tích</button></div>
    {error && <p role="alert" className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-300">{error}</p>}
    {result && <div className="mt-4 space-y-3 rounded-xl border border-indigo-200 bg-white p-3 dark:border-indigo-800 dark:bg-slate-900"><div className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 className="size-4 text-emerald-600" />Dấu hiệu đã trích xuất ({Math.round(result.confidence * 100)}% tin cậy)</div><div className="grid grid-cols-2 gap-2">{Object.entries(result).filter(([key, value]) => key in labels && value !== null && value !== false && value !== 'unknown').map(([key, value]) => <div key={key} className="rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800"><span className="text-slate-500">{labels[key]}</span><strong className="mt-1 block">{String(value)}</strong></div>)}</div>{result.missingFacts.length > 0 && <p className="text-xs text-amber-700 dark:text-amber-300"><ShieldAlert className="mr-1 inline size-3" />Còn thiếu: {result.missingFacts.join(', ')}</p>}<p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{result.recommendedEmergencyPrompt}</p></div>}
  </section>;
};
