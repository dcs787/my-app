import {
  Activity,
  Bike,
  Dumbbell,
  FlagTriangleRight,
  Footprints,
  Mountain,
  MountainSnow,
  Sailboat,
  WavesHorizontal,
  Wind,
  type LucideIcon,
} from 'lucide-react-native';

import type { ActivityType } from '@/domain/types';

const ICONS: Record<ActivityType, LucideIcon> = {
  run: Footprints,
  trail_run: Mountain,
  walk: Footprints,
  hike: Mountain,
  ride: Bike,
  swim: WavesHorizontal,
  skate: Wind,
  ski: MountainSnow,
  row: Sailboat,
  climb: FlagTriangleRight,
  workout: Dumbbell,
  other: Activity,
};

export const activityIcon = (t: ActivityType): LucideIcon => ICONS[t] ?? Activity;
