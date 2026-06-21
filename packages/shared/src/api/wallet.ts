/**
 * 钱包/积分 API 客户端
 * 对接 Go 后端 wallet 模块（session 鉴权，web 端登录后可用）
 */

import { apiRequest } from './client';
import type { Wallet } from '../types/wallet';

export const walletApi = {
  /** 我的钱包（积分余额 + 每日配额） */
  getWallet() {
    return apiRequest<Wallet>('/api/v1/users/wallet');
  },
};
