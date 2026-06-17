import { Link } from 'react-router-dom';
import {
  Download,
  ArrowRight,
  Search,
  TrendingUp,
  Globe,
  MapPin,
  BarChart3,
  Network,
  Landmark,
  Megaphone,
  Store,
  Coffee,
  FileText,
  Database,
  Building2,
  Users,
  Briefcase,
  BarChart2,
  GraduationCap,
  Crown,
  Sparkles,
  Zap,
  Link2,
  Unplug,
} from 'lucide-react';
import { AnimatedContent, BlurText, CountUp, GradientText, StarBorder } from '@/components/animations';

// ─── §1 Hero ─────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative mx-auto max-w-[960px] px-4 pb-14 pt-20 text-center md:px-[52px] md:pb-20 md:pt-[140px]">
      <AnimatedContent duration={0.7} delay={0}>
        <h1 className="font-display text-[34px] font-semibold leading-[1.05] tracking-normal sm:text-[44px] md:text-[58px]">
          <span className="text-brand">MClaw</span>
          {'｜'}专为地铁资源经营打造的 AI 平台
        </h1>
      </AnimatedContent>

      <AnimatedContent duration={0.7} delay={0.15}>
        <p className="mx-auto mt-5 max-w-2xl text-sm font-light leading-7 text-black/60 md:text-base">
          整合行业知识、经营方法、地铁数据、车站画像、专业技能与专家服务，帮助用户更高效地完成行业研究、经营分析、体系设计、方案生成和业务决策。
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-black/55">
          支持独立使用，也可连接 Union 数字化经营系统，进一步基于企业真实数据开展深度分析和业务协同。
        </p>
      </AnimatedContent>

      <AnimatedContent duration={0.6} delay={0.3}>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <StarBorder
            as="a"
            href="https://mclaw.dev/download/mclaw-latest.dmg"
            color="#3957FF"
            speed="5s"
            innerClassName="bg-skillhub-black px-5 py-3 text-sm font-medium text-white inline-flex items-center justify-center gap-2 hover:bg-[#383838] transition-colors"
            className="hover:shadow-lg transition-shadow"
          >
            <Download className="h-4 w-4" />
            下载 Mac 版
          </StarBorder>
          <a href="https://mclaw.dev/download/mclaw-latest.exe" className="skillhub-ghost-button">
            <Download className="h-4 w-4" />
            下载 Windows 版
          </a>
        </div>
        <Link
          to="/skills/trending"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-skillhub-blue hover:underline"
        >
          查看技能热榜
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </AnimatedContent>
    </section>
  );
}

// ─── §1.5 统计区 ──────────────────────────────────────────
function StatsSection() {
  const stats = [
    { to: 128, label: '行业技能', suffix: '+' },
    { to: 36, label: '领域专家', suffix: '+' },
    { to: 9, label: '经营方向', suffix: '' },
  ];
  return (
    <section className="mx-auto max-w-[960px] px-4 pb-10 md:px-10">
      <AnimatedContent>
        <div className="grid grid-cols-3 gap-4 rounded-[24px] border border-black/[0.06] bg-white p-8">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <div className="font-display text-3xl font-semibold text-foreground md:text-4xl">
                <CountUp to={s.to} duration={2} />
                {s.suffix}
              </div>
              <div className="mt-1 text-xs text-black/50 md:text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </AnimatedContent>
    </section>
  );
}

// ─── §2 价值主张 ──────────────────────────────────────────
function ValuePropSection() {
  return (
    <section className="bg-secondary/50">
      <div className="mx-auto max-w-[960px] px-4 py-20 md:px-10">
        <AnimatedContent>
          <h2 className="text-center font-display text-3xl font-semibold md:text-4xl">
            <BlurText text="不是通用 AI，而是更懂地铁资源经营" delay={60} stepDuration={0.3} className="justify-center" />
          </h2>
        </AnimatedContent>
        <AnimatedContent delay={0.1}>
          <p className="mx-auto mt-5 max-w-2xl text-center text-sm leading-7 text-black/60 md:text-base">
            通用 AI 可以回答问题，但不一定理解地铁资源经营的业务场景。
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-7 text-black/60 md:text-base">
            MClaw 围绕地铁行业的真实经营问题进行设计，覆盖地铁商业、媒体广告、资源管理、车站画像、非票务收入、生活圈运营、招商经营、行业研究和经营体系设计等方向。
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm font-medium leading-7 text-foreground md:text-base">
            它服务的是地铁资源经营行业的从业者，而不是泛办公、泛娱乐或通用问答场景。
          </p>
        </AnimatedContent>
      </div>
    </section>
  );
}

