import React, { useEffect, useRef } from 'react';
import type { RendererProps } from './VideoRenderer';

export function VideoRenderer({ html, onMessage }: RendererProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && typeof event.data === 'string')
        onMessage(event.data);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onMessage]);
  return (
    <iframe
      ref={frame}
      title="Progress video preview"
      sandbox="allow-scripts"
      allow="autoplay"
      srcDoc={html}
      style={{ border: 0, width: '100%', height: '100%', background: '#F7F5EF' }}
    />
  );
}
