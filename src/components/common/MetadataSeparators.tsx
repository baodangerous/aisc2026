import React from 'react';

interface MetadataItem {
  label: string;
  emphasis?: boolean;
}

interface MetadataRowProps {
  items: (string | MetadataItem | null | undefined | false)[];
  className?: string;
  separator?: string;
}

export const MetadataRow: React.FC<MetadataRowProps> = ({
  items,
  className = 'text-xs text-slate-500',
  separator = '·',
}) => {
  const validItems = items.filter(Boolean) as (string | MetadataItem)[];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {validItems.map((item, idx) => {
        const text = typeof item === 'string' ? item : item.label;
        const isEmphasized = typeof item === 'object' && item.emphasis;

        return (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <span className="text-slate-300 select-none" aria-hidden="true">
                {separator}
              </span>
            )}
            <span className={isEmphasized ? 'font-semibold text-slate-800' : ''}>{text}</span>
          </React.Fragment>
        );
      })}
    </div>
  );
};

interface FilterSegmentOption<T extends string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface FilterSegmentsProps<T extends string> {
  options: FilterSegmentOption<T>[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function FilterSegments<T extends string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: FilterSegmentsProps<T>) {
  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-1 text-xs'
      : 'px-3 py-1.5 text-xs';

  return (
    <div className={`flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg ${className}`}>
      {options.map((opt) => {
        const isActive = value === opt.id;
        const Icon = opt.icon;

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`${sizeClasses} font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              isActive
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
