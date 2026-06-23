import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Copy, Terminal, Check, X } from 'lucide-react';
import { SkillDetailView, useSkillDetail, useAuthStore } from '@shared';
import { useState, useCallback } from 'react';
import { copyToClipboard } from '../../lib/clipboard';

function InstallGuideDialog({ slug, onClose, onInstall }: { slug: string; onClose: () => void; onInstall: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  const chatPrompt = `帮我用 MClaw 安装 ${slug} 技能：npx mclaw-skills add mclaw/${slug}`;

  const commands = [
    {
      label: '对话安装（推荐）',
      cmd: chatPrompt,
      desc: '直接复制给 Claude Code / Codex / OpenCode / OpenClaw，AI 自动帮你装好',
    },
    {
      label: '终端 CLI',
      cmd: `npx mclaw-skills add mclaw/${slug}`,
      desc: '在终端手动运行，需要 Node.js 环境',
    },
    {
      label: '全局安装',
      cmd: `npm install -g mclaw-skills\nskills add mclaw/${slug}`,
      desc: '全局安装后直接用 skills 命令，免去每次 npx 开销',
    },
  ];

  const handleCopy = async (cmd: string) => {
    await copyToClipboard(cmd);
    setCopied(cmd);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="mx-4 w-full max-w-lg rounded-[28px] border border-black/10 bg-white p-6 shadow-2xl shadow-black/20" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Terminal className="h-4 w-4" />
            安装此技能
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-meta text-muted-foreground mb-4">
          选择以下任一方式获取并安装此技能，适配 Claude Code · Codex · OpenCode · OpenClaw · Gemini CLI。
        </p>
        <div className="space-y-3">
          {commands.map((cmd) => (
            <div key={cmd.label} className="rounded-2xl border border-black/[0.06] bg-secondary p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">{cmd.label}</span>
                <button
                  onClick={() => handleCopy(cmd.cmd)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied === cmd.cmd ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === cmd.cmd ? '已复制' : '复制'}
                </button>
              </div>
              <pre className="mt-1 rounded-md bg-black/[0.06] dark:bg-white/[0.06] px-3 py-2 text-xs font-mono text-foreground/80 overflow-x-auto">
                {cmd.cmd}
              </pre>
              <p className="mt-1 text-2xs text-muted-foreground">{cmd.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <p className="text-2xs text-muted-foreground">首次使用会自动初始化，也可以手动 npx mclaw-skills init</p>
          <button
            onClick={() => { onInstall(); onClose(); }}
            className="rounded-full bg-skillhub-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#383838]"
          >
            已安装，记录一下
          </button>
        </div>
      </div>
    </div>
  );
}

// 技能详情页 — Skills Hub 设计规范
export default function SkillDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { skill, ratings, loading, error, install, rate } = useSkillDetail(slug);
  const user = useAuthStore((s) => s.user);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // 判断当前用户是否已评价
  const userHasRated = user && ratings?.some((r) => (r as Record<string, unknown>).user_id === user.id);

  const handleInstall = useCallback(() => {
    setShowInstallGuide(true);
  }, []);

  const handleConfirmInstall = useCallback(async () => {
    try { await install(); } catch { /* ignore */ }
  }, [install]);

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-10 md:px-10">
      <Link
        to="/skills"
        className="inline-flex items-center gap-1.5 text-sm text-black/55 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回技能市场
      </Link>

      <div className="mt-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && !skill && (
          <div className="py-20 text-center text-muted-foreground">
            <p>技能不存在</p>
          </div>
        )}

        {skill && (
          <>
            <SkillDetailView
              skill={skill}
              onInstall={handleInstall}
              onRate={userHasRated ? undefined : rate}
              ratings={ratings}
            />

            {showInstallGuide && (
              <InstallGuideDialog
                slug={skill.skill_id}
                onClose={() => setShowInstallGuide(false)}
                onInstall={handleConfirmInstall}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
