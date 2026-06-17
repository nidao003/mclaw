import { useState, useCallback, useEffect } from 'react';
import { subscriptionApi } from '../api/subscription';
import type { Plan, UserSubscription } from '../types/subscription';
import { ApiRequestError } from '../api/client';

// 套餐列表 + 我的订阅 hook
export function useSubscription() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await subscriptionApi.listPlans();
      setPlans(data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : '加载套餐失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubscription = useCallback(async () => {
    try {
      const data = await subscriptionApi.getMySubscription();
      setCurrent(data);
    } catch {
      // 未登录或未订阅，忽略
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    fetchSubscription();
  }, [fetchPlans, fetchSubscription]);

  const subscribe = useCallback(async (planId: string) => {
    setLoading(true);
    try {
      const data = await subscriptionApi.subscribe(planId);
      setCurrent(data);
    } catch (err) {
      throw err instanceof ApiRequestError ? err : new Error('订阅失败');
    } finally {
      setLoading(false);
    }
  }, []);

  return { plans, current, loading, error, subscribe, refresh: fetchPlans };
}
