import EditorScreen from './EditorScreen';

/** Native: Skia is built in, render the editor directly. (Web: see EditorHost.web.tsx.) */
export function EditorHost({ activityId }: { activityId: string }) {
  return <EditorScreen activityId={activityId} />;
}
