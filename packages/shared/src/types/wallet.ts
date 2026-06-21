/** 钱包/积分相关类型 —— 跟 Go 后端 domain/wallet.go 对齐 */

// 用户钱包（积分余额 + 每日 token 配额）
export interface Wallet {
  id: string;
  user_id: string;
  balance: number; // 积分余额（按次计费扣这里）
  total_recharged: number; // 累计充值
  total_consumed: number; // 累计消耗
  total_granted: number; // 累计赠送
  daily_basic_token_balance: number;
  daily_pro_token_balance: number;
  daily_ultra_token_balance: number;
  daily_reset_at?: string;
  enable_credit_consumption: boolean;
}
