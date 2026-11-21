export type RefundStatus =
  'waiting_merchant' | 'waiting_receipt' | 'queued' | 'reviewing' | 'completed';
export type RefundEvent = { id: string; title: string; detail: string; at: string };
export type Attachment = { id: string; name: string; type: string; size: number; key: string };
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
    merchant: 'Mercado do Bairro',
    category: 'Alimentação',
    amount: 18490,
    date: '2026-11-18',
    initials: 'MB',
  },
  {
    id: 'tx-delivery',
    merchant: 'Mesa & Companhia',
    category: 'Refeição',
    amount: 6290,
    date: '2026-11-19',
    initials: 'MC',
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
