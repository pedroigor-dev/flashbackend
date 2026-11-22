import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatRequestDto } from './chat.dto';
import { resolveAnswer } from './answer';
import { systemPrompt } from './chat-context';
import { readProviderStream } from './chat-stream';

@Injectable()
export class ChatService {
  constructor(private readonly config: ConfigService) {}

  private settings() {
    const provider = this.config.get<string>('AI_PROVIDER', 'huggingface');
    if (provider === 'groq') {
      return {
        provider,
        token: this.config.get<string>('GROQ_API_KEY')?.trim(),
        model: this.config.get<string>('GROQ_MODEL', 'openai/gpt-oss-120b'),
        url: 'https://api.groq.com/openai/v1/chat/completions',
      };
    }
    if (provider !== 'huggingface') {
      throw new ServiceUnavailableException('Provedor de IA inválido na configuração.');
    }
    return {
      provider,
      token: this.config.get<string>('HF_TOKEN')?.trim(),
      model: this.config.get<string>('HF_MODEL', 'openai/gpt-oss-120b:cheapest'),
      url: 'https://router.huggingface.co/v1/chat/completions',
    };
  }

  status() {
    const { provider, token, model } = this.settings();
    return { provider, configured: Boolean(token), model };
  }

  async reply(
    dto: ChatRequestDto,
    clientSignal?: AbortSignal,
    context = systemPrompt,
    onText?: (text: string) => void,
  ) {
    if (dto.messages.at(-1)?.role !== 'user' || dto.messages.some((m) => !m.content.trim())) {
      throw new BadRequestException('Envie uma pergunta válida para o Flashinho.');
    }
    const { token, model, provider, url } = this.settings();
    const question = dto.messages.at(-1)?.content ?? '';
    if (context === systemPrompt && /\bsimular\s+conclus[aã]o\b/i.test(question)) {
      const describedAsReviewing = /\bem an[aá]lise\b/i.test(question);
      const explanation = describedAsReviewing
        ? 'Se o protocolo está **Em análise**, o n8n já registrou o encaminhamento da triagem. Você pode encerrar o teste assim que o botão aparecer.'
        : 'Confira a linha do tempo do seu protocolo na **Central de atendimento**. Quando a triagem terminar, o botão estará disponível na demonstração.';
      return {
        text: `${explanation}\n\n**Simular conclusão** encerra apenas o protocolo de teste. O dinheiro não volta para o saldo, e nenhum estorno é lançado no extrato. Para consultar a etapa atual, abra o protocolo e use **Perguntar ao Flashinho** naquela tela.`,
        sources: [],
        model,
        provider,
      };
    }
    if (!token) {
      throw new ServiceUnavailableException('A conexão com a IA ainda não foi configurada.');
    }
    const timeout = AbortSignal.timeout(45000);
    const signal = clientSignal ? AbortSignal.any([clientSignal, timeout]) : timeout;
    try {
      const response = await fetch(url, {
        method: 'POST',
        signal,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: context }, ...dto.messages],
          max_tokens: 2200,
          temperature: 0.2,
          stream: Boolean(onText),
          ...(provider === 'groq' ? { reasoning_effort: 'medium' } : {}),
        }),
      });
      if (!response.ok) {
        if (response.status === 402) {
          throw new ServiceUnavailableException(
            'Os créditos ou o plano do provedor de IA estão indisponíveis. Verifique sua conta.',
          );
        }
        if ([401, 403].includes(response.status)) {
          throw new ServiceUnavailableException(
            'A credencial da IA não foi aceita. Verifique o token e suas permissões.',
          );
        }
        if (response.status === 429) {
          throw new HttpException(
            'A IA está recebendo muitas solicitações. Aguarde um pouco.',
            429,
          );
        }
        throw new BadGatewayException(
          'O provedor de IA está indisponível. Tente novamente em instantes.',
        );
      }
      let text: unknown;
      if (onText && response.body) {
        let raw = '';
        let previous = '';
        await readProviderStream(response.body, (delta) => {
          raw += delta;
          const open = raw.lastIndexOf('[');
          const tail = raw.slice(open);
          const unfinishedMarker =
            open > raw.lastIndexOf(']') && !tail.includes('\n') && tail.length < 96;
          const preview = resolveAnswer(unfinishedMarker ? raw.slice(0, open) : raw).text;
          if (preview !== previous) {
            previous = preview;
            onText(preview);
          }
        });
        text = raw;
      } else {
        const data = (await response.json()) as { choices?: { message?: { content?: unknown } }[] };
        text = data.choices?.[0]?.message?.content;
      }
      if (typeof text !== 'string' || !text.trim()) {
        throw new BadGatewayException('A IA não retornou uma resposta. Tente novamente.');
      }
      const answer = resolveAnswer(text);
      if (!answer.text) {
        throw new BadGatewayException('A IA não retornou uma resposta. Tente novamente.');
      }
      return { ...answer, model, provider };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (signal.aborted) {
        throw new GatewayTimeoutException(
          'A resposta foi interrompida ou demorou demais. Tente novamente.',
        );
      }
      throw new BadGatewayException('Não foi possível conectar ao provedor de IA.');
    }
  }
}
