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
