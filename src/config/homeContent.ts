import { Brain, Droplets, HeartPulse, type LucideIcon } from 'lucide-react';

export type HomeExercise = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export const HOME_EXERCISES: HomeExercise[] = [
  { id: 'sc_ohca_01', label: 'Ép tim', icon: HeartPulse },
  { id: 'sc_stroke_02', label: 'Đột quỵ', icon: Brain },
  { id: 'sc_bleeding_03', label: 'Cầm máu', icon: Droplets },
];
