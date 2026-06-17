import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Search, Zap, Globe, MapPin, BarChart3, Network, Landmark, Megaphone, Store, Coffee, FileText, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

// 12个地铁行业技能分类
const TRENDING_CATEGORIES = [
  { key: 'industry-knowledge', label: '行业知识', icon: Search },
  { key: 'frontier-concepts', label: '前沿理念', icon: TrendingUp },
  { key: 'national-metro', label: '全国地铁', icon: Globe },
  { key: 'station-portrait', label: '车站画像', icon: MapPin },
  { key: 'data-analysis', label: '数据分析', icon: BarChart3 },
  { key: 'business-architecture', label: '经营架构', icon: Network },
  { key: 'resource-management', label: '资源经营', icon: Landmark },
  { key: 'advertising', label: '广告经营', icon: Megaphone },
  { key: 'commercial-leasing', label: '商业招商', icon: Store },
  { key: 'lifestyle-operation', label: '生活圈运营', icon: Coffee },
  { key: 'report-generation', label: '报告生成', icon: FileText },
  { key: 'system-connection', label: '系统连接', icon: Database },
] as const;

// 12个热门技能 — slug 关联数据库 skill_id，点击可进入详情
const TRENDING_SKILLS = [
  { slug: 'industry-knowledge', name: '地铁资源经营知识问答', category: '行业知识', desc: '查询地铁资源经营、非票务收入、站点商业、广告经营、招商运营等行业知识。' },
  { slug: 'frontier-concepts', name: '前沿经营理念解读', category: '前沿理念', desc: '学习国内外地铁商业、资源经营、生活圈运营和城市轨道交通经营模式。' },
  { slug: 'national-metro', name: '全国地铁情况分析', category: '全国地铁', desc: '分析全国地铁城市、线路、站点、客流、商业资源和行业发展情况。' },
  { slug: 'station-portrait', name: '车站画像生成', category: '车站画像', desc: '基于城市、线路、站点、商圈、客群和资源信息，生成车站画像和价值判断。' },
  { slug: 'business-architecture', name: '经营架构设计', category: '经营架构', desc: '辅助设计资源经营体系、组织架构、业务流程、指标体系和产品方案。' },
  { slug: 'data-analysis', name: '数据分析辅助', category: '数据分析', desc: '分析公开数据、上传数据或企业经营数据，生成结论、建议和报告。' },
  { slug: 'resource-management', name: '资源价值评估', category: '资源经营', desc: '评估地铁广告位、商铺、空间、场景和站点资源的经营价值。' },
  { slug: 'advertising', name: '广告方案生成', category: '广告经营', desc: '根据品牌目标、投放需求和资源情况，生成地铁广告投放方案。' },
  { slug: 'commercial-leasing', name: '商业招商辅助', category: '商业招商', desc: '辅助商铺业态判断、品牌匹配、租金参考、招商话术和招商方案生成。' },
  { slug: 'lifestyle-operation', name: '生活圈活动策划', category: '生活圈运营', desc: '围绕地铁生活圈场景，生成活动策划、商户联动和运营复盘方案。' },
  { slug: 'report-generation', name: '经营报告生成', category: '报告生成', desc: '快速生成日报、周报、月报、专题分析、经营复盘和管理汇报材料。' },
  { slug: 'system-connection', name: '系统数据查询', category: '系统连接', desc: '面向已接入系统客户，辅助查询 Union、地铁生活圈、媒体商城、站点画像和经营数据。' },
];

// 技能热榜页
export default function SkillsTrending() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const filteredSkills = selectedCategory
    ? TRENDING_SKILLS.filter((s) => s.category === selectedCategory)
    : TRENDING_SKILLS;

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-16 md:px-10">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-semibold tracking-normal md:text-5xl">
          技能热榜
        </h1>
        <p className="mt-4 text-base leading-7 text-black/60">
          发现当前最受欢迎的地铁资源经营技能。MClaw 的技能围绕地铁资源经营行业构建，覆盖行业知识、前沿理念、全国地铁、车站画像、数据分析、经营架构、资源经营、广告经营、商业招商、生活圈运营、报告生成和系统连接等方向。
        </p>
      </div>

      {/* 分类胶囊（带选中态） */}
      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {TRENDING_CATEGORIES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(selectedCategory === label ? null : label)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors',
              selectedCategory === label
                ? 'border-skillhub-blue bg-skillhub-blue text-white'
                : 'border-black/[0.06] bg-white hover:bg-secondary hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* 热门技能列表 — 点击进入详情 */}
      <div className="mt-10 grid gap-3">
        {filteredSkills.map((skill, idx) => (
          <Link
            key={skill.slug}
            to={`/skills/${skill.slug}`}
            className="flex items-start gap-4 rounded-[24px] border border-black/[0.06] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary font-display text-sm font-semibold text-black/45">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-semibold">{skill.name}</h3>
                <span className="rounded-full bg-skillhub-blue/10 px-2.5 py-0.5 text-2xs font-medium text-skillhub-blue">
                  {skill.category}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-6 text-black/60">{skill.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link to="/skills" className="skillhub-capsule-button">
          浏览全部技能
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
