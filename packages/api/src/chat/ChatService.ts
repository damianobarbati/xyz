import { randomUUID } from 'node:crypto';
import { type ChatMessage, ChatMessageSchema, type ChatSendRequest } from 'types/Chat.ts';
import type { User } from 'types/User.ts';

type SendInput = ChatSendRequest & { user: User };

const subscribers = new Set<ReadableStreamDefaultController<Uint8Array>>();

const colors = new Map<string, string>();

const encoder = new TextEncoder();

export default class ChatService {
  static async send({ text, user }: SendInput): Promise<ChatMessage> {
    let color = colors.get(user.id);

    if (!color) {
      color = `hsl(${(colors.size * 137.508) % 360} 65% 25%)`;
      colors.set(user.id, color);
    }

    const message = ChatMessageSchema.parse({
      id: randomUUID(),
      created_at: new Date().toISOString(),
      text,
      user: { id: user.id, name: user.name, color },
    });

    const event = encoder.encode(`data: ${JSON.stringify(message)}\n\n`);

    for (const subscriber of subscribers) subscriber.enqueue(event);

    return message;
  }

  static async listen() {
    let subscriber: ReadableStreamDefaultController<Uint8Array>;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        subscriber = controller;
        subscribers.add(controller);
        controller.enqueue(encoder.encode('event: ready\ndata: {}\n\n'));
      },
      cancel() {
        subscribers.delete(subscriber);
      },
    });

    return stream;
  }
}
