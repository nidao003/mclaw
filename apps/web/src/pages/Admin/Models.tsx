import { useState } from 'react';
import {
  Bot,
  Plus,
  Trash2,
  Pencil,
  HeartPulse,
  Check,
  X,
  Loader2,
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useTeamModels } from '@shared';
import type { TeamModel, AddTeamModelReq, InterfaceType } from '@shared';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const INTERFACE_OPTIONS: { value: InterfaceType; label: string }[] = [
  { value: 'openai_chat', label: 'OpenAI Chat' },
  { value: 'openai_responses', label: 'OpenAI Responses' },
  { value: 'anthropic', label: 'Anthropic' },
];

// ── 主组件 ───────────────────────────────────────────

export default function AdminModels() {
  const { models, loading, addModel, updateModel, deleteModel, checkModel } = useTeamModels();
  const [showAdd, setShowAdd] = useState(false);
  const [editingModel, setEditingModel] = useState<TeamModel | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCheck = async (model: TeamModel) => {
    setCheckingId(model.id);
    try {
      const resp = await checkModel(model.id);
      if (resp.success) {
        toast.success(`模型 ${model.model} 连接正常`);
      } else {
        toast.error(`检查失败: ${resp.error}`);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCheckingId(null);
    }
  };

  const handleDelete = async (model: TeamModel) => {
    if (!confirm(`确定要移除模型 "${model.model}" 吗？此操作不可撤销。`)) return;
    setDeletingId(model.id);
    try {
      await deleteModel(model.id);
      toast.success('模型已移除');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Bot className="h-5 w-5" />
            AI 大模型
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">配置 AI 大模型，用于对话和分析</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          添加模型
        </button>
      </div>

      {/* 添加模型表单 */}
      {showAdd && (
        <ModelForm
          onSubmit={async (req) => {
            try {
              await addModel(req);
              setShowAdd(false);
              toast.success('模型已添加');
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* 编辑模型表单 */}
      {editingModel && (
        <ModelForm
          model={editingModel}
          onSubmit={async (req) => {
            try {
              await updateModel(editingModel.id, req);
              setEditingModel(null);
              toast.success('模型已更新');
            } catch (err) {
              toast.error((err as Error).message);
            }
          }}
          onCancel={() => setEditingModel(null)}
        />
      )}

      {/* 模型列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : models.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Bot className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">还没有配置任何模型</p>
          <p className="mt-1 text-xs text-muted-foreground">点击"添加模型"开始配置</p>
        </div>
      ) : (
        <div className="space-y-3">
          {models.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              checking={checkingId === model.id}
              deleting={deletingId === model.id}
              onCheck={() => handleCheck(model)}
              onEdit={() => setEditingModel(model)}
              onDelete={() => handleDelete(model)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 模型卡片 ─────────────────────────────────────────

function ModelCard({
  model,
  checking,
  deleting,
  onCheck,
  onEdit,
  onDelete,
}: {
  model: TeamModel;
  checking: boolean;
  deleting: boolean;
  onCheck: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const statusIcon = model.last_check_success ? (
    <Check className="h-3.5 w-3.5 text-green-500" />
  ) : model.last_check_error ? (
    <X className="h-3.5 w-3.5 text-destructive" />
  ) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{model.model || '未知模型'}</h3>
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {model.interface_type}
              </span>
              {statusIcon}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {model.provider && `${model.provider} · `}
              {model.base_url}
            </p>
            {model.remark && <p className="mt-1 text-xs text-muted-foreground">{model.remark}</p>}
          </div>
        </div>

        {/* 操作菜单 */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', menuOpen && 'rotate-180')} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg border border-border bg-card py-1 shadow-lg">
              <button
                onClick={() => { onCheck(); setMenuOpen(false); }}
                disabled={checking}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
              >
                {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HeartPulse className="h-3.5 w-3.5" />}
                检查
              </button>
              <button
                onClick={() => { onEdit(); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground transition-colors hover:bg-secondary"
              >
                <Pencil className="h-3.5 w-3.5" />
                修改
              </button>
              <button
                onClick={() => { onDelete(); setMenuOpen(false); }}
                disabled={deleting}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                移除
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 分组标签 */}
      {model.groups && model.groups.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
          {model.groups.map((g) => (
            <span key={g.id} className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {g.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 模型表单（添加/编辑） ────────────────────────────

function ModelForm({
  model,
  onSubmit,
  onCancel,
}: {
  model?: TeamModel;
  onSubmit: (req: AddTeamModelReq) => Promise<void>;
  onCancel: () => void;
}) {
  const [provider, setProvider] = useState(model?.provider ?? '');
  const [apiKey, setApiKey] = useState(model?.api_key ?? '');
  const [baseUrl, setBaseUrl] = useState(model?.base_url ?? '');
  const [modelName, setModelName] = useState(model?.model ?? '');
  const [remark, setRemark] = useState(model?.remark ?? '');
  const [interfaceType, setInterfaceType] = useState<InterfaceType>(model?.interface_type ?? 'openai_chat');
  const [temperature, setTemperature] = useState(String(model?.temperature ?? 0.7));
  const [supportImage, setSupportImage] = useState(model?.support_image ?? false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !apiKey || !baseUrl || !modelName) {
      toast.error('请填写必填字段');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        provider,
        api_key: apiKey,
        base_url: baseUrl,
        model: modelName,
        remark: remark || undefined,
        interface_type: interfaceType,
        temperature: parseFloat(temperature) || 0.7,
        support_image: supportImage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-primary/30 bg-primary/5 p-5">
      <h3 className="mb-4 text-sm font-medium">{model ? '编辑模型' : '添加模型'}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Provider *" value={provider} onChange={setProvider} placeholder="如 OpenAI、DeepSeek" />
        <Field label="模型名称 *" value={modelName} onChange={setModelName} placeholder="如 gpt-4o、deepseek-chat" />
        <Field label="Base URL *" value={baseUrl} onChange={setBaseUrl} placeholder="https://api.openai.com/v1" />
        <div>
          <label className="mb-1.5 block text-xs font-medium">API Key *</label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="h-11 w-full rounded-lg border border-border bg-card px-4 py-2.5 pr-10 text-sm outline-none transition-colors focus:border-primary/40"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Field label="备注" value={remark} onChange={setRemark} placeholder="可选备注" />
        <Field label="Temperature" value={temperature} onChange={setTemperature} placeholder="0.7" type="number" />
        <div>
          <label className="mb-1.5 block text-xs font-medium">接口类型</label>
          <select
            value={interfaceType}
            onChange={(e) => setInterfaceType(e.target.value as InterfaceType)}
            className="h-11 w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/40"
          >
            {INTERFACE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={supportImage}
              onChange={(e) => setSupportImage(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            支持图片输入
          </label>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? '提交中...' : model ? '保存修改' : '添加模型'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
        >
          取消
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary/40"
      />
    </div>
  );
}
