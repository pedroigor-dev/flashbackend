import { HttpException, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { PassThrough } from 'node:stream';

export const CHAT_STREAM_TYPE = 'application/x-ndjson';

export function wantsChatStream(accept?: string) {
  return accept?.split(',').some((entry) => entry.split(';')[0].trim() === CHAT_STREAM_TYPE);
}

export function chatStream(
  response: Response,
  task: (signal: AbortSignal, onText: (text: string) => void) => Promise<unknown>,
) {
  const stream = new PassThrough();
  const controller = new AbortController();
  response.once('close', () => {
    controller.abort();
    stream.destroy();
  });
  response.setHeader('Cache-Control', 'no-store, no-transform');
  response.setHeader('X-Accel-Buffering', 'no');
  const write = (event: object) => {
    if (!stream.destroyed) stream.write(`${JSON.stringify(event)}\n`);
  };
  let previous = '';
  const publishText = (text: string) => {
    if (text.startsWith(previous)) {
      write({ type: 'delta', text: text.slice(previous.length) });
    } else {
      write({ type: 'text', text });
    }
    previous = text;
  };

  void task(controller.signal, publishText)
    .then((answer) => write({ type: 'done', answer }))
    .catch((error: unknown) => {
      write({
        type: 'error',
        message:
          error instanceof HttpException
            ? error.message
            : 'Não foi possível concluir a resposta. Tente novamente.',
      });
    })
    .finally(() => stream.end());

  return new StreamableFile(stream, { type: `${CHAT_STREAM_TYPE}; charset=utf-8` });
}

export async function readProviderStream(
  body: ReadableStream<Uint8Array>,
  onContent: (content: string) => void,
) {
  const decoder = new TextDecoder();
  let pending = '';
  let completed = false;
  const accept = (line: string) => {
    if (!line.startsWith('data:')) return;
    const value = line.slice(5).trim();
    if (value === '[DONE]') {
      completed = true;
    } else if (value) {
      const { error, choices } = JSON.parse(value);
      if (error) throw new Error('Falha no fluxo do provedor.');
      const choice = choices?.[0];
      if (typeof choice?.delta?.content === 'string') onContent(choice.delta.content);
      if (choice?.finish_reason) completed = true;
    }
  };

  const parseChunk = (text: string) => {
    pending += text;
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    for (const line of lines) accept(line);
  };
  for await (const chunk of body) {
    parseChunk(decoder.decode(chunk, { stream: true }));
  }
  parseChunk(decoder.decode());
  accept(pending);
  if (!completed) throw new Error('Fluxo do provedor interrompido.');
}
