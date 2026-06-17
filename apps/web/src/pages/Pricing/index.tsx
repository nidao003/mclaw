import { Link } from 'react-router-dom';
import { Download, Check } from 'lucide-react';

// 地铁资源经营行业化定价 — 3档：基础版/专业版/企业版
const PRICING_PLANS = [
  {
    key: 'basic',
    name: '基础版',
    subtitle: '适合个人用户或行业从业者体验 MClaw 的基础能力',
    price: '免费',
    period: '',
    features: [
      'Mac / Windows 桌面端使用',
      '基础行业知识查询',
      '基础技能使用',
      '常用报告和方案生成',
      '技能热榜浏览',
      '全部技能浏览',
    ],
    audience: ['行业从业者', '研究人员', '个人学习用户', '轻量使用用户'],
    cta: '免费开始',
    ctaStyle: 'skillhub-ghost-button',
    highlighted: false,
  },
  {
    key: 'pro',
    name: '专业版',
    subtitle: '适合业务团队和专业用户，使用更多行业技能和专家能力',
    price: '¥199',
    period: '/月',
    features: [
      '基础版全部能力',
      '更多专业技能使用',
      '专家服务调用',
      '数据分析辅助',
      '车站画像分析',
      '经营架构设计',
      '报告方案生成',
      '更高使用额度',
    ],
    audience: ['地铁业主单位相关人员', '媒体经营团队', '商业招商团队', '生活圈运营团队', '行业研究团队', '经营管理人员'],
    cta: '立即订阅',
    ctaStyle: 'skillhub-capsule-button',
    highlighted: true,
  },
  {
    key: 'enterprise',
    name: '企业版',
    subtitle: '适合需要系统连接、专属技能、专家配置和企业级服务的客户',
    price: '联系我们',
    period: '',
    features: [
      '专业版全部能力',
      'Union 等数字化经营系统连接',
      '企业数据分析支持',
      '专属技能配置',
      '专家服务配置',
      '企业知识库接入',
      '权限管理',
      '私有化或专属部署支持',
      '企业服务与技术支持',
    ],
    audience: ['已建设数字化经营系统的企业客户', '地铁业主单位', '地铁资源经营公司', '媒体运营公司', '商业运营公司', '需要定制化服务的组织'],
    cta: '联系销售',
    ctaStyle: 'skillhub-ghost-button',
    highlighted: false,
  },
] as const;

export default function Pricing() {
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-16 md:px-10">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-semibold tracking-normal md:text-5xl">
          选择适合你的 MClaw 服务
        </h1>
        <p className="mt-4 text-base text-black/60">
          面向不同用户和组织的服务版本，满足个人体验、专业使用和企业级应用需求
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <div
            key={plan.key}
            className={`rounded-[28px] border p-8 transition-all duration-200 ${
              plan.highlighted
                ? 'border-skillhub-blue bg-[#F7F8FF] shadow-lg shadow-skillhub-blue/5'
                : 'border-black/[0.06] bg-white'
            }`}
          >
            {plan.highlighted && (
              <span className="inline-flex rounded-full bg-skillhub-blue px-3 py-0.5 text-2xs font-medium text-white">
                推荐
              </span>
            )}
            <h2 className="mt-3 font-display text-2xl font-semibold">{plan.name}</h2>
            <p className="mt-2 text-sm leading-6 text-black/55">{plan.subtitle}</p>

            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-display text-4xl font-semibold">{plan.price}</span>
              {plan.period && <span className="text-sm text-black/45">{plan.period}</span>}
            </div>

            <ul className="mt-6 grid gap-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-black/70">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-skillhub-blue" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <p className="text-xs text-black/45">适用对象：</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {plan.audience.map((a) => (
                  <span key={a} className="rounded-full bg-secondary px-2 py-0.5 text-2xs text-black/55">
                    {a}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6">
              {plan.key === 'enterprise' ? (
                <a href="mailto:sales@mclaw.dev" className={plan.ctaStyle + ' w-full justify-center'}>
                  {plan.cta}
                </a>
              ) : (
                <Link to="/login" className={plan.ctaStyle + ' w-full justify-center'}>
                  {plan.cta}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-black/45">
        当前支持 Mac 和 Windows 桌面端 · 暂不提供手机端
      </div>
    </div>
  );
}
