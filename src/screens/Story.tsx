import React, { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Project, Entry, daySpan, formatDate, orderedEntries } from '../domain';
import { photoSource } from '../photos';
import { colors as c, fonts as f } from '../theme';
import { Button, Icon, IconButton, Label, s as ui } from '../components/UI';
import { Comparison } from '../components/Comparison';
import { exportComparison } from '../export';
import { VideoExportSheet } from '../video/VideoExportSheet';
import type { VideoInput } from '../video/spec';

export function Story({
  project,
  demo,
  onAdd,
  onEdit,
  onDelete,
  onDeleteEntry,
  onCompare,
  onCreate,
}: {
  project: Project;
  demo: boolean;
  onAdd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteEntry: (entry: Entry) => void;
  onCompare: () => void;
  onCreate: () => void;
}) {
  const entries = orderedEntries(project);
  return (
    <View style={{ gap: 27 }}>
      <View style={{ gap: 12 }}>
        <Label>
          {project.category}
          {demo ? ' / SAMPLE STORY' : ' / YOUR STORY'}
        </Label>
        <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
          <Text accessibilityRole="header" style={[ui.title, { flex: 1 }]}>
            {project.title}
          </Text>
          {!demo && <IconButton name="edit" label="Edit story" onPress={onEdit} />}
        </View>
        <Text style={ui.body}>
          {entries.length} {entries.length === 1 ? 'moment' : 'moments'} collected
          {entries.length > 1 ? ` · ${daySpan(entries)} days between first and latest` : ''}
        </Text>
      </View>
      {demo && (
        <View style={s.demoNotice}>
          <Icon name="info" size={19} color={c.green} />
          <Text style={[ui.body, { flex: 1, fontSize: 13 }]}>
            A sample with two different plants to try the app. These photos don’t document a real
            transformation.
          </Text>
        </View>
      )}
      <View style={[ui.row, { flexWrap: 'wrap' }]}>
        {demo ? (
          <Button title="Start your own story" icon="plus" onPress={onCreate} />
        ) : (
          <Button title="Add a moment" icon="plus" onPress={onAdd} />
        )}
        <Button
          title="Compare photos"
          icon="compare"
          tone="secondary"
          disabled={entries.length < 2}
          onPress={onCompare}
        />
      </View>
      {entries.length < 2 && (
        <Text style={ui.body}>
          {entries.length === 0
            ? 'Start with a photo of where you are today.'
            : 'Add one more moment to see your progress side by side.'}
        </Text>
      )}
      <View style={s.timelineHeader}>
        <Label>THE IN-BETWEEN</Label>
        <View style={s.line} />
        <Text style={s.orderLabel}>Latest first</Text>
      </View>
      {[...entries].reverse().map((entry, index) => (
        <View key={entry.id} style={s.moment}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <View style={ui.row}>
              <View
                style={[s.momentDot, index === entries.length - 1 && { backgroundColor: c.accent }]}
              />
              <Text style={s.date}>{formatDate(entry.date, true)}</Text>
            </View>
            <Label>
              {index === entries.length - 1 ? 'THE BEGINNING' : `MOMENT ${entries.length - index}`}
            </Label>
          </View>
          <Image
            accessibilityLabel={`Moment from ${formatDate(entry.date, true)}`}
            source={photoSource(entry.imageUri)}
            style={s.photo}
          />
          <View style={[ui.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
            <Text style={[ui.body, { flex: 1, color: c.ink }]}>
              {entry.note || 'A moment worth keeping.'}
            </Text>
            {!demo && (
              <IconButton
                name="trash"
                label={`Delete moment from ${formatDate(entry.date, true)}`}
                onPress={() => onDeleteEntry(entry)}
              />
            )}
          </View>
        </View>
      ))}
      {!entries.length && (
        <View style={s.emptyMoment}>
          <Icon name="camera" size={40} color={c.green} />
          <Text style={s.emptyTitle}>This is your before.</Text>
          <Text style={[ui.body, { textAlign: 'center' }]}>
            It doesn’t have to be perfect.{'\n'}It just has to be a beginning.
          </Text>
          <Button title="Add your first photo" icon="image" tone="secondary" onPress={onAdd} />
        </View>
      )}
      {!demo && <Button title="Delete story" tone="ghost" icon="trash" onPress={onDelete} />}
    </View>
  );
}

export function CompareScreen({
  project,
  onError,
}: {
  project: Project;
  onError: (message: string) => void;
}) {
  const entries = orderedEntries(project);
  const [beforeId, setBeforeId] = useState(entries[0].id);
  const [afterId, setAfterId] = useState(entries.at(-1)!.id);
  const [selecting, setSelecting] = useState<'before' | 'after'>('before');
  const [exporting, setExporting] = useState(false);
  const [videoInput, setVideoInput] = useState<VideoInput | null>(null);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const card = useRef<View>(null);
  const before = entries.find((e) => e.id === beforeId)!;
  const after = entries.find((e) => e.id === afterId)!;
  const select = (entry: Entry) => {
    if (selecting === 'before') {
      if (entry.id === afterId) setAfterId(beforeId);
      setBeforeId(entry.id);
    } else {
      if (entry.id === beforeId) setBeforeId(afterId);
      setAfterId(entry.id);
    }
  };
  const share = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportComparison({ title: project.title, before, after, view: card });
    } catch (error) {
      onError(error instanceof Error ? error.message : 'The comparison could not be exported.');
    } finally {
      setExporting(false);
    }
  };
  return (
    <View style={{ gap: 23 }}>
      <View style={{ gap: 10 }}>
        <Label>A CHANGE WORTH SEEING</Label>
        <Text accessibilityRole="header" style={ui.title}>
          Then. And now.
        </Text>
        <Text style={ui.body}>{project.title} · Drag the divider to explore.</Text>
      </View>
      <Comparison before={before} after={after} />
      <View style={s.pair}>
        {(['before', 'after'] as const).map((side) => (
          <Pressable
            key={side}
            accessibilityRole="button"
            accessibilityLabel={`Choose ${side} photo`}
            accessibilityState={{ selected: selecting === side }}
            onPress={() => setSelecting(side)}
            style={[
              s.pairButton,
              selecting === side && { borderColor: c.green, backgroundColor: c.sage },
            ]}
          >
            <Label>{side}</Label>
            <Text style={s.date}>
              {formatDate((side === 'before' ? before : after).date, true)}
            </Text>
            <Text style={s.chooseLabel}>Tap to choose a moment</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, padding: 2 }}
      >
        {entries.map((entry) => (
          <Pressable
            key={entry.id}
            onPress={() => select(entry)}
            accessibilityRole="button"
            accessibilityLabel={`Use ${formatDate(entry.date, true)} as ${selecting}`}
            accessibilityState={{
              selected: entry.id === (selecting === 'before' ? beforeId : afterId),
            }}
            style={[
              s.thumb,
              entry.id === (selecting === 'before' ? beforeId : afterId) && {
                borderColor: c.accent,
              },
            ]}
          >
            <Image source={photoSource(entry.imageUri)} style={s.thumbImage} />
            <Text style={s.thumbLabel}>{formatDate(entry.date)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ gap: 12 }}>
        <Label>YOUR PROGRESS, IN MOTION</Label>
        <Text style={ui.body}>
          A six-second before-and-after loop, ready for Stories and Reels.
        </Text>
        <Button
          title="Create 6-second video"
          icon="share"
          disabled={!loaded[before.id] || !loaded[after.id]}
          onPress={() => setVideoInput({ title: project.title, before, after })}
        />
        <Text style={[ui.body, { fontSize: 12 }]}>
          Vertical MP4 · Save to Photos or share · Made on your device
        </Text>
      </View>
      <View style={{ gap: 12 }}>
        <Label>YOUR SHARE CARD</Label>
        <View ref={card} collapsable={false} style={s.shareCard}>
          <Text style={s.shareTitle}>{project.title}</Text>
          <View style={s.pair}>
            {[before, after].map((entry, index) => (
              <View key={`${index}-${entry.id}`} style={{ flex: 1, gap: 7 }}>
                <Image
                  source={photoSource(entry.imageUri)}
                  style={s.shareImage}
                  onLoad={() => setLoaded((prev) => ({ ...prev, [entry.id]: true }))}
                  onError={() => setLoaded((prev) => ({ ...prev, [entry.id]: false }))}
                />
                <Label>{index === 0 ? 'BEFORE' : 'AFTER'}</Label>
                <Text style={s.thumbLabel}>{formatDate(entry.date, true)}</Text>
              </View>
            ))}
          </View>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={s.shareBrand}>before.</Text>
            <Text style={s.shareTag}>Small moments. Visible progress.</Text>
          </View>
        </View>
        <Button
          title="Export comparison"
          icon="share"
          busy={exporting}
          disabled={!loaded[before.id] || !loaded[after.id]}
          onPress={share}
        />
        <Text style={[ui.body, { textAlign: 'center', fontSize: 12 }]}>
          A keepsake of how far you’ve come.
        </Text>
      </View>
      {videoInput && <VideoExportSheet input={videoInput} onClose={() => setVideoInput(null)} />}
    </View>
  );
}

const s = StyleSheet.create({
  demoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: c.sage,
    padding: 16,
    borderRadius: 15,
  },
  timelineHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 5 },
  line: { flex: 1, height: 1, backgroundColor: c.line },
  orderLabel: { fontFamily: f.regular, fontSize: 12, color: c.muted },
  moment: { gap: 15, paddingBottom: 12 },
  momentDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.green },
  date: { fontFamily: f.medium, fontSize: 14, color: c.ink },
  photo: { width: '100%', aspectRatio: 1.15, borderRadius: 22, backgroundColor: c.sage },
  emptyMoment: {
    backgroundColor: c.sage,
    padding: 35,
    borderRadius: 24,
    alignItems: 'center',
    gap: 20,
  },
  emptyTitle: { fontFamily: f.serif, color: c.ink, fontSize: 30 },
  pair: { flexDirection: 'row', gap: 10 },
  pairButton: {
    flex: 1,
    gap: 9,
    padding: 15,
    borderRadius: 15,
    borderColor: c.line,
    borderWidth: 1,
    backgroundColor: c.paper,
  },
  chooseLabel: { fontFamily: f.regular, fontSize: 11, color: c.muted },
  thumb: {
    width: 84,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 3,
    borderRadius: 13,
    gap: 6,
  },
  thumbImage: { width: '100%', height: 80, borderRadius: 8 },
  thumbLabel: { fontFamily: f.regular, fontSize: 11, color: c.muted },
  shareCard: {
    padding: 18,
    backgroundColor: c.paper,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: c.line,
    gap: 15,
  },
  shareTitle: { fontFamily: f.serif, color: c.ink, fontSize: 24 },
  shareImage: { width: '100%', aspectRatio: 0.7, backgroundColor: c.sage, borderRadius: 8 },
  shareBrand: { fontFamily: f.serif, fontSize: 24, color: c.green },
  shareTag: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 9,
    flexShrink: 1,
    textAlign: 'right',
  },
});
