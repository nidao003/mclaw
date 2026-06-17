import { useState, useCallback, useEffect } from 'react';
import { expertApi } from '../api/expert';
import type { Expert } from '../types/expert';

/** 专家列表 hook */
export function useExpertList() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExperts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await expertApi.list();
      setExperts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExperts();
  }, [fetchExperts]);

  return { experts, loading, error, refresh: fetchExperts };
}

/** 专家详情 hook */
export function useExpertDetail(slug: string | undefined) {
  const [expert, setExpert] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const data = await expertApi.getBySlug(slug);
      setExpert(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { expert, loading, error, refresh: fetch };
}
