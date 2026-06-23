/** 用户相关类型 —— 跟 Go 后端 domain/user.go 对齐 */

// V2 expanded roles
export type UserRole = 'user' | 'publisher' | 'reviewer' | 'admin' | 'super_admin' | 'enterprise' | 'individual';

// 用户信息
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
}

// 登录请求
export interface LoginReq {
  email: string;
  password: string;
}

// 登录响应
export interface LoginResp {
  user: User;
  token?: string;
}

// 注册请求
export interface RegisterReq {
  email: string;
  password: string;
  name: string;
}

// 管理后台用户列表项 —— 对齐后端 domain.AdminUserListItem
export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  role: string;
  status: string;
  created_at: string;
  /** 订阅套餐名（来自 active subscription 或 default plan） */
  plan_name: string;
  /** 积分余额（wallet） */
  balance: number;
  /** token 消耗（来自 clickhouse，未配置时为 0） */
  tokens_used: number;
}

// 管理后台用户列表响应
export interface AdminUserListResp {
  users: AdminUserItem[];
  total: number;
}
