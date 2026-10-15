import { ArrowUpRight, HeartPulse, Brain, Droplets, BookOpen, Video } from 'lucide-react';
import type { MedicalLearningResource } from '../../domain/schemas';

export function LearningResourceCard({ resource, onOpen }: { resource: MedicalLearningResource; onOpen: () => void }) {
  const Icon = resource.topic === 'cardiac_arrest' ? HeartPulse : resource.topic === 'stroke' ? Brain : resource.topic === 'bleeding' ? Droplets : BookOpen;
  return (
    <button type="button" onClick={onOpen} className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-surface p-5 text-left text-foreground transition-colors hover:border-primary focus-visible:outline-primary">
      <span className="flex w-full items-center justify-between text-primary">
        <Icon className="size-8" aria-hidden="true" />
        <ArrowUpRight className="size-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-lg font-semibold">{resource.title}</span>
        <span className="text-sm leading-relaxed text-muted">{resource.sourceOrganization}</span>
      </span>
      <span className="mt-auto flex items-center gap-2 text-sm text-muted">
        {resource.mediaType === 'video' ? <Video className="size-4" aria-hidden="true" /> : <BookOpen className="size-4" aria-hidden="true" />}
        {resource.mediaType === 'video' ? 'Video tại nguồn' : 'Tài liệu gốc'}
      </span>
    </button>
  );
}
