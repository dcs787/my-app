import { useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router';

import { ErrorScreen } from '@/components/ErrorScreen';

import { EditorHost } from '@/editor/EditorHost';

/** A crash in the editor stays in the editor; the design up to the last autosave is kept. */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorScreen {...props} />;
}

export default function EditorRoute() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  return <EditorHost activityId={activityId} />;
}
