import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@shared';

// 我的技能页 — Publisher+ 用户查看自己发布的技能
export default function MySkills() {
  const user = useAuthStore((s) => s.user);
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/v1/skills?author_id=${user.id}&limit=50`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setSkills(data.data?.skills || []))
      .catch(() => setSkills([]))
      .finally(() => setLoading(false));
  }, [user]);

  const stats = {
    total: skills.length,
    published: skills.filter((s: any) => s.status === 'published').length,
    draft: skills.filter((s: any) => s.status === 'draft').length,
  };

  const statusLabel: Record<string, string> = {
    draft: '草稿',
    pending_review: '待审核',
    published: '已发布',
    archived: '已归档',
    disabled: '已停用',
    rejected: '已拒绝',
  };

  const statusColor: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    pending_review: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-gray-100 text-gray-500',
    disabled: 'bg-red-100 text-red-600',
    rejected: 'bg-red-50 text-red-500',
  };

  // 未登录提示
  if (!user) {
    return (
      <div className="mx-auto flex max-w-[720px] flex-col items-center px-4 py-24 text-center">
        <Package className="h-10 w-10 text-black/30" />
        <h1 className="mt-4 font-display text-3xl font-semibold">请先登录</h1>
        <p className="mt-3 text-sm text-black/55">查看我的技能需要登录。</p>
        <Link to="/login" className="skillhub-capsule-button mt-6">
          去登录
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div className="py-8 text-skillhub-ink/40">加载中...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: '全部技能', value: stats.total, icon: Package },
          { label: '已发布', value: stats.published, icon: ExternalLink },
          { label: '草稿', value: stats.draft, icon: Plus },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white border border-skillhub-line rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Icon className="w-5 h-5 text-skillhub-ink/40" />
              <span className="text-sm text-skillhub-ink/50">{label}</span>
            </div>
            <div className="text-3xl font-bold text-skillhub-ink">{value}</div>
          </div>
        ))}
      </div>

      {/* 技能列表 */}
      <div className="bg-white border border-skillhub-line rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-skillhub-line flex items-center justify-between">
          <h2 className="text-lg font-semibold text-skillhub-ink">技能列表</h2>
          <Link
            to="/settings/upload"
            className="flex items-center gap-2 px-4 py-2 bg-skillhub-blue text-white rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            上传新技能
          </Link>
        </div>

        {skills.length === 0 ? (
          <div className="p-16 text-center">
            <Package className="w-12 h-12 text-skillhub-ink/20 mx-auto mb-4" />
            <p className="text-skillhub-ink/50 mb-4">还没有上传任何技能</p>
            <Link
              to="/settings/upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-skillhub-blue text-white rounded-xl font-medium"
            >
              <Plus className="w-4 h-4" /> 上传第一个技能
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-skillhub-soft border-b border-skillhub-line">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">技能</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">Slug</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">状态</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-skillhub-ink/50 uppercase">安装</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((skill: any) => (
                <tr key={skill.id} className="border-b border-skillhub-line hover:bg-skillhub-soft/50">
                  <td className="px-6 py-4">
                    <Link to={`/skills/${skill.skill_id}`} className="font-medium text-skillhub-ink hover:text-skillhub-blue">
                      {skill.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-skillhub-ink/50 font-mono">{skill.skill_id}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[skill.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel[skill.status] || skill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-skillhub-ink/50">
                    {(skill.install_count || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
