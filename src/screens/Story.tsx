import React, { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Project, Entry, daySpan, formatDate, orderedEntries } from '../domain';
import { photoSource } from '../photos';
import { colors as c, fonts as f } from '../theme';
import { Button, Icon, IconButton, Label, Sheet, s as ui } from '../components/UI';
import { PhotoActions } from '../components/PhotoActions';
import { Comparison } from '../components/Comparison';
import { exportComparison } from '../export';
import { VideoExportSheet } from '../video/VideoExportSheet';
import type { VideoInput } from '../video/spec';

export function Story({
  project,
  demo,
  onAdd,
  onEdit,
  onEditEntry,
  onCompare,
  onCreate,
  busy,
}: {
  project: Project;
  demo: boolean;
  onAdd: (camera: boolean) => void;
  onEdit: () => void;
  onEditEntry: (entry: Entry) => void;
  onCompare: () => void;
  onCreate: (camera: boolean) => void;
  busy: boolean;
}) {
  const entries = orderedEntries(project);
  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 6 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text accessibilityRole="header" style={[ui.title, { flex: 1 }]}>
            {project.title}
          </Text>
          {!demo && <IconButton name="edit" label="Edit story" onPress={onEdit} />}
        </View>
        <Text style={ui.body}>
          {entries.length} {entries.length === 1 ? 'photo' : 'photos'}
          {entries.length > 1 ? ` · ${daySpan(entries)} days` : ''}
          {project.category !== 'Everyday' ? ` · ${project.category}` : ''}
        </Text>
      </View>
      {demo ? (
        <Text style={ui.body}>Sample photos of two different plants, for trying the app.</Text>
      ) : (
        <PhotoActions onPick={onAdd} busy={busy} />
      )}
      <Button
        title="Compare photos"
        icon="compare"
        tone="secondary"
        disabled={entries.length < 2}
        onPress={onCompare}
      />
      {entries.length < 2 && (
        <Text style={ui.body}>
          {entries.length ? 'Add another photo to compare.' : 'Add your first photo.'}
        </Text>
      )}
      <View style={s.gallery}>
        {[...entries].reverse().map((entry) => (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            disabled={demo || busy}
            accessibilityLabel={`Edit photo from ${formatDate(entry.date, true)}`}
            onPress={() => onEditEntry(entry)}
            style={({ pressed }) => [s.moment, pressed && { opacity: 0.75 }]}
          >
            <View style={s.photo}>
              <Image
                accessibilityLabel={`Moment from ${formatDate(entry.date, true)}`}
                source={photoSource(entry.imageUri)}
                style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
              />
            </View>
            <View style={[ui.row, { justifyContent: 'space-between', gap: 4 }]}>
              <Text style={s.date}>{formatDate(entry.date, true)}</Text>
              {!demo && <Icon name="edit" size={14} color={c.muted} />}
            </View>
            {!!entry.note && (
              <Text numberOfLines={2} style={ui.body}>
                {entry.note}
              </Text>
            )}
          </Pressable>
        ))}
      </View>
      {demo && (
        <View style={{ gap: 12 }}>
          <Text style={ui.body}>Start your own story</Text>
          <PhotoActions onPick={onCreate} busy={busy} />
        </View>
      )}
    </View>
  );
}

