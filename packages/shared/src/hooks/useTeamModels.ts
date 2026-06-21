import { useState, useCallback, useEffect } from 'react';
import { teamApi } from '../api/team';
import type {
  TeamModel,
  AddTeamModelReq,
  UpdateTeamModelReq,
  CheckModelResp,
  CheckByConfigReq,
} from '../types/team';
import { ApiRequestError } from '../api/client';

/** 团队模型管理 hook */
export function useTeamModels() {
  const [models, setModels] = useState<TeamModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await teamApi.listModels();
      setModels(resp.models ?? []);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : '加载模型列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const addModel = useCallback(async (req: AddTeamModelReq) => {
    const model = await teamApi.addModel(req);
    // API 成功后才更新本地状态，失败时调用方 catch 处理，状态不受影响
    setModels((prev) => [...prev, model]);
    return model;
  }, []);

  const updateModel = useCallback(async (modelId: string, req: UpdateTeamModelReq) => {
    const model = await teamApi.updateModel(modelId, req);
    setModels((prev) => prev.map((m) => (m.id === modelId ? model : m)));
    return model;
  }, []);

  const deleteModel = useCallback(async (modelId: string) => {
    await teamApi.deleteModel(modelId);
    setModels((prev) => prev.filter((m) => m.id !== modelId));
  }, []);

  const checkModel = useCallback(async (modelId: string): Promise<CheckModelResp> => {
    const resp = await teamApi.checkModel(modelId);
    // 更新本地列表中的检查结果
    setModels((prev) =>
      prev.map((m) =>
        m.id === modelId
          ? { ...m, last_check_success: resp.success, last_check_error: resp.error ?? '' }
          : m,
      ),
    );
    return resp;
  }, []);

  const checkModelByConfig = useCallback(async (req: CheckByConfigReq): Promise<CheckModelResp> => {
    return teamApi.checkModelByConfig(req);
  }, []);

  return {
    models,
    loading,
    error,
    addModel,
    updateModel,
    deleteModel,
    checkModel,
    checkModelByConfig,
    refresh: fetchModels,
  };
}
