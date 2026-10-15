import React from 'react';
import { Platform, View } from 'react-native';
import { Button } from './UI';

// Both sources are one tap away; neither asks for a title or a note.
export function PhotoActions({
  onPick,
  busy = false,
}: {
  onPick: (camera: boolean) => void;
  busy?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ flex: 1 }}>
        <Button
          title={Platform.OS === 'web' ? 'Add photo' : 'Take photo'}
          icon={Platform.OS === 'web' ? 'plus' : 'camera'}
          disabled={busy}
          onPress={() => onPick(Platform.OS !== 'web')}
        />
      </View>
      {Platform.OS !== 'web' && (
        <Button
          title="Library"
          icon="image"
          tone="secondary"
          disabled={busy}
          onPress={() => onPick(false)}
        />
      )}
    </View>
  );
}
