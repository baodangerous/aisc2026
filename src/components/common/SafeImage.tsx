import React, { useState } from 'react';
import { Activity, ShieldAlert, Heart, BookOpen, LucideIcon } from 'lucide-react';

interface SafeImageProps {
  src?: string;
  alt: string;
  fallbackCategory?: 'cpr' | 'stroke' | 'bleeding' | 'aed' | 'general';
  className?: string;
  containerClassName?: string;
}

const CATEGORY_FALLBACKS: Record<string, { icon: LucideIcon; label: string; bg: string; text: string }> = {
  cpr: { icon: Heart, label: 'Kỹ thuật CPR 110 bpm', bg: 'bg-rose-50', text: 'text-rose-600' },
  stroke: { icon: Activity, label: 'Quy tắc FAST Đột quỵ', bg: 'bg-amber-50', text: 'text-amber-600' },
  bleeding: { icon: ShieldAlert, label: 'Cầm máu khẩn cấp', bg: 'bg-blue-50', text: 'text-blue-600' },
  aed: { icon: Heart, label: 'Máy khử rung tim AED', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  general: { icon: BookOpen, label: 'Sơ cấp cứu chuẩn', bg: 'bg-slate-50', text: 'text-slate-600' },
};

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackCategory = 'general',
  className = 'w-full h-full object-cover',
  containerClassName = 'relative w-full h-full overflow-hidden bg-slate-900',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const fallback = CATEGORY_FALLBACKS[fallbackCategory] || CATEGORY_FALLBACKS.general;
  const FallbackIcon = fallback.icon;

  if (!src || hasError) {
    return (
      <div className={`${containerClassName} flex flex-col items-center justify-center p-4 ${fallback.bg}`}>
        <FallbackIcon className={`w-8 h-8 ${fallback.text} mb-1`} aria-hidden="true" />
        <span className={`text-xs font-semibold ${fallback.text} text-center line-clamp-1`}>
          {fallback.label}
        </span>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-slate-300" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};
