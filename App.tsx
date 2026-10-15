import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display/400Regular';
import * as ImagePicker from 'expo-image-picker';
import {
  CATEGORIES,
  Category,
  Entry,
  Journal,
  Project,
  SAMPLE_PROJECT,
  isValidDate,
  makeId,
  today,
} from './src/domain';
import { saveJournal } from './src/storage';
import { Stack, useRouter } from 'expo-router';
import { JournalProvider, useJournal } from './src/JournalProvider';
import { preparePhoto, removePhoto } from './src/media';
import { photoSource } from './src/photos';
import { colors as c, fonts as f } from './src/theme';
import { Button, Field, Icon, IconButton, Label, Sheet, s as ui } from './src/components/UI';
import { Home } from './src/screens/Home';
import { PhotoActions } from './src/components/PhotoActions';
import { CompareScreen, Story } from './src/screens/Story';

type Screen =
  | { name: 'home' }
  | { name: 'about' }
  | { name: 'story'; id: string }
  | { name: 'compare'; id: string };
type Dialog =
  | { type: 'project'; project: Project }
  | { type: 'unsaved'; projectId?: string; entry: Entry }
  | { type: 'moment'; project: Project; entry: Entry }
  | { type: 'deleteProject'; project: Project }
  | { type: 'deleteEntry'; project: Project; entry: Entry };

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {fontsLoaded || fontError ? (
        <JournalProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'none',
              contentStyle: { backgroundColor: c.background },
            }}
          />
        </JournalProvider>
      ) : (
        <View style={s.loading}>
          <ActivityIndicator color={c.green} />
        </View>
      )}
    </SafeAreaProvider>
  );
}

