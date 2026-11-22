export type RefundStatus =
  'waiting_merchant' | 'waiting_receipt' | 'queued' | 'reviewing' | 'completed';
export type RefundEvent = { id: string; title: string; detail: string; at: string };
export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  key: string;
  storage?: 'local' | 's3';
  bucket?: string;
};
export type RefundCase = {
  id: string;
  protocol: string;
  session: string;
  transactionId: string;
  reason: string;
  description: string;
  status: RefundStatus;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
  events: RefundEvent[];
};
export const transactions = [
  {
    id: 'tx-market',
    merchant: 'Hiperideal Barra',
    category: 'Alimentação',
    amount: 18490,
    date: '2026-11-18',
    initials: 'HB',
  },
  {
    id: 'tx-delivery',
    merchant: 'Mercantil Atacado Pirajá',
    category: 'Alimentação',
    amount: 6290,
    date: '2026-11-19',
    initials: 'MA',
  },
  {
    id: 'tx-cafe',
    merchant: 'Café da Esquina',
    category: 'Refeição',
    amount: 2850,
    date: '2026-11-20',
    initials: 'CE',
  },
];
export const refundGuide = {
  title: 'Como funciona o estorno e o que fazer em caso de cobrança duplicada?',
  url: 'https://faq.flashapp.com.br/kb/guide/pt-BR/como-funciona-o-estorno-e-o-que-fazer-em-caso-de-cobranca-duplicada-YCKtRTryEC/Steps/4198154',
};
