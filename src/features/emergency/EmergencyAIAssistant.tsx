import React, { useState } from 'react';
import { BrainCircuit, CheckCircle2, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
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

  return <section className="ai-triage-card rounded-[1.5rem] border border-primary/20 bg-surface p-4 shadow-[0_16px_40px_rgba(23,33,43,0.1)] sm:p-5" aria-labelledby="ai-triage-title">
    <div className="flex items-start gap-3">
      <div className="ai-triage-orb grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"><BrainCircuit className="size-5" aria-hidden="true" /></div>
      <div className="min-w-0"><div className="flex items-center gap-2"><h2 id="ai-triage-title" className="text-base font-bold text-foreground sm:text-lg">Phân tích nhanh tình huống</h2><Sparkles className="size-4 text-primary" aria-hidden="true" /></div><p className="mt-1 text-xs leading-relaxed text-muted">Trợ lý chỉ trích xuất dấu hiệu đã mô tả, không chẩn đoán. Khi nguy hiểm, gọi 115 trước.</p></div>
    </div>
    <label className="mt-5 block text-sm font-semibold text-foreground" htmlFor="emergency-description">Mô tả nhanh tình huống</label>
    <textarea id="emergency-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={1000} placeholder="Ví dụ: Người bệnh bất tỉnh, không phản ứng và đang thở ngáp..." className="mt-2 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20" />
    <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-muted">{description.length}/1000</span><button type="button" onClick={() => void analyze()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5 hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60">{loading ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}Phân tích</button></div>
    {error && <p role="alert" className="mt-3 rounded-lg bg-primary-soft p-2 text-sm font-medium text-primary">{error}</p>}
    {result && <div className="ai-result-panel mt-4 flex flex-col gap-3 rounded-xl border border-border bg-background p-3"><div className="flex items-center gap-2 text-sm font-bold text-foreground"><CheckCircle2 className="size-4 text-emerald-600" />Dấu hiệu đã trích xuất <span className="ml-auto rounded-full bg-primary-soft px-2 py-1 text-xs text-primary">{Math.round(result.confidence * 100)}%</span></div><div className="grid grid-cols-2 gap-2">{Object.entries(result).filter(([key, value]) => key in labels && value !== null && value !== false && value !== 'unknown').map(([key, value]) => <div key={key} className="rounded-lg border border-border bg-surface p-2 text-xs"><span className="text-muted">{labels[key]}</span><strong className="mt-1 block text-foreground">{String(value)}</strong></div>)}</div>{result.missingFacts.length > 0 && <p className="text-xs text-amber-700 text-amber-300"><ShieldAlert className="mr-1 inline size-3" />Còn thiếu: {result.missingFacts.join(', ')}</p>}<p className="text-xs leading-relaxed text-muted">{result.recommendedEmergencyPrompt}</p></div>}
  </section>;
};
