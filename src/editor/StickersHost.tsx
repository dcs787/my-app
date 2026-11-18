import StickersScreen from './StickersScreen';

/** Native: Skia is built in. (Web: see StickersHost.web.tsx.) */
export function StickersHost({ activityId }: { activityId: string }) {
  return <StickersScreen activityId={activityId} />;
}
