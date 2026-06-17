import { useState, useCallback, useEffect } from 'react';
import { skillApi } from '../api/skill';
import type { SkillDetail, ListSkillReq, SortBy } from '../types/skill';
import { ApiRequestError } from '../api/client';

interface UseSkillListReturn {
  skills: SkillDetail[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (v: string) => void;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  category: string;
  setCategory: (v: string) => void;
  refresh: () => void;
  loadMore: () => void;
  hasMore: boolean;
}

// 技能列表 hook —— 封装分页、搜索、排序、分类
export function useSkillList(): UseSkillListReturn {
  const [skills, setSkills] = useState<SkillDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [category, setCategory] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  const fetchSkills = useCallback(
    async (append = false) => {
      setLoading(true);
      setError(null);
      try {
        const req: ListSkillReq = {
          limit: 20,
          cursor: append ? cursor : undefined,
          search: search || undefined,
          category: category || undefined,
          sort_by: sortBy,
        };
        const resp = await skillApi.list(req);
        setSkills(append ? [...skills, ...resp.skills] : resp.skills);
        setCursor(resp.page?.next_cursor);
        setHasMore(resp.page?.has_more ?? false);
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    },
    [search, category, sortBy, cursor, skills],
  );

  useEffect(() => {
    fetchSkills(false);
  }, [search, category, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (hasMore && !loading) fetchSkills(true);
  }, [hasMore, loading, fetchSkills]);

  return {
    skills,
    loading,
    error,
    search,
    setSearch,
    sortBy,
    setSortBy,
    category,
    setCategory,
    refresh: () => fetchSkills(false),
    loadMore,
    hasMore,
  };
}

interface RatingItem {
  id: string;
  score: number;
  comment: string;
  created_at: string;
}

// 单个技能详情 hook
export function useSkillDetail(skillId: string | undefined) {
  const [skill, setSkill] = useState<SkillDetail | null>(null);
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!skillId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await skillApi.getBySlug(skillId);
      setSkill(data);
      // 同时拉评价列表
      if (data.id) {
        const r = await skillApi.listRatings(data.id);
        setRatings(r as unknown as RatingItem[]);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [skillId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const install = useCallback(async () => {
    const uuid = skill?.id;
    if (!uuid) return;
    try {
      await skillApi.install(uuid);
      setSkill((prev) => prev ? { ...prev, install_count: prev.install_count + 1 } : null);
    } catch (err) {
      throw err instanceof ApiRequestError ? err : new Error('安装失败');
    }
  }, [skill]);

  const rate = useCallback(
    async (score: number, comment?: string) => {
      const uuid = skill?.id;
      if (!uuid) return;
      try {
        await skillApi.rate(uuid, { score, comment });
        await fetch();
      } catch (err) {
        throw err instanceof ApiRequestError ? err : new Error('评分失败');
      }
    },
    [skill, fetch],
  );

  return { skill, ratings, loading, error, install, rate, refresh: fetch };
}