export function BeforeApp({ screen }: { screen: Screen }) {
  const router = useRouter();
  const { journal, setJournal, ready, loadError, read } = useJournal();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const lock = useRef(false);
  const pickLock = useRef(false);
  const latestJournal = useRef(journal);
  latestJournal.current = journal;
  const scroll = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const screenId = 'id' in screen ? screen.id : undefined;
  const current =
    'id' in screen
      ? screen.id === 'sample'
        ? SAMPLE_PROJECT
        : journal.projects.find((p) => p.id === screen.id)
      : undefined;
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [screen.name, screenId]);
  const navigate = (next: Screen) => {
    setError('');
    if (next.name === 'home') router.navigate('/');
    else if (next.name === 'about') router.navigate('/about');
    else
      router.navigate({
        pathname: next.name === 'story' ? '/story/[id]' : '/compare/[id]',
        params: { id: next.id },
      });
  };
  const back = () =>
    navigate(screen.name === 'compare' ? { name: 'story', id: screen.id } : { name: 'home' });
  const showDialog = (next: Dialog) => {
    setError('');
    setDialog(next);
  };
  const closeDialog = () => {
    if (lock.current) return;
    if (dialog?.type === 'unsaved') void removePhoto(dialog.entry.imageUri).catch(() => {});
    setDialog(null);
    setError('');
  };
  // Persist first: a failed write must never look like a successful save.
  const commit = async (next: Journal, after: () => void) => {
    if (lock.current) return false;
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      await saveJournal(next);
      setJournal(next);
      after();
      return true;
    } catch {
      setError('Couldn’t save your changes. Check the free space on your device and try again.');
      return false;
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  const saveProject = async (title: string, category: Category, existing: Project) => {
    await commit(
      {
        ...journal,
        projects: journal.projects.map((p) =>
          p.id === existing.id ? { ...p, title, category } : p,
        ),
      },
      () => setDialog(null),
    );
  };
  const savePhoto = async (draft: Extract<Dialog, { type: 'unsaved' }>) => {
    const latest = latestJournal.current;
    const existing = latest.projects.find((p) => p.id === draft.projectId);
    if (draft.projectId && !existing) {
      setDialog(draft);
      setError('This story was deleted. Close this photo and start a new story.');
      return;
    }
    let number = 1;
    while (latest.projects.some((p) => p.title === `Story ${number}`)) number++;
    const project: Project = existing
      ? { ...existing, entries: [...existing.entries, draft.entry] }
      : {
          id: makeId(),
          title: `Story ${number}`,
          category: 'Everyday',
          createdAt: draft.entry.createdAt,
          entries: [draft.entry],
        };
    const saved = await commit(
      {
        ...latest,
        projects: existing
          ? latest.projects.map((p) => (p.id === project.id ? project : p))
          : [project, ...latest.projects],
      },
      () => {
        setDialog(null);
        if (!existing) navigate({ name: 'story', id: project.id });
        else scroll.current?.scrollTo({ y: 0, animated: true });
      },
    );
    // Keep the prepared photo for retry; never report success before persistence.
    if (!saved) setDialog(draft);
  };
  const pick = async (projectId: string | undefined, camera: boolean) => {
    if (pickLock.current || lock.current) return;
    pickLock.current = true;
    setPicking(true);
    setError('');
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted)
          throw new Error('Camera access is off. Enable it in device settings or use Library.');
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const image = result.assets[0];
      const imageUri = await preparePhoto(image.uri, image.width, image.height);
      await savePhoto({
        type: 'unsaved',
        projectId,
        entry: {
          id: makeId(),
          imageUri,
          date: today(),
          note: '',
          createdAt: new Date().toISOString(),
        },
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'This photo could not be opened. Please try another photo.',
      );
    } finally {
      pickLock.current = false;
      setPicking(false);
    }
  };
  const saveMoment = async (date: string, note: string) => {
    if (dialog?.type !== 'moment') return;
    await commit(
      {
        ...journal,
        projects: journal.projects.map((p) =>
          p.id === dialog.project.id
            ? {
                ...p,
                entries: p.entries.map((entry) =>
                  entry.id === dialog.entry.id ? { ...entry, date, note } : entry,
                ),
              }
            : p,
        ),
      },
      () => setDialog(null),
    );
  };
  const confirmDelete = async () => {
    if (!dialog || (dialog.type !== 'deleteProject' && dialog.type !== 'deleteEntry')) return;
    const deletingProject = dialog.type === 'deleteProject';
    const removed = deletingProject ? dialog.project.entries : [dialog.entry];
    const next = {
      ...journal,
      projects: deletingProject
        ? journal.projects.filter((p) => p.id !== dialog.project.id)
        : journal.projects.map((p) =>
            p.id === dialog.project.id
              ? { ...p, entries: p.entries.filter((e) => e.id !== dialog.entry.id) }
              : p,
          ),
    };
    const success = await commit(next, () => {
      setDialog(null);
      if (deletingProject) navigate({ name: 'home' });
    });
    if (success)
      await Promise.all(removed.map((entry) => removePhoto(entry.imageUri).catch(() => {})));
  };

  if (!ready)
    return (
      <View style={s.loading}>
        {loadError ? (
          <View style={{ maxWidth: 360, gap: 20, padding: 24 }}>
            <Text style={ui.title}>Couldn’t open your journal.</Text>
            <Text style={ui.body}>{loadError}</Text>
            <Button title="Try again" onPress={() => void read()} />
          </View>
        ) : (
          <ActivityIndicator color={c.green} />
        )}
      </View>
    );
  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom', 'left', 'right']}>
      <View
        pointerEvents={picking || saving ? 'none' : 'auto'}
        style={[s.header, wide && { paddingHorizontal: 40 }]}
      >
        <View style={s.headerInner}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Before home"
            onPress={() => navigate({ name: 'home' })}
            style={ui.row}
          >
            <View style={s.logo}>
              <Icon name="compare" color={c.white} size={21} />
            </View>
            <Text style={s.wordmark}>
              before<Text style={{ color: c.accent }}>.</Text>
            </Text>
          </Pressable>
          <View style={ui.row}>
            <IconButton
              name="info"
              label="About Before"
              onPress={() => navigate({ name: 'about' })}
            />
          </View>
        </View>
      </View>
      <ScrollView
        ref={scroll}
        pointerEvents={picking || saving ? 'none' : 'auto'}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, wide && { padding: 40 }]}
      >
        <View
          style={[
            s.container,
            (screen.name === 'story' || screen.name === 'compare') && { maxWidth: 620 },
          ]}
        >
          {screen.name !== 'home' && (
            <View style={{ alignSelf: 'flex-start', marginBottom: 22 }}>
              <Button
                title={screen.name === 'compare' ? 'Back to story' : 'All stories'}
                icon="back"
                tone="ghost"
                small
                onPress={back}
              />
            </View>
          )}
          {!!error && !dialog && (
            <View accessibilityRole="alert" style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
              <Button title="Dismiss" small tone="ghost" onPress={() => setError('')} />
            </View>
          )}
          {picking && (
            <View style={[ui.row, { padding: 16 }]}>
              <ActivityIndicator color={c.green} />
              <Text style={ui.body}>Preparing your photo…</Text>
            </View>
          )}
          {screen.name === 'home' && (
            <Home
              projects={journal.projects}
              onOpen={(id) => navigate({ name: 'story', id })}
              onDemo={() => navigate({ name: 'story', id: 'sample' })}
            />
          )}
          {screen.name === 'story' && current && (
            <Story
              project={current}
              demo={current.id === 'sample'}
              onEdit={() => showDialog({ type: 'project', project: current })}
              onEditEntry={(entry) => showDialog({ type: 'moment', project: current, entry })}
              onCompare={() => navigate({ name: 'compare', id: current.id })}
              busy={picking || saving}
            />
          )}
          {screen.name === 'compare' && current && current.entries.length >= 2 && (
            <CompareScreen key={current.id} project={current} />
          )}
          {screen.name === 'about' && <About />}
          {'id' in screen && !current && (
            <View style={{ gap: 16 }}>
              <Text style={ui.title}>Story not found.</Text>
              <Text style={ui.body}>
                This story may have been deleted or belongs to another device.
              </Text>
              <Button title="Go to your stories" onPress={() => navigate({ name: 'home' })} />
            </View>
          )}
          {screen.name === 'compare' && current && current.entries.length < 2 && (
            <Text style={ui.body}>Add two moments to this story to compare your progress.</Text>
          )}
        </View>
      </ScrollView>
      {(screen.name === 'home' || (screen.name === 'story' && current)) && (
        <View style={s.photoBar}>
          <View style={[s.container, { gap: 10 }, screen.name === 'story' && { maxWidth: 620 }]}>
            {((screen.name === 'home' && journal.projects.length > 0) ||
              current?.id === 'sample') && (
              <Text style={[ui.body, { fontSize: 12 }]}>Start a new story</Text>
            )}
            <PhotoActions
              busy={picking || saving}
              onPick={(camera) =>
                void pick(
                  screen.name === 'story' && current?.id !== 'sample' ? current?.id : undefined,
                  camera,
                )
              }
            />
          </View>
        </View>
      )}
      {dialog?.type === 'project' && (
        <Sheet title="Story details" onClose={closeDialog}>
          <ProjectForm project={dialog.project} busy={saving} error={error} onSave={saveProject} />
          <Button
            title="Delete story"
            tone="ghost"
            icon="trash"
            disabled={saving}
            onPress={() => showDialog({ type: 'deleteProject', project: dialog.project })}
          />
        </Sheet>
      )}
      {dialog?.type === 'moment' && (
        <Sheet title="Photo details" onClose={closeDialog}>
          <MomentForm entry={dialog.entry} error={error} busy={saving} onSave={saveMoment} />
          <Button
            title="Delete photo"
            tone="ghost"
            icon="trash"
            disabled={saving}
            onPress={() =>
              showDialog({ type: 'deleteEntry', project: dialog.project, entry: dialog.entry })
            }
          />
        </Sheet>
      )}
      {dialog?.type === 'unsaved' && (
        <Sheet title="Photo not saved" onClose={closeDialog}>
          <Image
            source={photoSource(dialog.entry.imageUri)}
            style={{ width: '100%', height: 210, borderRadius: 16 }}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={s.errorText}>
              {error}
            </Text>
          )}
          <Button title="Retry saving photo" busy={saving} onPress={() => void savePhoto(dialog)} />
          <Button title="Discard photo" tone="ghost" disabled={saving} onPress={closeDialog} />
        </Sheet>
      )}
      {(dialog?.type === 'deleteProject' || dialog?.type === 'deleteEntry') && (
        <Sheet
          title={dialog.type === 'deleteProject' ? 'Delete this story?' : 'Delete this moment?'}
          onClose={closeDialog}
        >
          <Text style={ui.body}>
            {dialog.type === 'deleteProject'
              ? `“${dialog.project.title}” and its ${dialog.project.entries.length} photos will be removed from Before.`
              : 'This photo and its note will be removed from Before.'}{' '}
            Your original library photos won’t be affected. This can’t be undone.
          </Text>
          {!!error && <Text style={s.errorText}>{error}</Text>}
          <Button
            title={
              dialog.type === 'deleteProject'
                ? 'Delete story permanently'
                : 'Delete moment permanently'
            }
            tone="danger"
            busy={saving}
            onPress={() => void confirmDelete()}
          />
          <Button title="Keep it" tone="secondary" disabled={saving} onPress={closeDialog} />
        </Sheet>
      )}
    </SafeAreaView>
  );
}

