/**
 * HTTP API 客户端封装
 * 这个 SB 函数封装了 fetch，统一处理 JSON 解析、错误处理、认证头
 */

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface ApiError {
  code: number;
  message: string;
}

// dev 模式（pnpm dev）：BASE_URL 留空，所有请求走 vite proxy 同源路径 /api/*，
// 由 vite.config.ts 的 proxy 转发到 .env 中的 VITE_API_BASE_URL。
// 这样 session cookie 才能在跨域 CORS 下被正确携带。
// prod 构建（pnpm package）：渲染进程加载 file:// 或 app://，必须用绝对地址直连后端。
const BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || '');

// 统一的 API 请求函数，别tm到处写 fetch 了
export async function apiRequest<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string> },
): Promise<T> {
  let url = `${BASE_URL}${path}`;

  // 拼接 query params
  if (options?.params) {
    const search = new URLSearchParams();
    Object.entries(options.params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') search.set(k, v);
    });
    const qs = search.toString();
    if (qs) url += `?${qs}`;
  }

  const isFormData = options?.body instanceof FormData;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
    credentials: 'include', // session cookie
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiRequestError(res.status, (body as ApiError).message || res.statusText);
  }

  const json: ApiResponse<T> = await res.json();
  if (json.code !== 0 && json.code !== 200) {
    throw new ApiRequestError(json.code, json.message);
  }

  return json.data;
}

export class ApiRequestError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiRequestError';
  }
}
