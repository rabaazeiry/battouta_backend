import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/ws/socket';
import { WS_EVENTS } from '@/lib/ws/events';

type Handler = (payload: any) => void;

export function useSocket(projectId?: string) {
  const handlers = useRef<Map<string, Handler>>(new Map());

  useEffect(() => {
    const socket = getSocket();
    if (projectId) socket.emit(WS_EVENTS.JOIN, { projectId });

    return () => {
      if (projectId) socket.emit(WS_EVENTS.LEAVE, { projectId });
      handlers.current.forEach((h, evt) => socket.off(evt, h));
      handlers.current.clear();
    };
  }, [projectId]);

  function on(event: string, handler: Handler) {
    const socket = getSocket();
    handlers.current.set(event, handler);
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
      handlers.current.delete(event);
    };
  }

  return { on, socket: getSocket() };
}
