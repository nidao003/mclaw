import { useEffect } from 'react';

/** 跟随系统 prefers-color-scheme 自动切换 dark/light */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const root = document.documentElement;

    const apply = (dark: boolean) => {
      root.classList.toggle('dark', dark);
    };

    // 初始应用
    apply(mq.matches);

    // 监听系统变化
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return <>{children}</>;
}
