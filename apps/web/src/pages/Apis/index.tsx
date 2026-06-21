import { useEffect, useState } from 'react';
import { dataDocApi, type ApiDocItem, type ApiDocGroup } from '@shared';
import { Code2, Key, Coins, Copy, Check, FileDown, ChevronDown, ChevronRight } from 'lucide-react';

// 常见状态码说明（固定展示）
const STATUS_CODES = [
  { code: '200', desc: '成功', tip: '请求处理完成，data 字段返回数据' },
  { code: '401', desc: '鉴权失败', tip: '确认请求头已添加 X-API-Key，且密钥有效' },
  { code: '402', desc: '积分不足', tip: '账户余额不足以支付本次调用，请充值后再试' },
  { code: '11501', desc: '数据不存在', tip: '车站/城市不存在，检查 ID/编码' },
  { code: '11503', desc: '参数错误', tip: '检查参数类型与必填项' },
  { code: '500', desc: '系统错误', tip: '服务端异常，稍后重试或联系支持' },
];

export default function ApiDocs() {
  const [groups, setGroups] = useState<ApiDocGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeApi, setActiveApi] = useState<ApiDocItem | null>(null);
  const [copied, setCopied] = useState(false);
  // 展开的一级分组集合（默认展开第一个）
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    dataDocApi
      .getDocs()
      .then((resp) => {
        const gs = resp.groups || [];
        setGroups(gs);
        // 默认展开第一个一级分组，并选中其第一个二级分类的第一个接口
        if (gs.length > 0) {
          setExpanded(new Set([gs[0].group]));
          const firstApi = gs[0].subGroups?.[0]?.apis?.[0];
          if (firstApi) setActiveApi(firstApi);
        }
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  const toggleGroup = (group: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const exportMarkdown = () => {
    if (!activeApi) return;
    const md = buildMarkdown(activeApi);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeApi.apiCode}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center text-black/50">
        加载中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* 顶部：标题 + BASE URL */}
      <div className="border-b border-black/[0.06] bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <h2 className="text-3xl font-bold text-foreground">API 文档</h2>
          <div className="mt-4 flex items-center gap-2">
            <Code2 className="h-4 w-4 text-[#EE7C4B]" />
            <span className="text-sm text-black/55">BASE URL</span>
            <code className="rounded-md bg-black/[0.04] px-3 py-1 text-sm font-mono text-foreground">
              {import.meta.env.VITE_API_BASE_URL || window.location.origin}
            </code>
          </div>
          <p className="mt-3 text-sm text-black/50">
            数据 API 按调用次数计费，所有接口调用需在请求头携带
            <code className="mx-1 rounded bg-black/[0.04] px-1.5 py-0.5 font-mono text-[#EE7C4B]">X-API-Key</code>
            鉴权令牌。
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex gap-8">
          {/* 左侧：一级分组 → 二级分类 → 接口列表（可折叠树） */}
          <aside className="w-72 shrink-0">
            <div className="sticky top-6 space-y-4">
              {groups.map((g) => {
                const isOpen = expanded.has(g.group);
                return (
                  <div key={g.group}>
                    {/* 一级分组标题（可折叠） */}
                    <button
                      onClick={() => toggleGroup(g.group)}
                      className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-foreground hover:bg-black/[0.03]"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-black/40" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-black/40" />
                      )}
                      <span className="rounded bg-[#EE7C4B]/12 px-1.5 py-0.5 text-[11px] font-semibold text-[#D95A2B]">
                        {g.group}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="mt-1 ml-2 space-y-3 border-l border-black/[0.06] pl-3">
                        {g.subGroups.map((sub) => (
                          <div key={sub.category}>
                            <h4 className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-black/40">
                              {sub.category}
                            </h4>
                            <div className="space-y-0.5">
                              {sub.apis.map((api) => (
                                <button
                                  key={api.apiCode}
                                  onClick={() => setActiveApi(api)}
                                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                                    activeApi?.apiCode === api.apiCode
                                      ? 'bg-[#EE7C4B]/10 text-[#D95A2B] font-medium'
                                      : 'text-black/60 hover:bg-black/[0.03]'
                                  }`}
                                >
                                  <span className="rounded bg-[#EE7C4B]/15 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[#D95A2B]">
                                    {api.method}
                                  </span>
                                  <span className="truncate">{api.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* 右侧：接口详情 */}
          <main className="min-w-0 flex-1">
            {activeApi ? (
              <ApiDetail
                api={activeApi}
                copied={copied}
                onCopy={handleCopy}
                onExport={exportMarkdown}
              />
            ) : (
              <div className="text-black/40">暂无接口</div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function ApiDetail({
  api,
  copied,
  onCopy,
  onExport,
}: {
  api: ApiDocItem;
  copied: boolean;
  onCopy: (t: string) => void;
  onExport: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* 标题 + 徽章 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{api.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#EE7C4B]/10 px-3 py-1 font-medium text-[#D95A2B]">
            <Coins className="h-3.5 w-3.5" />
            {api.creditsPerCall} 积分/次
          </span>
          {api.needApiKey && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.05] px-3 py-1 text-black/60">
              <Key className="h-3.5 w-3.5" />
              需配置 API Key
            </span>
          )}
        </div>
        {api.summary && <p className="mt-3 text-black/60">{api.summary}</p>}
      </div>

      {/* 接口地址 */}
      <div className="rounded-xl border border-black/[0.06] bg-white p-4">
        <div className="flex items-center gap-3">
          <span className="rounded bg-[#EE7C4B] px-2 py-1 text-xs font-bold text-white">{api.method}</span>
          <code className="flex-1 font-mono text-sm text-foreground">{api.path}</code>
          <button
            onClick={onExport}
            className="inline-flex items-center gap-1 rounded-lg border border-black/[0.08] px-3 py-1.5 text-xs text-black/60 hover:bg-black/[0.03]"
          >
            <FileDown className="h-3.5 w-3.5" />
            导出 Markdown
          </button>
        </div>
      </div>

      {/* API 密钥获取与配置 */}
      <Section title="API 密钥获取与配置" icon={<Key className="h-4 w-4 text-[#EE7C4B]" />}>
        <p className="text-sm text-black/60">
          调用 API 前，请先在
          <a href="/settings/api-keys" className="mx-1 text-[#EE7C4B] hover:underline">
            个人中心 → API 密钥
          </a>
          生成 API 密钥。在请求头添加
          <code className="mx-1 rounded bg-black/[0.04] px-1.5 py-0.5 font-mono text-[#D95A2B]">X-API-Key</code>
          字段，密钥用于身份校验与额度计费。
        </p>
      </Section>

      {/* 请求头 */}
      <Section title="请求头">
        <FieldTable
          headers={['名称', '类型', '必填', '说明', '示例']}
          rows={[
            ['X-API-Key', 'string', '是', '平台鉴权令牌，每次请求必填', 'your_api_key'],
            ['Content-Type', 'string', '是', '请求体数据类型', 'application/json'],
          ]}
        />
      </Section>

      {/* 请求参数 */}
      {api.params && api.params.length > 0 && (
        <Section title="请求参数">
          <FieldTable
            headers={['参数', '类型', '必填', '说明', '示例']}
            rows={api.params.map((p) => [
              p.name || '',
              p.type,
              p.required ? '是' : '否',
              p.desc,
              p.example || '',
            ])}
          />
        </Section>
      )}

      {/* 响应字段 */}
      {api.responseFields && api.responseFields.length > 0 && (
        <Section title="返回值与结构">
          <p className="mb-3 text-sm text-black/50">
            统一包装为 <code className="rounded bg-black/[0.04] px-1 font-mono">{'{ code, msg, data }'}</code>，data 为下列字段结构。
          </p>
          <FieldTable
            headers={['字段', '类型', '说明', '示例']}
            rows={api.responseFields.map((f) => [
              f.field || '',
              f.type,
              f.desc,
              f.example || '',
            ])}
          />
        </Section>
      )}

      {/* 请求示例 */}
      {api.exampleRequest && (
        <Section title="请求示例">
          <CodeBlock text={api.exampleRequest} copied={copied} onCopy={onCopy} />
        </Section>
      )}

      {/* 响应示例 */}
      {api.exampleResponse && (
        <Section title="响应示例">
          <CodeBlock text={api.exampleResponse} copied={copied} onCopy={onCopy} />
        </Section>
      )}

      {/* 常见状态码 */}
      <Section title="常见状态码说明">
        <FieldTable
          headers={['状态码', '说明', '排查建议']}
          rows={STATUS_CODES.map((s) => [s.code, s.desc, s.tip])}
        />
      </Section>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function FieldTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-black/[0.06] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/[0.06] bg-black/[0.02]">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left font-medium text-black/70">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-black/[0.04] last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 align-top text-black/65">
                  {cell.startsWith('是') ? (
                    <span className="text-[#D95A2B]">{cell}</span>
                  ) : cell === '否' ? (
                    <span className="text-black/40">{cell}</span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({
  text,
  copied,
  onCopy,
}: {
  text: string;
  copied: boolean;
  onCopy: (t: string) => void;
}) {
  return (
    <div className="relative rounded-xl border border-black/[0.06] bg-[#1e1e1e] p-4">
      <button
        onClick={() => onCopy(text)}
        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/20"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? '已复制' : '复制'}
      </button>
      <pre className="overflow-x-auto text-sm text-white/90">
        <code>{text}</code>
      </pre>
    </div>
  );
}

// 构建 Markdown 导出内容
function buildMarkdown(api: ApiDocItem): string {
  const lines: string[] = [];
  lines.push(`# ${api.name}`, '');
  lines.push(`**计费**：${api.creditsPerCall} 积分/次  |  **鉴权**：${api.needApiKey ? '需 API Key' : '公开'}`, '');
  if (api.summary) lines.push(`> ${api.summary}`, '');
  lines.push(`**Method**: \`${api.method}\`  `, `**Path**: \`${api.path}\``, '');

  if (api.params?.length) {
    lines.push('## 请求参数', '');
    lines.push('| 参数 | 类型 | 必填 | 说明 | 示例 |', '|------|------|------|------|------|');
    api.params.forEach((p) =>
      lines.push(`| ${p.name} | ${p.type} | ${p.required ? '是' : '否'} | ${p.desc} | ${p.example || ''} |`),
    );
    lines.push('');
  }

  if (api.responseFields?.length) {
    lines.push('## 响应字段', '');
    lines.push('| 字段 | 类型 | 说明 | 示例 |', '|------|------|------|------|');
    api.responseFields.forEach((f) =>
      lines.push(`| ${f.field} | ${f.type} | ${f.desc} | ${f.example || ''} |`),
    );
    lines.push('');
  }

  if (api.exampleRequest) lines.push('## 请求示例', '```bash', api.exampleRequest, '```', '');
  if (api.exampleResponse) lines.push('## 响应示例', '```json', api.exampleResponse, '```', '');

  return lines.join('\n');
}
