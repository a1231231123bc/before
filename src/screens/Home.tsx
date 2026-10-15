import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Project, orderedEntries, formatDate } from '../domain';
import { photoSource } from '../photos';
import { colors as c, fonts as f } from '../theme';
import { Button, Icon, IconButton, s as ui } from '../components/UI';
import { PhotoActions } from '../components/PhotoActions';

export function Home({
  projects,
  onCreate,
  onOpen,
  onDemo,
  busy,
}: {
  projects: Project[];
  onCreate: (camera: boolean) => void;
  onOpen: (id: string) => void;
  onDemo: () => void;
  busy: boolean;
}) {
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const shown = projects.filter((p) =>
    `${p.title} ${p.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 16 }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}>
          <Text accessibilityRole="header" style={ui.title}>
            {projects.length ? 'Your stories' : 'Start with a photo.'}
          </Text>
          {!!projects.length && (
            <IconButton
              name="search"
              label="Search stories"
              onPress={() => {
                setSearching(!searching);
                setSearch('');
              }}
            />
          )}
        </View>
        {!projects.length && (
          <Text style={ui.body}>One photo today. Another when things change.</Text>
        )}
        {!!projects.length && <Text style={ui.body}>Start a new story</Text>}
        <PhotoActions onPick={onCreate} busy={busy} />
      </View>
      {searching && (
        <View style={s.search}>
          <Icon name="search" size={18} color={c.muted} />
          <TextInput
            accessibilityLabel="Search stories"
            value={search}
            onChangeText={setSearch}
            placeholder="Name or category"
            placeholderTextColor={c.muted}
            style={s.searchInput}
            autoFocus
          />
        </View>
      )}
      {!!projects.length && (
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
                style={({ pressed }) => [s.card, pressed && { opacity: 0.75 }]}
              >
                {latest ? (
                  <View style={s.cover}>
                    <Image
                      source={photoSource(latest.imageUri)}
                      style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
                    />
                  </View>
                ) : (
                  <View style={[s.cover, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Icon name="image" size={32} color={c.green} />
                  </View>
                )}
                <Text numberOfLines={2} style={s.cardTitle}>
                  {project.title}
                </Text>
                <Text style={s.caption}>
                  {entries.length} {entries.length === 1 ? 'photo' : 'photos'}
                  {latest ? ` · ${formatDate(latest.date)}` : ''}
                </Text>
              </Pressable>
            );
          })}
          {!shown.length && <Text style={ui.body}>No stories match “{search}”.</Text>}
        </View>
      )}
      <Button title="Explore a sample story" icon="compare" tone="ghost" small onPress={onDemo} />
      {!projects.length && <Text style={s.privacy}>Saved on this device. Just for you.</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 24 },
  card: { width: '48%', gap: 7 },
  cover: {
    width: '100%',
    aspectRatio: 0.9,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: c.sage,
  },
  cardTitle: { fontFamily: f.medium, fontSize: 17, color: c.ink },
  caption: { fontFamily: f.regular, fontSize: 12, color: c.muted },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 13,
  },
  searchInput: { flex: 1, paddingVertical: 14, fontFamily: f.regular, fontSize: 16, color: c.ink },
  privacy: { textAlign: 'center', fontFamily: f.regular, fontSize: 12, color: c.muted },
});