// ─── §3 独立使用 ──────────────────────────────────────────
const STANDALONE_CAPABILITIES = [
  { icon: Search, text: '查询地铁资源经营、非票务收入、车站商业、媒体经营等行业知识' },
  { icon: TrendingUp, text: '学习国内外地铁商业、资源经营和生活圈运营的先进理念' },
  { icon: Globe, text: '分析全国地铁城市、线路、站点、客流和商业发展情况' },
  { icon: MapPin, text: '生成车站画像、商圈分析、资源价值判断和经营建议' },
  { icon: Network, text: '辅助设计经营架构、业务流程、指标体系和产品方案' },
  { icon: FileText, text: '生成行业研究报告、经营分析报告、招商材料和汇报方案' },
];

function StandaloneSection() {
  return (
    <section className="mx-auto max-w-[1180px] px-4 py-20 md:px-10">
      <div className="md:flex md:items-start md:gap-16">
        <AnimatedContent className="md:flex-1" direction="horizontal" distance={40}>
          <div className="inline-flex items-center gap-2 rounded-full bg-skillhub-blue/10 px-3 py-1 text-xs font-medium text-skillhub-blue">
            <Unplug className="h-3.5 w-3.5" />
            开箱即用
          </div>
          <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">
            不连接 Union 数字化经营系统，也能使用
          </h2>
          <p className="mt-2 text-base leading-7 text-black/60">
            行业知识、数据分析和经营设计，开箱即用
          </p>
          <p className="mt-4 text-sm leading-7 text-black/55">
            即使不连接 Union 数字化经营系统，MClaw 也可以作为地铁资源经营行业的 AI 平台使用。
          </p>
        </AnimatedContent>
        <AnimatedContent className="mt-8 md:mt-0 md:flex-1" delay={0.15}>
          <ul className="grid gap-4">
            {STANDALONE_CAPABILITIES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-skillhub-blue/10 text-skillhub-blue">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm leading-6 text-black/70">{text}</span>
              </li>
            ))}
          </ul>
        </AnimatedContent>
      </div>
    </section>
  );
}

// ─── §4 系统连接 ──────────────────────────────────────────
const SYSTEM_CONNECTIONS = [
  { icon: Database, name: 'Union 数字化经营系统', desc: '连接企业经营数据，开展深度分析' },
  { icon: Coffee, name: '地铁生活圈', desc: '接入生活圈运营数据，优化活动策划' },
  { icon: Megaphone, name: '媒体商城', desc: '连接媒体资源数据，辅助广告经营' },
  { icon: MapPin, name: '站点画像系统', desc: '接入站点数据，生成精准画像' },
  { icon: Store, name: '商业资源系统', desc: '连接商业资源数据，辅助招商决策' },
  { icon: BarChart3, name: '经营数据系统', desc: '接入经营数据，支持复盘分析' },
];

function SystemConnectSection() {
  return (
    <section className="bg-secondary/50">
      <div className="mx-auto max-w-[1180px] px-4 py-20 md:px-10">
        <AnimatedContent>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-skillhub-blue/10 px-3 py-1 text-xs font-medium text-skillhub-blue">
              <Link2 className="h-3.5 w-3.5" />
              增强能力
            </div>
            <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">
              连接 Union 数字化经营系统后，更深入
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-base leading-7 text-black/60">
              连接 Union 数字化经营系统，释放企业数据价值
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-black/55">
              对于已经建设 Union 或其他数字化经营系统的客户，MClaw 可以进一步连接企业业务数据，让 AI 基于真实经营数据开展分析和输出。
            </p>
          </div>
        </AnimatedContent>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SYSTEM_CONNECTIONS.map(({ icon: Icon, name, desc }, i) => (
            <AnimatedContent key={name} delay={i * 0.08} duration={0.5}>
              <div className="rounded-[24px] border border-black/[0.06] bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-skillhub-blue/10 text-skillhub-blue">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold">{name}</h3>
                <p className="mt-1.5 text-sm leading-6 text-black/55">{desc}</p>
              </div>
            </AnimatedContent>
          ))}
        </div>

        <AnimatedContent delay={0.1}>
          <p className="mt-8 text-center text-sm text-black/45">
            连接 Union 数字化经营系统不是使用 MClaw 的前提，而是企业客户的增强能力。
          </p>
        </AnimatedContent>
      </div>
    </section>
  );
}

