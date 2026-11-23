import {
  Activity,
  Bike,
  Dumbbell,
  FlagTriangleRight,
  Footprints,
  Mountain,
  MountainSnow,
  Orbit,
  PersonStanding,
  Sailboat,
  WavesHorizontal,
  Wind,
  type LucideIcon,
} from '@/ui/icons';

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
  yoga: PersonStanding,
  elliptical: Orbit,
  workout: Dumbbell,
  other: Activity,
};

export const activityIcon = (t: ActivityType): LucideIcon => ICONS[t] ?? Activity;
