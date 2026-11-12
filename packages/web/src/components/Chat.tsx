import React from 'react';
import { useForm } from 'react-hook-form';
import useSWRMutation from 'swr/mutation';
import useSWRSubscription from 'swr/subscription';
import { type ChatMessage, type ChatSendRequest, ChatSendRequestSchema } from 'types/Chat.ts';
import { sendMessage } from '../api.ts';
import { type ChatKey, type ChatState, subscribeChat } from '../chat.ts';

const messageTime = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

type ChatProps = { className?: string; token: string; userId: string };

export const Chat = ({ className, token, userId }: ChatProps) => {
  const { data, error } = useSWRSubscription<ChatState, Error, ChatKey>(['/chat/listen', token], subscribeChat);
  const mutation = useSWRMutation<ChatMessage, Error, string, ChatSendRequest>('/chat/send', sendMessage);

  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChatSendRequest>({ defaultValues: { text: '' } });

  const end = React.useRef<HTMLDivElement>(null);
  const messages = data ? data.messages : [];
  const lastMessage = messages.at(-1);
  const connected = !!data && data.connected;

  React.useEffect(() => {
    setFocus('text');
  }, [setFocus]);

  React.useEffect(() => {
    if (lastMessage && end.current) end.current.scrollIntoView({ block: 'nearest' });
  }, [lastMessage]);

  const submit = async (input: ChatSendRequest) => {
    const parsed = ChatSendRequestSchema.safeParse(input);

    if (!parsed.success) {
      setError('text', { message: 'Enter a message (up to 2000 characters).' });

      return;
    }

    try {
      await mutation.trigger(parsed.data);
      resetField('text');
      setFocus('text');
    } catch {
      setError('root', { message: 'Unable to send. Try again.' });
    }
  };

  return (
    <section className={className} aria-label="Chat">
      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#efeae2] p-4 sm:p-6"
        role="log"
        aria-label="Messages"
        aria-live="polite"
      >
        {messages.map((message) => (
          <article
            key={message.id}
            data-own={message.user.id === userId}
            className="w-fit max-w-[85%] rounded-xl rounded-tl-none bg-white px-3 py-2 shadow-sm data-[own=true]:ml-auto data-[own=true]:rounded-tl-xl data-[own=true]:rounded-tr-none data-[own=true]:bg-[#d9fdd3] sm:max-w-[75%]"
          >
            <strong className="block text-xs font-semibold" style={{ color: message.user.color }}>
              {message.user.name}
            </strong>
            <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap text-slate-900">
              {message.text}
            </p>
            <time className="mt-1 block text-right text-[11px] text-slate-600" dateTime={message.created_at}>
              {messageTime.format(new Date(message.created_at))}
            </time>
          </article>
        ))}
        <div ref={end} />
      </div>
      {!connected && !error && (
        <p role="status" className="flex items-center gap-2 bg-white px-4 py-2 text-sm text-slate-600">
          <span className="auth-spinner size-4" aria-hidden="true" />
          Connecting...
        </p>
      )}
      {error && (
        <p role="alert" className="bg-white px-4 py-2 text-sm text-red-700">
          {error.message}
        </p>
      )}
      <form className="flex items-center gap-3 bg-[#f0f2f5] p-3 sm:px-4" onSubmit={handleSubmit(submit)}>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Message</span>
          <input
            className="block w-full rounded-full border border-transparent bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
            type="text"
            placeholder="Message"
            required
            maxLength={2000}
            autoComplete="off"
            readOnly={isSubmitting}
            {...register('text')}
          />
        </label>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#008069] px-5 py-3 text-sm font-semibold text-white hover:bg-[#006b58] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
          type="submit"
          disabled={!connected || isSubmitting}
        >
          {isSubmitting && <span className="auth-spinner size-4" aria-hidden="true" />}
          Send
        </button>
      </form>
      {errors.text && (
        <p role="alert" className="bg-white px-4 py-2 text-sm text-red-700">
          {errors.text.message}
        </p>
      )}
      {errors.root && (
        <p role="alert" className="bg-white px-4 py-2 text-sm text-red-700">
          {errors.root.message}
        </p>
      )}
    </section>
  );
};
