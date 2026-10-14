import React, { useMemo } from 'react';
import { WebView } from 'react-native-webview';

export type RendererProps = {
  html: string;
  onMessage: (raw: string) => void;
  onError: (message: string) => void;
};

export function VideoRenderer({ html, onMessage, onError }: RendererProps) {
  const source = useMemo(() => ({ html }), [html]);
  return (
    <WebView
      source={source}
      originWhitelist={['*']}
      onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
      onMessage={(event) => onMessage(event.nativeEvent.data)}
      onError={() => onError('The video renderer could not start. Please try again.')}
      onContentProcessDidTerminate={() =>
        onError('The video renderer stopped. Please close other apps and try again.')
      }
      onRenderProcessGone={() => onError('The video renderer stopped. Please try again.')}
      javaScriptEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      scrollEnabled={false}
      style={{ flex: 1, backgroundColor: '#F7F5EF' }}
    />
  );
}