// ─── §5 技能与专家 ────────────────────────────────────────
function SkillsExpertsSection() {
  return (
    <section className="mx-auto max-w-[1180px] px-4 py-20 md:px-10">
      <AnimatedContent>
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-skillhub-blue/10 px-3 py-1 text-xs font-medium text-skillhub-blue">
            <Sparkles className="h-3.5 w-3.5" />
            能力沉淀
          </div>
          <h2 className="mt-4 font-display text-3xl font-semibold md:text-4xl">
            <GradientText preset="blue" animationSpeed={6}>
              把行业能力做成技能和专家服务
            </GradientText>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-black/60">
            MClaw 将地铁资源经营中的行业知识、经营方法、数据分析能力和专家经验，沉淀为可直接使用的技能与专家服务。用户可以通过专家获得专业判断，也可以通过技能快速完成具体任务。
          </p>
        </div>
      </AnimatedContent>

      <AnimatedContent delay={0.15}>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/experts" className="skillhub-capsule-button">
            <Users className="h-4 w-4" />
            查看专家
          </Link>
          <Link to="/skills/trending" className="skillhub-ghost-button">
            <TrendingUp className="h-4 w-4" />
            查看技能热榜
          </Link>
          <Link to="/skills" className="skillhub-ghost-button">
            <Zap className="h-4 w-4" />
            浏览全部技能
          </Link>
        </div>
      </AnimatedContent>
    </section>
  );
}

// ─── §6 适合谁使用 ────────────────────────────────────────
const TARGET_USERS = [
  {
    icon: Building2,
    title: '地铁业主单位',
    desc: '用于学习先进经营理念，设计资源经营体系，分析资源价值，辅助经营决策和管理汇报。',
  },
  {
    icon: Megaphone,
    title: '媒体经营公司',
    desc: '用于分析媒体资源价值，设计广告产品，生成客户方案，辅助投放建议和经营复盘。',
  },
  {
    icon: Store,
    title: '商业招商团队',
    desc: '用于学习业态规划方法，辅助招商定位、品牌匹配、租金判断和招商材料生成。',
  },
  {
    icon: Coffee,
    title: '生活圈运营团队',
    desc: '用于获取运营方法、活动策划、商户联动、用户分析和复盘建议。',
  },
  {
    icon: GraduationCap,
    title: '行业研究人员',
    desc: '用于查询全国地铁数据、行业趋势、标杆案例、先进经营理念和城市对比分析。',
  },
  {
    icon: Crown,
    title: '经营管理层',
    desc: '用于快速获得经营架构、分析结论、专题报告和管理汇报材料。',
  },
];

function TargetUsersSection() {
  return (
    <section className="bg-secondary/50">
      <div className="mx-auto max-w-[1180px] px-4 py-20 md:px-10">
        <AnimatedContent>
          <div className="text-center">
            <h2 className="font-display text-3xl font-semibold md:text-4xl">
              适合谁使用
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-black/60">
              MClaw 面向地铁资源经营行业的相关人员和机构，帮助不同角色提升行业认知、分析判断、方案设计和业务执行效率。
            </p>
          </div>
        </AnimatedContent>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TARGET_USERS.map(({ icon: Icon, title, desc }, i) => (
            <AnimatedContent key={title} delay={i * 0.08} duration={0.5}>
              <div className="rounded-[24px] border border-black/[0.06] bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-skillhub-blue/10 text-skillhub-blue">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-black/55">{desc}</p>
              </div>
            </AnimatedContent>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── §7 开始使用 CTA ─────────────────────────────────────
function CTASection() {
  return (
    <section className="mx-auto max-w-[960px] px-4 py-20 text-center md:px-10">
      <AnimatedContent>
        <h2 className="font-display text-3xl font-semibold md:text-4xl">
          开始使用 MClaw
        </h2>
        <p className="mt-4 text-base text-black/60">
          当前支持 Mac 和 Windows 桌面端。
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <StarBorder
            as="a"
            href="https://mclaw.dev/download/mclaw-latest.dmg"
            color="#3957FF"
            speed="5s"
            innerClassName="bg-skillhub-black px-5 py-3 text-sm font-medium text-white inline-flex items-center justify-center gap-2 hover:bg-[#383838] transition-colors"
            className="hover:shadow-lg transition-shadow"
          >
            <Download className="h-4 w-4" />
            下载 Mac 版
          </StarBorder>
          <a href="https://mclaw.dev/download/mclaw-latest.exe" className="skillhub-ghost-button">
            <Download className="h-4 w-4" />
            下载 Windows 版
          </a>
        </div>
        <Link
          to="/pricing"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-skillhub-blue hover:underline"
        >
          查看定价
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </AnimatedContent>
    </section>
  );
}

// ─── 首页主组件 ───────────────────────────────────────────
export default function Home() {
  return (
    <div className="overflow-hidden">
      <HeroSection />
      <StatsSection />
      <ValuePropSection />
      <StandaloneSection />
      <SystemConnectSection />
      <SkillsExpertsSection />
      <TargetUsersSection />
      <CTASection />
    </div>
  );
}
