import { BadGatewayException, BadRequestException, GatewayTimeoutException, HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatRequestDto } from './chat.dto';
import { sources, systemPrompt } from './knowledge';

@Injectable()
export class ChatService {
  constructor(private readonly config: ConfigService) {}
  private settings() {
    const provider = this.config.get<string>('AI_PROVIDER','huggingface');
    if (provider === 'groq') return {provider, token:this.config.get<string>('GROQ_API_KEY')?.trim(), model:this.config.get<string>('GROQ_MODEL','openai/gpt-oss-120b'), url:'https://api.groq.com/openai/v1/chat/completions'};
    if (provider !== 'huggingface') throw new ServiceUnavailableException('Provedor de IA inválido na configuração.');
    return {provider, token:this.config.get<string>('HF_TOKEN')?.trim(), model:this.config.get<string>('HF_MODEL','openai/gpt-oss-120b:cheapest'), url:'https://router.huggingface.co/v1/chat/completions'};
  }
  status() { const {provider,token,model}=this.settings(); return {provider,configured:Boolean(token),model}; }
  async reply(dto: ChatRequestDto, clientSignal?: AbortSignal) {
    if (dto.messages.at(-1)?.role !== 'user' || dto.messages.some(m => !m.content.trim())) throw new BadRequestException('Envie uma pergunta válida para o Flashinho.');
    const {token,model,provider,url} = this.settings();
    if (!token) throw new ServiceUnavailableException('A conexão com a IA ainda não foi configurada.');
    const timeout = AbortSignal.timeout(45000);
    const signal = clientSignal ? AbortSignal.any([clientSignal, timeout]) : timeout;
    try {
      const response = await fetch(url, {
        method:'POST', signal,
        headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
        body:JSON.stringify({ model, messages:[{ role:'system', content:systemPrompt }, ...dto.messages], max_tokens:1600, temperature:0.45, stream:false, ...(provider === 'groq' ? {reasoning_effort:'low'} : {}) }),
      });
      if (!response.ok) {
        // Provider bodies can contain request details: never log or return them.
        if (response.status === 402) throw new ServiceUnavailableException('Os créditos ou o plano do provedor de IA estão indisponíveis. Verifique sua conta.');
        if ([401,403].includes(response.status)) throw new ServiceUnavailableException('A credencial da IA não foi aceita. Verifique o token e suas permissões.');
        if (response.status === 429) throw new HttpException('A IA está recebendo muitas solicitações. Aguarde um pouco.',429);
        throw new BadGatewayException('O provedor de IA está indisponível. Tente novamente em instantes.');
      }
      const data = await response.json() as { choices?: { message?: { content?: unknown } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) throw new BadGatewayException('A IA não retornou uma resposta. Tente novamente.');
      return { text:text.trim(), sources, model, provider };
    } catch(error) {
      if (error instanceof HttpException) throw error;
      if (signal.aborted) throw new GatewayTimeoutException('A resposta foi interrompida ou demorou demais. Tente novamente.');
      throw new BadGatewayException('Não foi possível conectar ao provedor de IA.');
    }
  }
}
