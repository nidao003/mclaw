/**
 * 管理后台用户管理 API
 * 对接 Go 后端 /api/v1/admin/users 系列（skill 模块的 SkillAdminHandler）
 * 需要 super_admin / admin 权限（session cookie）
 */

import { apiRequest } from './client';
import type { AdminUserListResp } from '../types/user';

export const adminUserApi = {
  /** 用户列表（所有用户，不区分团队） */
  listUsers(params?: { search?: string; role?: string; cursor?: string; limit?: number }) {
    return apiRequest<AdminUserListResp>('/api/v1/admin/users', {
      params: params as Record<string, string> | undefined,
    });
  },

  /** 修改用户角色 */
  updateRole(userId: string, role: string) {
    return apiRequest<null>(`/api/v1/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },
};
