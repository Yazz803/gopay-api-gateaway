export interface GojekTransaction {
  id?: string;
  order_id?: string;
  transaction_id?: string;
  amount?: number | string;
  total_amount?: number | string;
  status?: string;
  payment_type?: string;
  transaction_time?: string;
  settlement_time?: string;
  created_at?: string;
  issuer?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  [key: string]: unknown;
}

export interface NormalizedTransaction {
  id: string;
  order_id: string;
  amount: number; // In IDR (normalized from Gojek cents if needed)
  status: string;
  payment_type?: string;
  transaction_time: string;
  issuer?: string;
  customer_name?: string;
  raw?: GojekTransaction;
}

export interface ClaimScope {
  scopeId: string;
  amount: number;
}

export interface VerifyPaymentResult {
  matched: boolean;
  transaction?: NormalizedTransaction;
  message?: string;
}