export function CompareScreen({ project }: { project: Project }) {
  const entries = orderedEntries(project);
  const [beforeId, setBeforeId] = useState(entries[0].id);
  const [afterId, setAfterId] = useState(entries.at(-1)!.id);
  const [selecting, setSelecting] = useState<'before' | 'after'>('before');
  const [exporting, setExporting] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [imageError, setImageError] = useState('');
  const [videoInput, setVideoInput] = useState<VideoInput | null>(null);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const card = useRef<View>(null);
  const before = entries.find((e) => e.id === beforeId) ?? entries[0];
  const after =
    entries.find((e) => e.id === afterId && e.id !== before.id) ??
    entries.find((e) => e.id !== before.id)!;
  const select = (entry: Entry) => {
    if (selecting === 'before') {
      if (entry.id === after.id) setAfterId(before.id);
      setBeforeId(entry.id);
    } else {
      if (entry.id === before.id) setBeforeId(after.id);
      setAfterId(entry.id);
    }
  };
  const share = async () => {
    if (exporting) return;
    setExporting(true);
    setImageError('');
    try {
      await exportComparison({ title: project.title, before, after, view: card });
    } catch (error) {
      setImageError(
        error instanceof Error ? error.message : 'The comparison could not be exported.',
      );
    } finally {
      setExporting(false);
    }
  };
  return (
    <View style={{ gap: 23 }}>
      <View style={{ gap: 10 }}>
        <Text accessibilityRole="header" style={ui.title}>
          Before & after
        </Text>
        <Text style={ui.body}>{project.title}</Text>
      </View>
      <Comparison before={before} after={after} />
      <Button
        title={choosing ? 'Done choosing' : 'Change photos'}
        tone="ghost"
        small
        onPress={() => setChoosing(!choosing)}
      />
      {choosing && (
        <>
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
                  selected: entry.id === (selecting === 'before' ? before.id : after.id),
                }}
                style={[
                  s.thumb,
                  entry.id === (selecting === 'before' ? before.id : after.id) && {
                    borderColor: c.accent,
                  },
                ]}
              >
                <Image source={photoSource(entry.imageUri)} style={s.thumbImage} />
                <Text style={s.thumbLabel}>{formatDate(entry.date)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}
      <View style={{ gap: 10 }}>
        <Button
          title="Create 6-second video"
          icon="share"
          onPress={() => setVideoInput({ title: project.title, before, after })}
        />
        <Text style={[ui.body, { fontSize: 12, textAlign: 'center' }]}>
          MP4 · 6 sec · Ready for Stories & Reels
        </Text>
        <Button
          title="Share image"
          icon="image"
          tone="secondary"
          onPress={() => {
            setLoaded({});
            setImageError('');
            setShowCard(true);
          }}
        />
      </View>
      {showCard && (
        <Sheet
          title="Share image"
          onClose={() => {
            if (!exporting) setShowCard(false);
          }}
        >
          <View ref={card} collapsable={false} style={s.shareCard}>
            <Text style={s.shareTitle}>{project.title}</Text>
            <View style={s.pair}>
              {[before, after].map((entry, index) => (
                <View key={`${index}-${entry.id}`} style={{ flex: 1, gap: 7 }}>
                  <View style={s.shareImage}>
                    <Image
                      source={photoSource(entry.imageUri)}
                      style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
                      onLoad={() => setLoaded((prev) => ({ ...prev, [entry.id]: true }))}
                      onError={() => {
                        setLoaded((prev) => ({ ...prev, [entry.id]: false }));
                        setImageError('Couldn’t load this photo. Close the preview and try again.');
                      }}
                    />
                  </View>
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
          {!!imageError && (
            <Text accessibilityRole="alert" style={[ui.body, { color: c.danger }]}>
              {imageError}
            </Text>
          )}
          <Button
            title="Export comparison"
            icon="share"
            busy={exporting}
            disabled={!loaded[before.id] || !loaded[after.id]}
            onPress={share}
          />
        </Sheet>
      )}
      {videoInput && <VideoExportSheet input={videoInput} onClose={() => setVideoInput(null)} />}
    </View>
  );
}

const s = StyleSheet.create({
  gallery: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 22 },
  moment: { width: '48%', gap: 9 },
  date: { fontFamily: f.medium, fontSize: 12, color: c.ink },
  photo: {
    width: '100%',
    aspectRatio: 0.85,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: c.sage,
  },
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
  shareImage: {
    width: '100%',
    aspectRatio: 0.7,
    overflow: 'hidden',
    backgroundColor: c.sage,
    borderRadius: 8,
  },
  shareBrand: { fontFamily: f.serif, fontSize: 24, color: c.green },
  shareTag: {
    fontFamily: f.regular,
    color: c.muted,
    fontSize: 9,
    flexShrink: 1,
    textAlign: 'right',
  },
});
