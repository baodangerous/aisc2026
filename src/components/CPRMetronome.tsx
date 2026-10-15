import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Volume2, VolumeX, Activity } from 'lucide-react';

interface CPRMetronomeProps {
  bpm?: number;
  onBeat?: (beatCount: number) => void;
  autoStart?: boolean;
}

export const CPRMetronome: React.FC<CPRMetronomeProps> = ({
  bpm = 110,
  onBeat,
  autoStart = false,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [beatCount, setBeatCount] = useState<number>(0);
  const [currentBpm, setCurrentBpm] = useState<number>(bpm);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerIdRef = useRef<number | null>(null);
  const beatCountRef = useRef<number>(0);

  const playClickSound = useCallback(() => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // High pitch woodblock-style tone for clear audibility
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      console.warn('Web Audio error:', e);
    }
  }, [isMuted]);

  const tick = useCallback(() => {
    beatCountRef.current += 1;
    setBeatCount(beatCountRef.current);
    playClickSound();
    if (onBeat) onBeat(beatCountRef.current);
  }, [playClickSound, onBeat]);

  const startMetronome = useCallback(() => {
    if (isPlaying) return;
    beatCountRef.current = 0;
    setBeatCount(0);
    setIsPlaying(true);

    const intervalMs = (60 / currentBpm) * 1000;
    tick(); // first beat immediate
    timerIdRef.current = window.setInterval(tick, intervalMs);
  }, [isPlaying, currentBpm, tick]);

  const stopMetronome = useCallback(() => {
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (autoStart) {
      startMetronome();
    }
    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
      }
    };
  }, [autoStart, startMetronome]);

  // Adjust interval if bpm changes while running
  useEffect(() => {
    if (isPlaying) {
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      const intervalMs = (60 / currentBpm) * 1000;
      timerIdRef.current = window.setInterval(tick, intervalMs);
    }
  }, [currentBpm, isPlaying, tick]);

  return (
    <div className="bg-white border border-[#EAECF0] rounded-2xl p-5 text-[#1D2939] shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#D92D20] animate-pulse" />
          <span className="font-bold text-base tracking-tight text-[#101828]">
            Nhịp đếm chuẩn CPR: {currentBpm} BPM
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 rounded-lg bg-[#F2F4F7] text-[#475467] hover:text-[#101828] transition-colors cursor-pointer"
          title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#12B76A]" />}
        </button>
      </div>

      {/* Visual Pulsing Heart/Rhythm Gauge */}
      <div className="flex flex-col items-center justify-center py-3 relative">
        <div
          className={`w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-100 border-4 ${
            isPlaying
              ? 'border-[#D92D20] bg-[#FEF3F2] shadow-md shadow-[#D92D20]/20 scale-105'
              : 'border-[#EAECF0] bg-[#F9FAFB]'
          }`}
        >
          <span className={`text-3xl font-extrabold tracking-tight font-mono ${isPlaying ? 'text-[#D92D20]' : 'text-[#101828]'}`}>
            {isPlaying ? beatCount : currentBpm}
          </span>
          <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider mt-0.5">
            {isPlaying ? 'Lần ép' : 'Nhịp / Phút'}
          </span>
        </div>

        <p className="mt-3 text-xs text-[#475467] text-center max-w-xs leading-relaxed">
          {isPlaying
            ? 'Ép sâu 5-6 cm theo đúng tiếng gõ. Thả lồng ngực nở hết cỡ sau mỗi lần ép.'
            : 'Chuẩn AHA 2020: 100 - 120 lần/phút giúp tối ưu lưu lượng máu nuôi não và tim.'}
        </p>
      </div>

      {/* Speed Selector & Start / Stop Controls (min 44px / 48px hitboxes) */}
      <div className="mt-3 pt-3 border-t border-[#EAECF0] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center justify-center gap-1.5 bg-[#F2F4F7] p-1 rounded-xl">
          {[100, 110, 120].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setCurrentBpm(rate)}
              className={`flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer active:scale-95 ${
                currentBpm === rate
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              aria-label={`Đặt nhịp ${rate} BPM`}
            >
              {rate} <span className="text-[10px] font-normal opacity-80">BPM</span>
            </button>
          ))}
        </div>

        {isPlaying ? (
          <button
            type="button"
            onClick={stopMetronome}
            className="flex-1 min-h-[48px] py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
            aria-label="Tạm dừng đếm nhịp CPR"
          >
            <Square className="w-4 h-4 fill-current text-rose-600" />
            <span>Tạm dừng nhịp</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startMetronome}
            className="flex-1 min-h-[48px] py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
            aria-label="Bắt đầu đếm nhịp CPR 110 lần mỗi phút"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Bắt đầu đếm nhịp</span>
          </button>
        )}
      </div>
    </div>
  );
};
