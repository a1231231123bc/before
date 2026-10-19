import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Text, View, useWindowDimensions } from 'react-native';
import { Button, Sheet, s as ui } from '../components/UI';
import { colors as c } from '../theme';
import { prepareVideoDocument, receiveVideo } from './platform';
import { parseVideoMessage, type ExportedVideo, type VideoInput } from './spec';
import { VideoRenderer } from './VideoRenderer';

export function VideoExportSheet({ input, onClose }: { input: VideoInput; onClose: () => void }) {
  const { height } = useWindowDimensions();
  const previewWidth = Math.min(220, Math.max(140, ((height * 0.9 - 360) * 9) / 16));
  const [html, setHtml] = useState('');
  const [progress, setProgress] = useState(0);
  const [video, setVideo] = useState<ExportedVideo | null>(null);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const resource = useRef<ExportedVideo | null>(null);
  const mounted = useRef(false);
  const operation = useRef<Promise<void> | null>(null);
  const status = useRef<'rendering' | 'ready' | 'failed'>('rendering');
  const lastActivity = useRef(0);
  const fail = useCallback((message: string) => {
    if (!mounted.current || status.current !== 'rendering') return;
    status.current = 'failed';
    setError(message);
    setFailed(true);
  }, []);

  useEffect(() => {
    mounted.current = true;
    lastActivity.current = Date.now();
    let active = true;
    prepareVideoDocument(input)
      .then((document) => {
        if (active) {
          lastActivity.current = Date.now();
          setHtml(document);
        }
      })
      .catch((reason) => {
        if (active) fail(reason instanceof Error ? reason.message : 'Could not load the photos.');
      });
    const watchdog = setInterval(() => {
      if (status.current === 'rendering' && Date.now() - lastActivity.current > 120_000)
        fail('Video creation stopped responding. Keep Frameago open and try again.');
    }, 5000);
    return () => {
      active = false;
      mounted.current = false;
      clearInterval(watchdog);
      const previous = resource.current;
      resource.current = null;
      // Do not delete a file while the OS is still saving it or presenting its share sheet.
      if (previous)
        void (operation.current ?? Promise.resolve()).finally(() => {
          try {
            previous.dispose();
          } catch {
            /* Cached files may already have been purged by the OS. */
          }
        });
    };
  }, [input, attempt, fail]);

  const onMessage = useCallback(
    (raw: string) => {
      if (!mounted.current || status.current !== 'rendering') return;
      const message = parseVideoMessage(raw);
      if (!message) return;
      lastActivity.current = Date.now();
      if (message.type === 'error') fail(message.message);
      else if (message.type === 'progress') setProgress(message.progress);
      else {
        try {
          const result = receiveVideo(message.base64, input.title);
          resource.current = result;
          status.current = 'ready';
          setVideo(result);
          setProgress(1);
        } catch {
          fail(
            'There is not enough free space to prepare the video. Free some space and try again.',
          );
        }
      }
    },
    [input.title, fail],
  );

  const act = (kind: 'save' | 'share') => {
    if (!video || operation.current) return;
    setBusy(kind);
    setError('');
    // Call synchronously from the tap so browser Web Share retains user activation.
    const pending = video[kind]()
      .then(() => {
        if (mounted.current && kind === 'save') setSaved(true);
      })
      .catch((reason) => {
        if (mounted.current && reason?.name !== 'AbortError')
          setError(reason instanceof Error ? reason.message : 'Please try again.');
      })
      .finally(() => {
        operation.current = null;
        if (mounted.current) setBusy(null);
      });
    operation.current = pending;
  };

  const retry = () => {
    setHtml('');
    setError('');
    setFailed(false);
    setProgress(0);
    status.current = 'rendering';
    lastActivity.current = Date.now();
    setAttempt((value) => value + 1);
  };
  return (
    <Sheet title={video ? 'Your video is ready' : 'A little progress, in motion'} onClose={onClose}>
      <Text style={ui.body}>6-second loop · 1080 × 1920 · MP4</Text>
      {!failed && (
        <View
          style={{
            width: previewWidth,
            height: (previewWidth * 16) / 9,
            alignSelf: 'center',
            overflow: 'hidden',
            borderRadius: 16,
            backgroundColor: c.background,
          }}
        >
          {!!html && (
            <VideoRenderer key={attempt} html={html} onMessage={onMessage} onError={fail} />
          )}
        </View>
      )}
      {!video && !failed && (
        <View style={{ gap: 10 }}>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Creating video"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
            style={{ height: 5, borderRadius: 5, backgroundColor: c.sage, overflow: 'hidden' }}
          >
            <View
              style={{
                width: `${Math.round(progress * 100)}%`,
                height: 5,
                backgroundColor: c.green,
              }}
            />
          </View>
          <Text style={[ui.body, { textAlign: 'center', fontSize: 13 }]}>
            {html
              ? `Creating your video… ${Math.round(progress * 100)}%`
              : 'Preparing your photos…'}
            {'\n'}Keep Frameago open. Closing cancels the export.
          </Text>
        </View>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={[ui.body, { color: c.danger }]}>
          {error}
        </Text>
      )}
      {failed && <Button title="Try again" onPress={retry} />}
      {video && (
        <View style={{ gap: 12 }}>
          <Button
            title={
              saved
                ? Platform.OS === 'web'
                  ? 'Download again'
                  : 'Saved to Photos'
                : Platform.OS === 'web'
                  ? 'Download MP4'
                  : 'Save to Photos'
            }
            icon={saved ? 'check' : 'image'}
            busy={busy === 'save'}
            disabled={busy !== null || (saved && Platform.OS !== 'web')}
            onPress={() => act('save')}
          />
          {video.canShare && (
            <Button
              title="Share video"
              icon="share"
              tone="secondary"
              busy={busy === 'share'}
              disabled={busy !== null}
              onPress={() => act('share')}
            />
          )}
          <Text style={[ui.body, { fontSize: 12, textAlign: 'center' }]}>
            {Platform.OS === 'web'
              ? 'Share video opens your phone’s sharing options. '
              : 'Choose the saved video in Instagram. '}
            Add music and publish from Instagram.
          </Text>
        </View>
      )}
    </Sheet>
  );
}