function ProjectForm({
  project,
  busy,
  error,
  onSave,
}: {
  project: Project;
  busy: boolean;
  error: string;
  onSave: (title: string, category: Category, existing: Project) => Promise<void>;
}) {
  const [title, setTitle] = useState(project.title);
  const [category, setCategory] = useState<Category>(project.category);
  return (
    <>
      <Field
        label="Story name"
        placeholder="My little balcony garden"
        value={title}
        onChangeText={setTitle}
        maxLength={60}
        autoFocus
      />
      <View style={{ gap: 12 }}>
        <Text style={s.fieldLabel}>Category</Text>
        <View style={s.categories}>
          {CATEGORIES.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={value}
              accessibilityState={{ selected: category === value }}
              onPress={() => setCategory(value)}
              style={[s.category, category === value && s.categorySelected]}
            >
              <Text style={[s.categoryText, category === value && { color: c.white }]}>
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={s.errorText}>
          {error}
        </Text>
      )}
      <Button
        title="Save changes"
        icon="check"
        busy={busy}
        disabled={!title.trim()}
        onPress={() => void onSave(title.trim(), category, project)}
      />
    </>
  );
}

function MomentForm({
  entry,
  busy,
  error,
  onSave,
}: {
  entry: Entry;
  busy: boolean;
  error: string;
  onSave: (date: string, note: string) => Promise<void>;
}) {
  const [date, setDate] = useState(entry.date);
  const [note, setNote] = useState(entry.note);
  const valid = isValidDate(date) && date <= today();
  return (
    <>
      <Image
        source={photoSource(entry.imageUri)}
        style={{ width: '100%', height: 210, borderRadius: 16 }}
      />
      <Field
        label="Date (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
        placeholder="2026-10-14"
        maxLength={10}
        autoCapitalize="none"
      />
      {!valid && (
        <Text accessibilityRole="alert" style={s.errorText}>
          Enter a real date, today or earlier, as YYYY-MM-DD.
        </Text>
      )}
      <Field
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={500}
        placeholder="Anything to remember?"
      />
      {!!error && (
        <Text accessibilityRole="alert" style={s.errorText}>
          {error}
        </Text>
      )}
      <Button
        title="Save changes"
        icon="check"
        busy={busy}
        disabled={!valid}
        onPress={() => void onSave(date, note.trim())}
      />
    </>
  );
}

