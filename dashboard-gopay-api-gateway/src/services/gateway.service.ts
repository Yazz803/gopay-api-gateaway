import { apiFetch } from './api-client';
import type {
  HealthResponse,
  LogsResponse,
  TokenStatusResponse,
  TransactionsResponse,
  CreateQrisRequest,
  CreateQrisResponse,
  CheckPaymentRequest,
  CheckPaymentResponse,
  QrStatusResponse,
} from '@/types';

export const GatewayService = {
  async getHealth(): Promise<HealthResponse> {
    return apiFetch<HealthResponse>('/api/health');
  },

  async getLogs(): Promise<LogsResponse> {
    return apiFetch<LogsResponse>('/api/logs');
  },

  async getTokenStatus(): Promise<TokenStatusResponse> {
    return apiFetch<TokenStatusResponse>('/api/token-status');
  },

  async getTransactions(pageSize: number = 20): Promise<TransactionsResponse> {
    return apiFetch<TransactionsResponse>(`/api/transactions?pageSize=${pageSize}`);
  },

  async createQris(data: CreateQrisRequest): Promise<CreateQrisResponse> {
    return apiFetch<CreateQrisResponse>('/api/create-qris', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async checkPayment(data: CheckPaymentRequest): Promise<CheckPaymentResponse> {
    return apiFetch<CheckPaymentResponse>('/api/check-payment', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getQrStatus(id: string): Promise<QrStatusResponse> {
    return apiFetch<QrStatusResponse>(`/api/qr-status/${encodeURIComponent(id)}`);
  },
};
