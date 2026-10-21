import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Camera, MapPin, Mic, MicOff, Radio, Send, Video } from 'lucide-react';
import { supabase } from '../../services/supabase/client';
import { useAuth } from '../auth/AuthContext';
import { useVoiceInput } from '../../services/voice/useVoiceInput';

type UploadedMedia = { url: string; type: 'image' | 'video'; name: string };

const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
const MAX_MEDIA_FILES = 3;

/**
 * Incident composer for the community alert channel.
 * Publishing is explicit; media is uploaded only after the user presses Send.
 * In a live emergency, call 115 first.
 */
export function EmergencySceneReport() {
  const { authUser, isAuthenticated } = useAuth();
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [radius, setRadius] = useState('1000');
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const voice = useVoiceInput({
    lang: 'vi-VN',
    scenarioContextHint: 'Mô tả hiện trường cấp cứu. Chỉ trích xuất thông tin được nói, không chẩn đoán.',
    onTranscriptChange: (transcript) => setDescription(transcript.slice(0, 1000)),
  });

  const previewUrls = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previewUrls.forEach(({ url }) => URL.revokeObjectURL(url)), [previewUrls]);

  const chooseFiles = (list: FileList | null) => {
    const selected = Array.from(list ?? []);
    if (selected.length > MAX_MEDIA_FILES || selected.some((f) =>
      !(/^(image\/(jpeg|png|webp)|video\/(mp4|webm|quicktime))$/.test(f.type)) || f.size > MAX_MEDIA_BYTES)) {
      setError('Chọn tối đa 3 ảnh/video (JPEG, PNG, WebP, MP4, WebM hoặc MOV), mỗi tệp tối đa 25 MB.');
      return;
    }
    setError('');
    setFiles(selected);
  };

  const getLocation = async () => {
    if (!navigator.geolocation) throw new Error('Thiết bị không hỗ trợ GPS.');
    const coords = await new Promise<GeolocationCoordinates>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition((p) => resolve(p.coords), reject, {
        enableHighAccuracy: true, timeout: 10000, maximumAge: 15000,
      }));
    return { latitude: coords.latitude, longitude: coords.longitude };
  };

  const publish = async () => {
    setError(''); setStatus('');
    if (!supabase || !authUser) { setError('Đăng nhập để gửi cảnh báo cộng đồng. Nếu đang có nguy hiểm, gọi 115 ngay.'); return; }
    if (description.trim().length < 10) { setError('Hãy mô tả hiện trường ít nhất 10 ký tự.'); return; }
    setBusy(true);
    try {
      const coords = position ?? await getLocation();
      setPosition(coords);
      const media: UploadedMedia[] = [];
      for (const file of files) {
        const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
        const path = `${authUser.id}/incident-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('community-media').upload(path, file, {
          contentType: file.type, upsert: false,
        });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('community-media').getPublicUrl(path);
        media.push({ url: data.publicUrl, type: file.type.startsWith('video/') ? 'video' : 'image', name: file.name });
      }
      const radiusMeters = Number(radius);
      if (!Number.isInteger(radiusMeters) || radiusMeters < 100 || radiusMeters > 10000) {
        throw new Error('Bán kính phải từ 100 đến 10.000 mét.');
      }
      const { error: insertError } = await supabase.from('community_alerts').insert({
        reporter_uid: authUser.id,
        kind: 'medical_emergency',
        title: 'Cảnh báo khẩn cấp cộng đồng',
        description: description.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        radius_m: radiusMeters,
        media,
      });
      if (insertError) throw insertError;
      setStatus('Đã gửi cảnh báo đến kênh cộng đồng trong bán kính đã chọn. Hãy tiếp tục liên lạc với 115; ứng dụng không thay thế điều phối cấp cứu.');
      setDescription('');
      setFiles([]);
      voice.resetTranscript();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa gửi được cảnh báo. Hãy gọi 115 nếu tình huống khẩn cấp.');
    } finally { setBusy(false); }
  };

  return <section className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="scene-report-title">
    <div className="flex items-start gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700"><Radio className="size-5" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-700">GoldenMinutes · Community Alert</p>
        <h2 id="scene-report-title" className="mt-1 text-lg font-bold text-slate-900">Báo cáo hiện trường & cảnh báo người ở gần</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">Gửi mô tả, vị trí và ảnh/video để người dùng trong phạm vi đã chọn biết có sự cố. Không quay cận mặt hoặc chia sẻ dữ liệu riêng tư nếu chưa được đồng ý.</p>
      </div>
    </div>

    <label htmlFor="scene-description" className="mt-5 block text-sm font-semibold text-slate-800">Mô tả hiện trường</label>
    <textarea id="scene-description" value={description} onChange={(e) => setDescription(e.target.value.slice(0, 1000))} maxLength={1000} rows={4}
      placeholder="Ví dụ: Có người ngã trước cổng tòa nhà, không phản ứng; đã nhờ người gọi 115..."
      className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => void (voice.isListening ? voice.stopListening() : voice.startListening())}
        disabled={voice.isTranscribing || voice.mode === 'unsupported'}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800 disabled:opacity-50">
        {voice.isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        {voice.isListening ? 'Dừng ghi âm' : voice.isTranscribing ? 'Đang chuyển giọng nói…' : 'Mô tả bằng giọng nói'}
      </button>
      <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800">
        <Camera className="size-4" /> Thêm ảnh/video
        <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple onChange={(e) => chooseFiles(e.target.files)} />
      </label>
      <span className="text-xs text-slate-500">{description.length}/1000 ký tự</span>
    </div>
    {voice.error && <p role="status" className="mt-2 text-sm text-amber-800">{voice.error}</p>}
    {previewUrls.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{previewUrls.map(({ file, url }) =>
      <div key={url} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        {file.type.startsWith('video/') ? <video src={url} controls className="h-28 w-full object-cover" /> : <img src={url} alt="Xem trước ảnh hiện trường" className="h-28 w-full object-cover" />}
        <p className="truncate p-2 text-xs text-slate-700">{file.name}</p>
      </div>)}</div>}

    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-slate-800">Phạm vi thông báo
        <select value={radius} onChange={(e) => setRadius(e.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
          <option value="500">500 m</option><option value="1000">1 km</option><option value="3000">3 km</option><option value="5000">5 km</option>
        </select>
      </label>
      <div className="flex items-end">
        <button type="button" onClick={() => void getLocation().then(setPosition).then(() => setError('')).catch(() => setError('Không lấy được GPS. Hãy bật quyền vị trí hoặc gọi 115 trực tiếp.'))}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-800">
          <MapPin className="size-4" />{position ? 'Đã xác nhận vị trí' : 'Xác nhận vị trí GPS'}
        </button>
      </div>
    </div>
    {position && <p className="mt-2 text-xs text-slate-600">GPS đã xác nhận. Tọa độ chính xác chỉ được gửi khi bạn bấm gửi cảnh báo.</p>}
    {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {status && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{status}</p>}
    <button type="button" onClick={() => void publish()} disabled={busy || !isAuthenticated}
      className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 font-bold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50">
      <Send className="size-4" />{busy ? 'Đang gửi cảnh báo…' : 'Gửi cảnh báo cộng đồng'}
    </button>
    {!isAuthenticated && <p className="mt-2 text-xs text-amber-800">Cần đăng nhập để gửi cảnh báo. Trong tình huống thật, gọi 115 trước; không chờ ứng dụng.</p>}
    <p className="mt-3 text-xs leading-relaxed text-slate-500">AI có thể hỗ trợ tóm tắt mô tả ở bước tiếp theo; nội dung hiện tại do người gửi cung cấp. Cảnh báo chỉ được gửi khi người dùng xác nhận.</p>
  </section>;
}
