import type { SWRSubscription } from 'swr/subscription';
import { type ChatMessage, ChatMessageSchema } from 'types/Chat.ts';
import { ENV } from './env.ts';

export type ChatState = { messages: ChatMessage[]; connected: boolean };

export type ChatKey = [string, string];

export const subscribeChat: SWRSubscription<ChatKey, ChatState, Error> = ([url], { next }) => {
  const source = new EventSource(`${ENV.API_URL.replace(/\/$/, '')}${url}`);
  let state: ChatState = { messages: [], connected: false };
  next(null, state);

  source.onopen = () => {
    state = { ...state, connected: true };
    next(null, state);
  };

  source.onmessage = (event) => {
    const message = ChatMessageSchema.parse(JSON.parse(event.data));
    state = { ...state, messages: [...state.messages, message] };
    next(null, state);
  };

  source.onerror = () => {
    state = { ...state, connected: false };
    next(null, state);
    next(new Error(source.readyState === EventSource.CLOSED ? 'Chat disconnected.' : 'Reconnecting...'));
  };

  return () => {
    source.close();
  };
};
