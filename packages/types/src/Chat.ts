import { z } from 'zod';

export const ChatSendRequestSchema = z.object({ text: z.string().trim().min(1).max(2000) });

export type ChatSendRequest = z.infer<typeof ChatSendRequestSchema>;

export const ChatMessageSchema = z.object({
  id: z.uuid(),
  created_at: z.iso.datetime(),
  text: ChatSendRequestSchema.shape.text,
  user: z.object({ id: z.uuid(), name: z.string(), color: z.string() }),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
