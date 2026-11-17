import { FileUp, HeartPulse, PenLine } from 'lucide-react-native';
import { ScrollView } from 'react-native';

import { Button, EmptyState, useToast } from '@/ui';

// M1 replaces this with the activity list (S03).
export default function ActivitiesScreen() {
  const toast = useToast();
  const soon = () => toast('Coming in the next build');

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <EmptyState
        icon={FileUp}
        title="Bring in your first workout"
        body="Sync from Apple Health or Strava, open a file from your watch, or type one in."
        actions={
          <>
            <Button label="Connect Apple Health" icon={HeartPulse} fullWidth onPress={soon} />
            <Button label="Import a GPX, TCX or FIT file" icon={FileUp} variant="secondary" fullWidth onPress={soon} />
            <Button label="Add one by hand" icon={PenLine} variant="ghost" fullWidth onPress={soon} />
          </>
        }
      />
    </ScrollView>
  );
}
