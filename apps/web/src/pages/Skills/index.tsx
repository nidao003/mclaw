import { Link } from 'react-router-dom';
import { ArrowRight, UploadCloud } from 'lucide-react';
import { SkillSearchBar, SkillList, useSkillList, useAuthStore } from '@shared';

// 12个地铁资源经营行业分类
const CATEGORIES = [
  '行业知识', '前沿理念', '全国地铁', '车站画像', '数据分析', '经营架构',
  '资源经营', '广告经营', '商业招商', '生活圈运营', '报告生成', '系统连接',
];

// 地铁资源经营技能库页面 — Skills Hub 核心页面
export default function Skills() {
  const user = useAuthStore((s) => s.user);

  const {
    skills,
    loading,
    error,
    search,
    setSearch,
    sortBy,
    setSortBy,
    category,
    setCategory,
    loadMore,
    hasMore,
  } = useSkillList();
  const isAdmin = user?.role === 'admin' || (user?.role as string | undefined) === 'enterprise';

  // 未登录 — 显示登录提示
  if (!user) {
    return (
      <div className="mx-auto flex max-w-[960px] flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-semibold tracking-normal">地铁资源经营技能库</h1>
        <p className="mt-3 text-base text-black/60">登录后即可浏览和安装地铁资源经营行业技能</p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            to="/login"
            className="skillhub-capsule-button"
          >
            立即登录
          </Link>
          <Link
            to="/pricing"
            className="skillhub-ghost-button"
          >
            查看方案
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-10 md:px-10">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-normal md:text-5xl">全部技能</h1>
          <p className="mt-3 text-sm leading-6 text-black/60">
            地铁资源经营行业技能库，按分类浏览和安装
          </p>
        </div>
        {isAdmin && (
          <Link to="/admin/create" className="skillhub-capsule-button w-full md:w-auto">
            <UploadCloud className="h-4 w-4" />
            发布 Skill
          </Link>
        )}
      </div>

      {/* 搜索 + 分类 + 排序 */}
      <SkillSearchBar
        search={search}
        onSearchChange={setSearch}
        sortBy={sortBy}
        onSortChange={setSortBy}
        selectedCategory={category}
        onCategoryChange={setCategory}
        categories={CATEGORIES}
        className="mt-8"
      />

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <button onClick={() => window.location.reload()} className="ml-2 underline">
            重试
          </button>
        </div>
      )}

      {/* CLI 快速安装提示 */}
      {!loading && skills.length > 0 && (
        <div className="mt-8 flex flex-col gap-3 rounded-[24px] border border-black/[0.06] bg-secondary px-5 py-4 md:flex-row md:items-center">
          <code className="rounded-full bg-white px-4 py-2 font-mono text-xs font-medium text-skillhub-blue">
            npx mclaw-skills add mclaw/&lt;技能名&gt;
          </code>
          <span className="text-sm text-black/55">
            MClaw 平台官方技能；第三方技能用 Git 格式: npx mclaw-skills add user/repo
          </span>
        </div>
      )}

      {/* 技能列表 */}
      <div className="mt-8">
        <SkillList skills={skills} loading={loading} />
      </div>

      {/* 加载更多 */}
      {hasMore && !loading && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-medium transition-colors hover:bg-secondary"
          >
            加载更多
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 结果计数 */}
      {!loading && skills.length > 0 && (
        <p className="mt-6 text-center text-xs text-black/45">
          共 {skills.length} 个技能
        </p>
      )}
    </div>
  );
}
