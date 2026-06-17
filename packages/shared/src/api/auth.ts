/**
 * 认证 API 客户端
 * 对接 Go 后端 user 模块的登录/注册
 * session 由 fetch credentials:include 自动管理
 */

import { apiRequest } from './client';
import type { LoginReq, LoginResp, RegisterReq, User } from '../types/user';

export const authApi = {
  /** 邮箱+密码登录 (POST /api/v1/users/password-login) */
  login(req: LoginReq) {
    return apiRequest<LoginResp>('/api/v1/users/password-login', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /** 注册 */
  register(req: RegisterReq) {
    return apiRequest<LoginResp>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /** 登出 (POST /api/v1/users/logout) */
  logout() {
    return apiRequest<null>('/api/v1/users/logout', {
      method: 'POST',
    });
  },

  /** 获取当前用户 (GET /api/v1/users/status) */
  me() {
    return apiRequest<User>('/api/v1/users/status');
  },

  /** 更新用户信息 (PUT /api/v1/users) */
  updateProfile(data: { name?: string; avatar_url?: string }) {
    const formData = new FormData();
    if (data.name) formData.set('name', data.name);
    if (data.avatar_url) formData.set('avatar_url', data.avatar_url);
    return apiRequest<{ user: User; message: string; success: boolean }>('/api/v1/users', {
      method: 'PUT',
      headers: {}, // FormData 不需要 Content-Type，让浏览器自动设置
      body: formData,
    });
  },

  /** 修改密码 (PUT /api/v1/users/passwords/change) */
  changePassword(data: { old_password: string; new_password: string }) {
    return apiRequest<null>('/api/v1/users/passwords/change', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
