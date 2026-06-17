/**
 * translation-cache.ts
 *
 * mclaw 运行时翻译缓存（仿 QClaw ~/.qclaw/translation-cache.json 28KB）。
 *
 * 为什么需要：
 *   - i18next 的 fallback 链在大列表场景下会有性能问题
 *   - 一些动态内容（如 skill 描述、agent 名字）需要运行时翻译
 *   - 缓存避免重复计算 / 重复查表
 *
 * 缓存策略：
 *   - 内存 LRU（默认 1000 条）
 *   - 持久化到 ~/.mclaw/translation-cache.json（启动时加载）
 *   - 按 key = `${locale}:${sourceLang}:${textHash}` 缓存
 *   - 超过 100KB 时按 LRU 淘汰
 */
import { LRUCache } from 'lru-cache';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
// i18n instance is used via the postProcessor integration below;
// importing it here causes a TS6133 unused-var error in strict mode,
// so we reference it lazily at call sites instead.

const CACHE_FILE_NAME = 'translation-cache.json';
const MAX_ENTRIES = 1000;
const MAX_FILE_SIZE = 100 * 1024; // 100KB

export interface CacheEntry {
  /** 翻译后的文本 */
  translated: string;
  /** 缓存时间 */
  cachedAt: number;
  /** 命中次数 */
  hits: number;
  /** 源语言（zh / en） */
  sourceLang: string;
  /** 目标语言 */
  targetLang: string;
}

class TranslationCache {
  private cache: LRUCache<string, CacheEntry>;
  private filePath: string;
  private dirty = false;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.cache = new LRUCache<string, CacheEntry>({
      max: MAX_ENTRIES,
      // LRU 自动按访问时间排序
    });
    // 文件路径用 homedir() 拼 ~/.mclaw/
    this.filePath = path.join(process.env.HOME || '/tmp', '.mclaw', CACHE_FILE_NAME);
  }

  /**
   * 初始化（启动时调用一次）
   */
  init(): void {
    if (existsSync(this.filePath)) {
      try {
        const raw = readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
        const now = Date.now();
        for (const [key, entry] of Object.entries(parsed)) {
          // 过滤掉太旧的缓存（> 30 天）
          if (now - entry.cachedAt < 30 * 24 * 60 * 60 * 1000) {
            this.cache.set(key, entry);
          }
        }
      } catch (err) {
        console.warn('[translation-cache] Failed to load:', err);
      }
    }
  }

  /**
   * 计算缓存 key
   */
  private _key(text: string, sourceLang: string, targetLang: string): string {
    const hash = createHash('sha256').update(text).digest('hex').slice(0, 16);
    return `${targetLang}:${sourceLang}:${hash}`;
  }

  /**
   * 查缓存
   */
  get(text: string, sourceLang: string, targetLang: string): string | null {
    if (sourceLang === targetLang) return text; // 不需要翻译
    const key = this._key(text, sourceLang, targetLang);
    const entry = this.cache.get(key);
    if (entry) {
      entry.hits++;
      this.dirty = true;
      return entry.translated;
    }
    return null;
  }

  /**
   * 写缓存
   */
  set(text: string, sourceLang: string, targetLang: string, translated: string): void {
    if (sourceLang === targetLang) return;
    if (!text || !translated) return;
    const key = this._key(text, sourceLang, targetLang);
    this.cache.set(key, {
      translated,
      cachedAt: Date.now(),
      hits: 0,
      sourceLang,
      targetLang,
    });
    this.dirty = true;
    this._scheduleFlush();
  }

  /**
   * 翻译（带缓存的便捷方法）
   *
   * @param text 要翻译的文本
   * @param sourceLang 源语言（zh / en / ja / ru）
   * @param targetLang 目标语言
   * @param fallback 缓存未命中时的回退函数
   */
  translate(
    text: string,
    sourceLang: string,
    targetLang: string,
    fallback: () => string,
  ): string {
    if (!text) return text;
    if (sourceLang === targetLang) return text;

    const cached = this.get(text, sourceLang, targetLang);
    if (cached !== null) return cached;

    // 调用回退函数（通常是 i18n.t 或服务端翻译）
    let translated: string;
    try {
      translated = fallback();
    } catch {
      return text; // 失败时返回原文
    }

    this.set(text, sourceLang, targetLang, translated);
    return translated;
  }

  /**
   * 批量翻译（用于 skill 描述、agent 名字等列表）
   */
  translateBatch(
    items: Array<{ text: string; sourceLang?: string }>,
    targetLang: string,
    fallback: (text: string) => string,
  ): string[] {
    return items.map((item) => {
      const source = item.sourceLang || this._detectSourceLang(item.text);
      return this.translate(item.text, source, targetLang, () => fallback(item.text));
    });
  }

  /**
   * 简单的源语言检测（启发式：含中文字符 → zh，含拉丁字符 → en）
   */
  private _detectSourceLang(text: string): string {
    if (/[一-龥]/.test(text)) return 'zh';
    if (/[぀-ゟ゠-ヿ]/.test(text)) return 'ja';
    if (/[Ѐ-ӿ]/.test(text)) return 'ru';
    return 'en';
  }

  /**
   * 统计信息
   */
  stats(): { size: number; totalHits: number; hitRate: number } {
    let totalHits = 0;
    let accessCount = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      accessCount++;
    }
    return {
      size: this.cache.size,
      totalHits,
      hitRate: accessCount > 0 ? totalHits / accessCount : 0,
    };
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.dirty = true;
    this._flushSync();
  }

  // ───────────────── 内部 ─────────────────

  private _scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this._flushSync();
    }, 5000); // 5 秒批量写一次
  }

  private _flushSync(): void {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      const obj: Record<string, CacheEntry> = {};
      for (const [key, entry] of this.cache.entries()) {
        obj[key] = entry;
      }
      const dir = path.dirname(this.filePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

      let serialized = JSON.stringify(obj, null, 2);
      // 超大时按 LRU 末尾淘汰，直到 < 100KB
      if (serialized.length > MAX_FILE_SIZE) {
        // 简化：直接 dump 全部，LRU 内存上限 1000 条已经够小
        // 如果超 100KB 说明文本很长，截断最老的 20%
        const keys = [...this.cache.keys()];
        const toRemove = Math.floor(keys.length * 0.2);
        for (let i = 0; i < toRemove; i++) {
          this.cache.delete(keys[i]);
        }
        const newObj: Record<string, CacheEntry> = {};
        for (const [key, entry] of this.cache.entries()) {
          newObj[key] = entry;
        }
        serialized = JSON.stringify(newObj, null, 2);
      }

      writeFileSync(this.filePath, serialized, 'utf-8');
    } catch (err) {
      console.warn('[translation-cache] Flush failed:', err);
    }
  }
}

export const translationCache = new TranslationCache();

/**
 * 集成到 i18next（作为后置 fallback）
 *
 * 用法：
 *   import { i18n } from './i18n';
 *   i18n.use({
 *     type: 'postProcessor',
 *     name: 'cache',
 *     process(value, key, options) {
 *       // 缓存结果
 *       if (options?.sourceLang) {
 *         translationCache.set(options.sourceText, options.sourceLang, i18n.language, value);
 *       }
 *       return value;
 *     },
 *   });
 */
