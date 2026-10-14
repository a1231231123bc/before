import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
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
import { CompareScreen, Story } from './src/screens/Story';

type Screen =
  | { name: 'home' }
  | { name: 'about' }
  | { name: 'story'; id: string }
  | { name: 'compare'; id: string };
type Dialog =
  | { type: 'project'; project?: Project }
  | { type: 'picker'; projectId: string }
  | { type: 'moment'; projectId: string; imageUri: string }
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
  const scroll = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const current =
    'id' in screen
      ? screen.id === 'sample'
        ? SAMPLE_PROJECT
        : journal.projects.find((p) => p.id === screen.id)
      : undefined;
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [screen]);
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
    if (dialog?.type === 'moment') void removePhoto(dialog.imageUri).catch(() => {});
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
  const saveProject = async (title: string, category: Category, existing?: Project) => {
    const project: Project = existing
      ? { ...existing, title, category }
      : { id: makeId(), title, category, createdAt: new Date().toISOString(), entries: [] };
    await commit(
      {
        ...journal,
        projects: existing
          ? journal.projects.map((p) => (p.id === project.id ? project : p))
          : [project, ...journal.projects],
      },
      () => {
        setDialog(null);
        navigate({ name: 'story', id: project.id });
      },
    );
  };
  const pick = async (projectId: string, camera: boolean) => {
    if (picking) return;
    setPicking(true);
    setDialog(null);
    setError('');
    try {
      if (Platform.OS !== 'web') await new Promise((resolve) => setTimeout(resolve, 350));
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted)
          throw new Error(
            'Camera access is off. You can enable it in device settings or choose a photo from your library.',
          );
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
      showDialog({ type: 'moment', projectId, imageUri });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'This photo could not be opened. Please try another photo.',
      );
    } finally {
      setPicking(false);
    }
  };
  const saveMoment = async (date: string, note: string) => {
    if (dialog?.type !== 'moment') return;
    const entry: Entry = {
      id: makeId(),
      imageUri: dialog.imageUri,
      date,
      note,
      createdAt: new Date().toISOString(),
    };
    await commit(
      {
        ...journal,
        projects: journal.projects.map((p) =>
          p.id === dialog.projectId ? { ...p, entries: [...p.entries, entry] } : p,
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
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <View style={[s.header, wide && { paddingHorizontal: 40 }]}>
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
            {wide && <Text style={s.headerNote}>NOTICE THE LITTLE THINGS</Text>}
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
              onCreate={() => showDialog({ type: 'project' })}
              onOpen={(id) => navigate({ name: 'story', id })}
              onDemo={() => navigate({ name: 'story', id: 'sample' })}
            />
          )}
          {screen.name === 'story' && current && (
            <Story
              project={current}
              demo={current.id === 'sample'}
              onAdd={() => !picking && showDialog({ type: 'picker', projectId: current.id })}
              onEdit={() => showDialog({ type: 'project', project: current })}
              onDelete={() => showDialog({ type: 'deleteProject', project: current })}
              onDeleteEntry={(entry) =>
                showDialog({ type: 'deleteEntry', project: current, entry })
              }
              onCompare={() => navigate({ name: 'compare', id: current.id })}
              onCreate={() => showDialog({ type: 'project' })}
            />
          )}
          {screen.name === 'compare' && current && current.entries.length >= 2 && (
            <CompareScreen key={current.id} project={current} onError={setError} />
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
      <SafeAreaView edges={['bottom']} style={s.nav}>
        <View style={s.navInner}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Your stories"
            onPress={() => navigate({ name: 'home' })}
            style={s.navItem}
          >
            <Icon name="grid" color={screen.name === 'about' ? c.muted : c.green} />
            <Text style={[s.navText, screen.name !== 'about' && { color: c.green }]}>Stories</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a story"
            onPress={() => showDialog({ type: 'project' })}
            style={s.navPlus}
          >
            <Icon name="plus" color={c.white} size={25} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="About and privacy"
            onPress={() => navigate({ name: 'about' })}
            style={s.navItem}
          >
            <Icon name="leaf" color={screen.name === 'about' ? c.green : c.muted} />
            <Text style={[s.navText, screen.name === 'about' && { color: c.green }]}>About</Text>
          </Pressable>
        </View>
      </SafeAreaView>
      {dialog?.type === 'project' && (
        <Sheet title={dialog.project ? 'Make it yours' : 'A new beginning'} onClose={closeDialog}>
          <ProjectForm project={dialog.project} busy={saving} error={error} onSave={saveProject} />
        </Sheet>
      )}
      {dialog?.type === 'picker' && (
        <Sheet title="Keep this moment" onClose={closeDialog}>
          <Text style={ui.body}>
            Choose a photo of your progress. The everyday details are worth remembering, too.
          </Text>
          <Button
            title="Choose from library"
            icon="image"
            onPress={() => void pick(dialog.projectId, false)}
          />
          {Platform.OS !== 'web' && (
            <Button
              title="Take a photo"
              icon="camera"
              tone="secondary"
              onPress={() => void pick(dialog.projectId, true)}
            />
          )}
        </Sheet>
      )}
      {dialog?.type === 'moment' && (
        <Sheet title="A moment worth keeping" onClose={closeDialog}>
          <MomentForm uri={dialog.imageUri} error={error} busy={saving} onSave={saveMoment} />
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
  project?: Project;
  busy: boolean;
  error: string;
  onSave: (title: string, category: Category, existing?: Project) => Promise<void>;
}) {
  const [title, setTitle] = useState(project?.title ?? '');
  const [category, setCategory] = useState<Category>(project?.category ?? 'Everyday');
  return (
    <>
      <Text style={ui.body}>What would you like to watch change?</Text>
      <Field
        label="Story name"
        placeholder="My little balcony garden"
        value={title}
        onChangeText={setTitle}
        maxLength={60}
        autoFocus
      />
      <View style={{ gap: 12 }}>
        <Text style={s.fieldLabel}>Make a little space for</Text>
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
        title={project ? 'Save changes' : 'Create story'}
        icon={project ? 'check' : 'arrow'}
        busy={busy}
        disabled={!title.trim()}
        onPress={() => void onSave(title.trim(), category, project)}
      />
      <Text style={s.smallPrint}>Just for you. No account needed.</Text>
    </>
  );
}

function MomentForm({
  uri,
  busy,
  error,
  onSave,
}: {
  uri: string;
  busy: boolean;
  error: string;
  onSave: (date: string, note: string) => Promise<void>;
}) {
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const valid = isValidDate(date) && date <= today();
  return (
    <>
      <Image source={photoSource(uri)} style={{ width: '100%', height: 210, borderRadius: 16 }} />
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
        label="A little note (optional)"
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={500}
        placeholder="What changed? What would you like to remember?"
      />
      {!!error && (
        <Text accessibilityRole="alert" style={s.errorText}>
          {error}
        </Text>
      )}
      <Button
        title="Save moment"
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
  headerNote: {
    fontFamily: f.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: c.muted,
    marginRight: 16,
  },
  content: { padding: 22, paddingBottom: 38 },
  container: { maxWidth: 1040, width: '100%', alignSelf: 'center' },
  nav: { borderTopWidth: 1, borderColor: c.line, backgroundColor: c.paper },
  navInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    paddingVertical: 11,
  },
  navItem: { gap: 5, minWidth: 80, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  navText: { fontFamily: f.medium, fontSize: 11, color: c.muted },
  navPlus: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  smallPrint: { fontFamily: f.regular, fontSize: 12, color: c.muted, textAlign: 'center' },
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
