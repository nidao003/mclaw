// 稳健的复制到剪贴板函数，兼容 HTTP 非安全上下文
// navigator.clipboard.writeText 只在 HTTPS/localhost 下可用
// 在 HTTP 环境下用 textarea + execCommand fallback
export async function copyToClipboard(text: string): Promise<void> {
  try {
    // 优先尝试现代 API
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // clipboard API 不可用，走 fallback
  }

  // Fallback: textarea + execCommand (兼容 HTTP)
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}
