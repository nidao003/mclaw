import { useState, useCallback, useEffect } from 'react';
import { teamApi } from '../api/team';
import type { TeamDashboardResp, TeamDashboardReq } from '../types/team';
import { ApiRequestError } from '../api/client';

type DashboardRange = 'today' | '7d' | '30d';

/** 团队管理概览 hook */
export function useTeamDashboard() {
  const [data, setData] = useState<TeamDashboardResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DashboardRange>('7d');

  const fetchDashboard = useCallback(async (req?: TeamDashboardReq) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await teamApi.dashboard(req ?? { range });
      setData(resp);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : '加载概览失败');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchDashboard({ range });
  }, [range, fetchDashboard]);

  const refresh = useCallback(() => fetchDashboard({ range }), [fetchDashboard, range]);

  return { data, loading, error, range, setRange, refresh };
}
