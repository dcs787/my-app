import { useLocalSearchParams } from 'expo-router';

import { StickersHost } from '@/editor/StickersHost';

export default function StickersRoute() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  return <StickersHost activityId={activityId} />;
}
