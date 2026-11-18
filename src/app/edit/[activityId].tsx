import { useLocalSearchParams } from 'expo-router';

import { EditorHost } from '@/editor/EditorHost';

export default function EditorRoute() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  return <EditorHost activityId={activityId} />;
}
