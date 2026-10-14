import React, { useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Entry } from '../domain';
import { photoSource } from '../photos';
import { colors as c, fonts as f } from '../theme';
import { Button } from './UI';

export function Comparison({ before, after }: { before: Entry; after: Entry }) {
  const [width, setWidth] = useState(320);
  const [position, setPosition] = useState(0.5);
  const frame = useRef<View>(null);
  const origin = useRef(0);
  const change = (next: number) => setPosition(Math.max(0.02, Math.min(0.98, next)));
  const webAccessibility =
    Platform.OS === 'web'
      ? {
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-valuenow': Math.round(position * 100),
          tabIndex: 0 as const,
          onKeyDown: (event: React.KeyboardEvent) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            change(
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? 1
                  : position + (event.key === 'ArrowRight' ? 0.05 : -0.05),
            );
          },
        }
      : {};
  return (
    <View style={{ gap: 12 }}>
      <View
        {...webAccessibility}
        ref={frame}
        style={s.frame}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        accessible
        accessibilityLabel="Before and after comparison"
        accessibilityRole="adjustable"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(position * 100) }}
        accessibilityHint="Swipe to reveal each image, or use the More before and More after buttons."
        accessibilityActions={[
          { name: 'increment', label: 'More before' },
          { name: 'decrement', label: 'More after' },
        ]}
        onAccessibilityAction={(event) =>
          change(position + (event.nativeEvent.actionName === 'increment' ? 0.1 : -0.1))
        }
        onStartShouldSetResponder={() => true}
        onResponderGrant={(event) => {
          const pageX = event.nativeEvent.pageX;
          frame.current?.measureInWindow((x) => {
            origin.current = x;
            change((pageX - x) / width);
          });
        }}
        onResponderMove={(event) => change((event.nativeEvent.pageX - origin.current) / width)}
        onResponderTerminationRequest={() => false}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image source={photoSource(after.imageUri)} style={s.photo} resizeMode="cover" />
          <View style={[s.clipped, { width: width * position }]}>
            <Image
              source={photoSource(before.imageUri)}
              style={[s.photo, { width }]}
              resizeMode="cover"
            />
          </View>
          <View style={[s.divider, { left: width * position - 1 }]}>
            <View style={s.handle}>
              <Text style={s.arrows}>‹ ›</Text>
            </View>
          </View>
          <View style={[s.badge, { left: 16 }]}>
            <Text style={s.badgeText}>BEFORE</Text>
          </View>
          <View style={[s.badge, { right: 16 }]}>
            <Text style={s.badgeText}>AFTER</Text>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Button title="More before" tone="ghost" small onPress={() => change(position + 0.15)} />
        <Button title="More after" tone="ghost" small onPress={() => change(position - 0.15)} />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: 0.95,
    backgroundColor: c.sage,
    borderRadius: 23,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  clipped: { position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden' },
  divider: {
    width: 2,
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: c.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    backgroundColor: c.paper,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff88',
  },
  arrows: { fontSize: 24, color: c.ink, lineHeight: 29 },
  badge: {
    position: 'absolute',
    bottom: 16,
    backgroundColor: '#283D31AA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },
  badgeText: { fontFamily: f.bold, color: c.white, fontSize: 10, letterSpacing: 1.5 },
});
