import type { ChatSendRequest } from 'types/Chat.ts';
import asyncStorage from '../asyncStorage.ts';
import { createError } from '../errors.ts';
import ChatService from './ChatService.ts';

export default class ChatController {
  static async send(params: ChatSendRequest) {
    const user = asyncStorage.getStore()?.user;

    if (!user) throw createError('INVALID_TOKEN');

    const result = await ChatService.send({ ...params, user });

    return result;
  }

  static async listen() {
    const stream = await ChatService.listen();

    return stream;
  }
}
