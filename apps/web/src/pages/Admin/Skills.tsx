import { useState, useEffect, useCallback } from 'react';
import { skillApi } from '@shared';
import type { SkillDetail } from '@shared';
import { Check, X, Loader2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

// 技能审核页 — Skills Hub 设计规范
export default function AdminSkills() {
  const [skills, setSkills] = useState<SkillDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await skillApi.listPending(50);
      setSkills(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    setReviewingId(id);
    try {
      await skillApi.review(id, { status });
      setSkills((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setReviewingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">技能审核</h2>
          <p className="mt-0.5 text-meta text-muted-foreground">
            审核用户提交的技能发布申请
          </p>
        </div>
        <button
          onClick={fetchPending}
          disabled={loading}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs hover:bg-secondary transition-colors"
        >
          刷新列表
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {skills.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-meta text-muted-foreground">暂无待审核技能</p>
          <p className="mt-1 text-2xs text-muted-foreground">所有技能已处理完毕</p>
        </div>
      ) : (
        <div className="space-y-3">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="flex items-start justify-between rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-lg">
                  {skill.icon || '⚡'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{skill.name}</h3>
                    <Link
                      to={`/skills/${skill.skill_id}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <p className="mt-0.5 text-meta text-muted-foreground line-clamp-1">
                    {skill.description}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-2xs text-muted-foreground">
                    <span>{skill.skill_id}</span>
                    {skill.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded-full bg-secondary px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-4">
                <button
                  onClick={() => handleReview(skill.id, 'approved')}
                  disabled={reviewingId === skill.id}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    'bg-primary text-primary-foreground hover:bg-primary/90',
                    reviewingId === skill.id && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                  {reviewingId === skill.id ? '处理中' : '通过'}
                </button>
                <button
                  onClick={() => handleReview(skill.id, 'rejected')}
                  disabled={reviewingId === skill.id}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    'border border-border hover:bg-destructive/10 hover:text-destructive',
                    reviewingId === skill.id && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <X className="h-3.5 w-3.5" />
                  拒绝
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
