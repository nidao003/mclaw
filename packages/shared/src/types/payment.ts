/** 支付相关类型 —— 跟 Go 后端 domain/payment.go 对齐 */

// 订单类型
export type PaymentOrderType = 'subscription' | 'recharge';

// 订单状态
export type PaymentOrderStatus = 'pending' | 'paid' | 'expired' | 'cancelled';

// 支付订单
export interface PaymentOrder {
  id: string;
  user_id: string;
  order_no: string;
  trade_no?: string;
  type: PaymentOrderType;
  amount: number; // 分
  status: PaymentOrderStatus;
  description: string;
  payment_url?: string;
  metadata?: Record<string, unknown>;
  paid_at?: string;
  expired_at: string;
  created_at: string;
}

// 创建订单请求
export interface CreateOrderReq {
  type: PaymentOrderType;
  amount: number;
  description: string;
  metadata?: Record<string, unknown>;
}

// 订单列表请求
export interface ListOrderReq {
  cursor?: string;
  limit?: number;
  status?: PaymentOrderStatus;
}
