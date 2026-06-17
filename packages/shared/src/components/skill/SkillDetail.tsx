import { useState } from 'react';
import { Download, Star, Calendar, Tag, ChevronDown } from 'lucide-react';
import type { SkillDetail as SkillDetailType } from '../../types/skill';
import { formatCount, formatDate } from '../../utils/format';
import { cn } from '../../utils/cn';

interface RatingItem {
  id: string;
  score: number;
  comment: string;
  created_at: string;
}

interface SkillDetailProps {
  skill: SkillDetailType;
  onInstall?: () => void;
  onRate?: (score: number, comment?: string) => void;
  installing?: boolean;
  ratings?: RatingItem[];
}

// 技能详情页核心 —— 完整展示单个技能的所有信息
export function SkillDetailView({ skill, onInstall, onRate, installing, ratings }: SkillDetailProps) {
  const [showRateForm, setShowRateForm] = useState(false);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');

  return (
    <div className="max-w-4xl">
      {/* 头部 */}
      <div className="rounded-[32px] border border-black/[0.06] bg-white p-6 md:p-8">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-secondary text-2xl font-semibold text-skillhub-blue">
            {skill.icon || skill.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-semibold tracking-normal md:text-4xl">{skill.name}</h1>
            <p className="mt-3 text-base leading-7 text-black/60">{skill.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-black/50">
              {skill.rating_count > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-skillhub-blue text-skillhub-blue" />
                  <span className="font-medium text-foreground">{skill.rating_avg.toFixed(1)}</span>
                  ({skill.rating_count})
                </span>
              )}
              <span className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                {formatCount(skill.install_count)} 安装
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(skill.created_at)}
              </span>
            </div>
          </div>
        </div>

        {onInstall && (
          <div className="mt-8">
            <button
              onClick={onInstall}
              disabled={installing}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-all',
                installing
                  ? 'cursor-not-allowed bg-secondary text-black/45'
                  : 'bg-skillhub-black text-white hover:bg-[#383838] hover:shadow-lg',
              )}
            >
              <Download className="h-4 w-4" />
              {installing ? '安装中...' : `立即安装 (${formatCount(skill.install_count)})`}
            </button>
          </div>
        )}
      </div>

      {/* 标签 — 胶囊 */}
      {skill.tags.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Tag className="h-4 w-4" /> 标签
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {skill.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-black/55"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 评分区 — hairline 顶部分隔 */}
      {onRate && (
        <div className="mt-8 border-t border-black/[0.06] pt-6">
          <button
            onClick={() => setShowRateForm(!showRateForm)}
            className="inline-flex items-center gap-1.5 text-sm text-black/55 transition-colors hover:text-foreground"
          >
            <Star className="h-4 w-4" />
            评价这个技能
            <ChevronDown className={cn('h-4 w-4 transition-transform', showRateForm && 'rotate-180')} />
          </button>

          {showRateForm && (
            <div className="mt-3 space-y-3 rounded-[24px] border border-black/[0.06] bg-white p-5">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScore(s)}
                    className={cn(
                      'text-xl transition-colors',
                      s <= score ? 'text-skillhub-blue' : 'text-border',
                    )}
                  >
                    ★
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="写点评价（可选）"
                className="w-full rounded-full border border-black/10 bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-skillhub-blue/40"
              />
              <button
                onClick={() => {
                  onRate(score, comment || undefined);
                  setShowRateForm(false);
                }}
                className="rounded-full bg-skillhub-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#383838]"
              >
                提交评价
              </button>
            </div>
          )}
        </div>
      )}

      {/* 已有评价列表 */}
      {ratings && ratings.length > 0 && (
        <div className="mt-8 border-t border-black/[0.06] pt-6">
          <h3 className="text-sm font-semibold">用户评价 ({ratings.length})</h3>
          <div className="mt-3 space-y-2">
            {ratings.map((r) => (
              <div key={r.id} className="rounded-2xl bg-secondary px-4 py-3">
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={cn('h-3.5 w-3.5', s <= r.score ? 'fill-skillhub-blue text-skillhub-blue' : 'text-border')} />
                  ))}
                  <span className="ml-2 text-2xs text-muted-foreground">{formatDate(r.created_at)}</span>
                </div>
                {r.comment && <p className="text-sm text-foreground/80">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 版本历史 — hairline 顶部分隔 */}
      {skill.versions && skill.versions.length > 0 && (
        <div className="mt-8 border-t border-black/[0.06] pt-6">
          <h3 className="text-sm font-semibold">版本历史</h3>
          <div className="mt-3 space-y-2">
            {skill.versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-2xl bg-secondary px-4 py-2.5"
              >
                <span className="text-sm font-mono">{v.version}</span>
                <span className="text-meta text-muted-foreground">{v.changelog}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
