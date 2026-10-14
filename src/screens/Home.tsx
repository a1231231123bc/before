import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Project, orderedEntries } from '../domain';
import { photoSource } from '../photos';
import { colors as c, fonts as f } from '../theme';
import { Button, Icon, Label, s as ui } from '../components/UI';

export function Home({
  projects,
  onCreate,
  onOpen,
  onDemo,
}: {
  projects: Project[];
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDemo: () => void;
}) {
  const [search, setSearch] = useState('');
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const shown = projects.filter((p) =>
    `${p.title} ${p.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <View style={{ gap: 30 }}>
      <View style={{ gap: 11 }}>
        <Label>YOUR PERSONAL PROGRESS JOURNAL</Label>
        <Text
          accessibilityRole="header"
          style={[s.headline, wide && { fontSize: 60, lineHeight: 64 }]}
        >
          Look how far{wide ? ' ' : '\n'}you’ve come<Text style={{ color: c.accent }}>.</Text>
        </Text>
        <Text style={ui.body}>Small moments. Slow changes. Stories worth keeping.</Text>
      </View>
      {!projects.length ? (
        <View style={[s.hero, wide && { flexDirection: 'row' }]}>
          <View style={[s.heroCopy, wide && { width: '48%' }]}>
            <View style={s.chapter}>
              <View style={s.dot} />
              <Text style={s.chapterText}>A LITTLE PROGRESS, EVERY DAY</Text>
            </View>
            <Text style={s.heroTitle}>Good things{'\n'}take a little time.</Text>
            <Text style={s.heroText}>
              Your first seedling. A room coming together. Something you’re learning. Make room for
              the in-between.
            </Text>
            <View style={{ alignSelf: 'flex-start', marginTop: 8 }}>
              <Button
                title={projects.length ? 'Start another story' : 'Start your first story'}
                icon="plus"
                onPress={onCreate}
              />
            </View>
          </View>
          <View style={[s.heroArt, wide && { flex: 1, minHeight: 350 }]}>
            <View style={s.artCircle} />
            <View style={s.polaroidBack}>
              <Image source={photoSource('sample:white')} style={s.polaroidPhoto} />
              <Text style={s.polaroidLabel}>the beginning</Text>
            </View>
            <View style={s.polaroidFront}>
              <Image source={photoSource('sample:terracotta')} style={s.polaroidPhoto} />
              <Text style={s.polaroidLabel}>a little later ↗</Text>
            </View>
            <View style={s.sticker}>
              <Icon name="leaf" size={21} color={c.green} />
              <Text style={s.stickerText}>Let it grow.</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={[s.sample, { backgroundColor: c.sage }]}>
          <Icon name="leaf" size={28} color={c.green} />
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.sampleTitle}>Every moment counts.</Text>
            <Text style={ui.body}>
              {projects.reduce((total, p) => total + p.entries.length, 0)} moments kept across{' '}
              {projects.length} {projects.length === 1 ? 'story' : 'stories'}.
            </Text>
          </View>
        </View>
      )}
      <View style={{ gap: 20 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <View style={ui.row}>
            <Text style={s.sectionTitle}>Your stories</Text>
            <View style={s.count}>
              <Text style={s.countText}>{projects.length}</Text>
            </View>
          </View>
          {projects.length > 0 && (
            <Button title="New story" icon="plus" small tone="secondary" onPress={onCreate} />
          )}
        </View>
        {projects.length > 0 && (
          <View style={s.search}>
            <Icon name="search" size={18} color={c.muted} />
            <TextInput
              accessibilityLabel="Search stories"
              value={search}
              onChangeText={setSearch}
              placeholder="Find a story…"
              placeholderTextColor={c.muted}
              style={s.searchInput}
            />
          </View>
        )}
        {!projects.length ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Icon name="image" size={26} color={c.green} />
            </View>
            <Text style={s.emptyTitle}>Every story starts somewhere.</Text>
            <Text style={[ui.body, { textAlign: 'center', maxWidth: 310 }]}>
              Create a story, add a photo, and come back when something changes.
            </Text>
          </View>
        ) : (
          <View style={s.grid}>
            {shown.map((project) => {
              const entries = orderedEntries(project);
              const latest = entries.at(-1);
              return (
                <Pressable
                  key={project.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${project.title}`}
                  onPress={() => onOpen(project.id)}
                  style={({ pressed }) => [
                    s.card,
                    { width: wide ? '48.5%' : '100%' },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  {latest ? (
                    <Image source={photoSource(latest.imageUri)} style={s.cover} />
                  ) : (
                    <View style={[s.cover, s.placeholder]}>
                      <Icon
                        name={project.category === 'Plants' ? 'leaf' : 'image'}
                        size={45}
                        color={c.green}
                      />
                      <Text style={s.waiting}>Waiting for your first moment</Text>
                    </View>
                  )}
                  <View style={s.cardBody}>
                    <Label>{project.category}</Label>
                    <Text numberOfLines={2} style={s.cardTitle}>
                      {project.title}
                    </Text>
                    <View style={[ui.row, { justifyContent: 'space-between' }]}>
                      <Text style={ui.body}>
                        {entries.length} {entries.length === 1 ? 'moment' : 'moments'}
                      </Text>
                      <Icon name="arrow" size={20} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
            {!shown.length && (
              <Text style={ui.body}>No stories match “{search}”. Try another name.</Text>
            )}
          </View>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Explore a sample story"
        onPress={onDemo}
        style={({ pressed }) => [s.sample, pressed && { opacity: 0.7 }]}
      >
        <View style={s.sampleIcon}>
          <Icon name="compare" color={c.green} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.sampleTitle}>A little inspiration?</Text>
          <Text style={ui.body}>Explore a sample story</Text>
        </View>
        <Icon name="arrow" color={c.green} />
      </Pressable>
      <View style={[ui.row, { justifyContent: 'center', paddingBottom: 8 }]}>
        <Icon name="lock" size={14} color={c.muted} />
        <Text style={s.privacy}>Your moments stay on this device.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  headline: {
    fontFamily: f.serif,
    fontSize: 43,
    lineHeight: 46,
    color: c.ink,
    letterSpacing: -1.4,
  },
  hero: { backgroundColor: '#E9EDDF', borderRadius: 26, overflow: 'hidden' },
  heroCopy: { padding: 28, gap: 18, zIndex: 1 },
  chapter: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.green },
  chapterText: { fontFamily: f.bold, fontSize: 9, letterSpacing: 1.5, color: c.green },
  heroTitle: {
    fontFamily: f.serif,
    fontSize: 37,
    lineHeight: 40,
    color: c.dark,
    letterSpacing: -0.7,
  },
  heroText: {
    fontFamily: f.regular,
    fontSize: 14,
    lineHeight: 22,
    color: '#5F6C58',
    maxWidth: 330,
  },
  heroArt: { height: 270, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  artCircle: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#D9E1CB',
    top: 10,
  },
  polaroidBack: {
    position: 'absolute',
    left: '9%',
    top: 5,
    width: '43%',
    height: 222,
    backgroundColor: '#FFFEF8',
    padding: 9,
    paddingBottom: 2,
    transform: [{ rotate: '-11deg' }],
    boxShadow: '0px 8px 20px rgba(35, 50, 35, 0.12)',
  },
  polaroidFront: {
    position: 'absolute',
    right: '9%',
    top: 33,
    width: '43%',
    height: 222,
    backgroundColor: '#FFFEF8',
    padding: 9,
    paddingBottom: 2,
    transform: [{ rotate: '9deg' }],
    boxShadow: '0px 8px 20px rgba(35, 50, 35, 0.12)',
  },
  polaroidPhoto: { width: '100%', flex: 1, backgroundColor: c.sage },
  polaroidLabel: {
    fontFamily: f.serif,
    textAlign: 'center',
    fontSize: 15,
    color: c.ink,
    paddingVertical: 8,
  },
  sticker: {
    position: 'absolute',
    right: 18,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9F2D9',
    padding: 12,
    borderRadius: 12,
    transform: [{ rotate: '-7deg' }],
  },
  stickerText: { fontFamily: f.serif, fontSize: 17, color: c.green },
  sectionTitle: { fontFamily: f.serif, fontSize: 28, color: c.ink },
  count: {
    backgroundColor: c.sage,
    minWidth: 25,
    height: 25,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontFamily: f.bold, fontSize: 12, color: c.green },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C8CFBE',
    borderRadius: 20,
    padding: 27,
    alignItems: 'center',
    gap: 10,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    backgroundColor: c.sage,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  emptyTitle: { fontFamily: f.medium, fontSize: 17, color: c.ink, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20 },
  card: {
    borderRadius: 21,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
    overflow: 'hidden',
  },
  cover: { width: '100%', height: 220 },
  placeholder: { backgroundColor: c.sage, alignItems: 'center', justifyContent: 'center', gap: 14 },
  waiting: { fontFamily: f.medium, fontSize: 13, color: c.green },
  cardBody: { padding: 21, gap: 9 },
  cardTitle: { fontFamily: f.serif, fontSize: 28, color: c.ink },
  sample: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    padding: 20,
    backgroundColor: '#EEEFE5',
    borderRadius: 18,
  },
  sampleIcon: {
    backgroundColor: c.paper,
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleTitle: { fontFamily: f.bold, color: c.ink, fontSize: 14 },
  privacy: { fontFamily: f.regular, fontSize: 12, color: c.muted },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
    borderRadius: 12,
  },
  searchInput: { flex: 1, paddingVertical: 14, fontFamily: f.regular, fontSize: 14, color: c.ink },
});