function About() {
  return (
    <View style={{ gap: 26, maxWidth: 640 }}>
      <Label>A GENTLER WAY TO SEE PROGRESS</Label>
      <Text accessibilityRole="header" style={ui.title}>
        The little things{'\n'}add up.
      </Text>
      <Text style={ui.body}>
        Before is a quiet place for the things you’re growing, making, and becoming. Keep a photo.
        Leave a note. Come back and see how far you’ve come.
      </Text>
      <View style={s.aboutCard}>
        <Icon name="lock" color={c.green} size={28} />
        <Text style={s.aboutTitle}>Your story stays yours.</Text>
        <Text style={ui.body}>
          Your photos and notes are stored on this device. Before has no account, analytics,
          advertising, or cloud sync. Nothing is uploaded by the app.
        </Text>
        <Text style={ui.body}>
          Uninstalling the app or clearing browser data can remove your journal. Export comparisons
          you want to keep. Images and videos are keepsakes, not a full journal backup.
        </Text>
        <Text style={ui.body}>
          Camera access is requested only when you take a photo. Choosing a photo opens your
          system’s photo picker. Saving a video asks for permission to add it to Photos. Sharing
          sends only the comparison you choose to the app you select.
        </Text>
      </View>
      <View style={s.aboutCard}>
        <Text style={s.aboutTitle}>Made for the in-between.</Text>
        <Text style={ui.body}>
          Before · 0.1.0{'\n'}An independent photo journal, built with React Native and Expo.
        </Text>
        <Button
          title="View the project on GitHub"
          icon="arrow"
          tone="secondary"
          onPress={() => void Linking.openURL('https://github.com/a1231231123bc/before')}
        />
        <Text style={ui.body}>
          Video export uses h264-mp4-encoder (MIT), minih264 (CC0), and libmp4v2 (MPL 1.1).
        </Text>
        <Button
          title="Video encoder licenses and source"
          tone="ghost"
          onPress={() =>
            void Linking.openURL(
              'https://github.com/a1231231123bc/before/blob/main/docs/VIDEO-EXPORT.md#licenses-and-source',
            )
          }
        />
      </View>
      <Text style={ui.body}>
        Sample photography: Josh Duke and Febri Adiawarja, via Unsplash. Sample photos show
        different plants and are included for demonstration.
      </Text>
      <View style={ui.row}>
        <Button
          title="Josh Duke"
          small
          tone="ghost"
          onPress={() => void Linking.openURL('https://unsplash.com/photos/DHhuqwyjSuo')}
        />
        <Button
          title="Febri Adiawarja"
          small
          tone="ghost"
          onPress={() => void Linking.openURL('https://unsplash.com/photos/TSKYvXf1d4M')}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.background,
  },
  header: {
    borderBottomWidth: 1,
    borderColor: c.line,
    paddingHorizontal: 22,
    paddingVertical: 15,
    backgroundColor: c.background,
  },
  headerInner: {
    maxWidth: 1040,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 34,
    height: 34,
    backgroundColor: c.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  wordmark: {
    fontFamily: f.serif,
    fontSize: 34,
    lineHeight: 39,
    color: c.ink,
    letterSpacing: -1.2,
  },
  content: { padding: 22, paddingBottom: 32 },
  photoBar: {
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: c.line,
    backgroundColor: c.background,
  },
  container: { maxWidth: 760, width: '100%', alignSelf: 'center' },
  errorBox: {
    backgroundColor: '#F8E5DD',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  errorText: { fontFamily: f.medium, color: c.danger, fontSize: 14, lineHeight: 21 },
  fieldLabel: { fontFamily: f.bold, fontSize: 13, color: c.ink },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.line,
  },
  categorySelected: { backgroundColor: c.green, borderColor: c.green },
  categoryText: { fontFamily: f.medium, fontSize: 13, color: c.ink },
  aboutCard: {
    padding: 24,
    gap: 17,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 22,
  },
  aboutTitle: { fontFamily: f.serif, fontSize: 27, color: c.ink },
});
