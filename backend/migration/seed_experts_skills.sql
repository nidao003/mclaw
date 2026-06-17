-- MClaw 种子数据：10个专家 + 12个新技能 + 2个已有技能重分类
-- 执行环境：PostgreSQL 17, 数据库 mclaw

-- =============================================
-- 1. 重分类已有2个技能的 categories
-- =============================================
UPDATE skills SET categories = '["报告生成"]'::jsonb, updated_at = NOW() WHERE skill_id = 'mckinsey-visual';
UPDATE skills SET categories = '["报告生成"]'::jsonb, updated_at = NOW() WHERE skill_id = 'chinese-official-word-style';

-- =============================================
-- 2. 插入10个专家
-- =============================================
INSERT INTO experts (id, slug, name, subtitle, description, icon, scenarios, related_skills, status, sort_order, created_at, updated_at) VALUES
('a0000001-0000-0000-0000-000000000001', 'industry-research', '行业研究专家',
 '解读全国地铁发展、行业趋势、标杆案例和先进经营理念，帮助用户快速理解地铁资源经营行业的整体情况和发展方向。',
 '解读全国地铁发展、行业趋势、标杆案例和先进经营理念，帮助用户快速理解地铁资源经营行业的整体情况和发展方向。',
 'TrendingUp',
 '["全国地铁发展情况分析","地铁非票务收入研究","国内外标杆案例解读","地铁商业与资源经营趋势分析","城市轨道交通经营模式研究"]'::jsonb,
 '["industry-knowledge","frontier-concepts","national-metro"]'::jsonb,
 'published', 1, NOW(), NOW()),

('a0000001-0000-0000-0000-000000000002', 'business-architecture', '经营架构专家',
 '辅助设计地铁资源经营体系、组织架构、业务流程、指标体系和产品方案，帮助用户从顶层视角梳理经营模式。',
 '辅助设计地铁资源经营体系、组织架构、业务流程、指标体系和产品方案，帮助用户从顶层视角梳理经营模式。',
 'Network',
 '["地铁资源经营体系设计","非票务收入业务架构设计","组织架构和岗位职责梳理","经营指标体系设计","数字化经营平台方案设计"]'::jsonb,
 '["business-architecture","report-generation"]'::jsonb,
 'published', 2, NOW(), NOW()),

('a0000001-0000-0000-0000-000000000003', 'data-analysis', '数据分析专家',
 '分析公开数据、上传数据和企业经营数据，形成结论、建议和报告，帮助用户从数据中发现问题和机会。',
 '分析公开数据、上传数据和企业经营数据，形成结论、建议和报告，帮助用户从数据中发现问题和机会。',
 'BarChart3',
 '["经营数据分析","客流与资源价值分析","城市与线路对比分析","经营指标解读","数据报告生成"]'::jsonb,
 '["data-analysis","station-portrait","national-metro"]'::jsonb,
 'published', 3, NOW(), NOW()),

('a0000001-0000-0000-0000-000000000004', 'station-portrait', '车站画像专家',
 '分析城市、线路、车站、商圈、客群和资源价值，帮助用户理解车站的经营潜力和商业特征。',
 '分析城市、线路、车站、商圈、客群和资源价值，帮助用户理解车站的经营潜力和商业特征。',
 'MapPin',
 '["车站画像生成","商圈和客群分析","站点资源价值判断","车站商业机会识别","线路和站点对比分析"]'::jsonb,
 '["station-portrait","data-analysis","resource-management"]'::jsonb,
 'published', 4, NOW(), NOW()),

('a0000001-0000-0000-0000-000000000005', 'resource-management', '资源经营专家',
 '辅助判断资源价值、经营模式、收益路径和提升策略，帮助用户更好地盘活地铁空间、媒体、商铺和场景资源。',
 '辅助判断资源价值、经营模式、收益路径和提升策略，帮助用户更好地盘活地铁空间、媒体、商铺和场景资源。',
 'Landmark',
 '["地铁资源价值评估","资源经营策略设计","收益提升路径分析","资源组合建议","经营问题诊断"]'::jsonb,
 '["resource-management","advertising","commercial-leasing"]'::jsonb,
 'published', 5, NOW(), NOW()),

('a0000001-0000-0000-0000-000000000006', 'advertising', '广告经营专家',
 '辅助媒体资源经营、广告产品设计、资源推荐、客户方案和投放复盘，提升广告经营效率。',
 '辅助媒体资源经营、广告产品设计、资源推荐、客户方案和投放复盘，提升广告经营效率。',
 'Megaphone',
 '["地铁媒体资源分析","广告产品设计","品牌投放方案生成","媒体资源组合推荐","投放复盘和客户汇报"]'::jsonb,
 '["advertising","resource-management","report-generation"]'::jsonb,
 'published', 6, NOW(), NOW()),

('a0000001-0000-0000-0000-000000000007', 'commercial-leasing', '商业招商专家',
 '辅助业态规划、品牌招商、租金判断、招商话术和招商材料生成，提升商铺和商业资源招商效率。',
 '辅助业态规划、品牌招商、租金判断、招商话术和招商材料生成，提升商铺和商业资源招商效率。',
 'Store',
 '["商铺业态判断","品牌匹配建议","招商方案生成","租金参考分析","招商话术和材料生成"]'::jsonb,
 '["commercial-leasing","resource-management","report-generation"]'::jsonb,
 'published', 7, NOW(), NOW()),

('a0000001-0000-0000-0000-000000000008', 'lifestyle-operation', '生活圈运营专家',
 '辅助活动策划、商户联动、用户运营、内容运营和运营复盘，帮助提升地铁生活圈运营效果。',
 '辅助活动策划、商户联动、用户运营、内容运营和运营复盘，帮助提升地铁生活圈运营效果。',
 'Coffee',
 '["生活圈活动策划","商户联动方案设计","用户运营策略","内容运营建议","活动复盘分析"]'::jsonb,
 '["lifestyle-operation","system-connection"]'::jsonb,
 'published', 8, NOW(), NOW()),

('a0000001-0000-0000-0000-000000000009', 'report-generation', '报告生成专家',
 '生成行业研究报告、经营分析报告、管理汇报、项目方案和专题材料，帮助用户提高材料输出效率。',
 '生成行业研究报告、经营分析报告、管理汇报、项目方案和专题材料，帮助用户提高材料输出效率。',
 'FileText',
 '["行业研究报告","经营分析报告","项目汇报材料","招商方案材料","广告客户提案","管理层汇报"]'::jsonb,
 '["report-generation","data-analysis","business-architecture"]'::jsonb,
 'published', 9, NOW(), NOW()),

('a0000001-0000-0000-0000-000000000010', 'system-data', '系统数据专家',
 '面向已接入 Union3.0 或其他数字化经营系统的客户，辅助业务数据查询、经营分析、复盘报告和管理决策。',
 '面向已接入 Union3.0 或其他数字化经营系统的客户，辅助业务数据查询、经营分析、复盘报告和管理决策。',
 'Database',
 '["Union3.0 数据查询","地铁生活圈运营分析","媒体商城资源分析","站点画像数据分析","商业资源经营分析","企业经营数据复盘"]'::jsonb,
 '["system-connection","data-analysis","station-portrait"]'::jsonb,
 'published', 10, NOW(), NOW())

ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- 3. 插入12个地铁行业技能
-- =============================================
INSERT INTO skills (id, author_id, name, skill_id, description, categories, tags, icon, content, status, install_count, rating_avg, rating_count, created_at, updated_at) VALUES
('b0000001-0000-0000-0000-000000000001', 'ff3f33a2-fd07-4523-b22a-dc78bbc883e8'::uuid,
 '地铁资源经营知识问答', 'industry-knowledge',
 '查询地铁资源经营、非票务收入、站点商业、广告经营、招商运营等行业知识。',
 '["行业知识"]'::jsonb, '["地铁","资源经营","知识问答"]'::jsonb, 'Search',
 '地铁资源经营行业知识问答技能，覆盖地铁商业、媒体广告、资源管理、车站画像、非票务收入、生活圈运营、招商经营等方向。',
 'published', 0, 0, 0, NOW(), NOW()),

('b0000001-0000-0000-0000-000000000002', 'ff3f33a2-fd07-4523-b22a-dc78bbc883e8'::uuid,
 '前沿经营理念解读', 'frontier-concepts',
 '学习国内外地铁商业、资源经营、生活圈运营和城市轨道交通经营模式。',
 '["前沿理念"]'::jsonb, '["前沿理念","经营模式","行业趋势"]'::jsonb, 'TrendingUp',
 '解读国内外地铁商业、资源经营和生活圈运营的先进理念，学习城市轨道交通经营模式。',
 'published', 0, 0, 0, NOW(), NOW()),

('b0000001-0000-0000-0000-000000000003', 'ff3f33a2-fd07-4523-b22a-dc78bbc883e8'::uuid,
 '全国地铁情况分析', 'national-metro',
 '分析全国地铁城市、线路、站点、客流、商业资源和行业发展情况。',
 '["全国地铁"]'::jsonb, '["全国地铁","城市分析","客流数据"]'::jsonb, 'Globe',
 '分析全国地铁城市、线路、站点、客流、商业资源和行业发展情况。',
 'published', 0, 0, 0, NOW(), NOW()),

('b0000001-0000-0000-0000-000000000004', 'ff3f33a2-fd07-4523-b22a-dc78bbc883e8'::uuid,
 '车站画像生成', 'station-portrait',
 '基于城市、线路、站点、商圈、客群和资源信息，生成车站画像和价值判断。',
 '["车站画像"]'::jsonb, '["车站画像","商圈分析","资源价值"]'::jsonb, 'MapPin',
 '基于城市、线路、站点、商圈、客群和资源信息，生成车站画像和价值判断。',
 'published', 0, 0, 0, NOW(), NOW()),

('b0000001-0000-0000-0000-000000000005', 'ff3f33a2-fd07-4523-b22a-dc78bbc883e8'::uuid,
 '经营架构设计', 'business-architecture',
 '辅助设计资源经营体系、组织架构、业务流程、指标体系和产品方案。',
 '["经营架构"]'::jsonb, '["经营架构","体系设计","业务流程"]'::jsonb, 'Network',
 '辅助设计资源经营体系、组织架构、业务流程、指标体系和产品方案。',
 'published', 0, 0, 0, NOW(), NOW()),

('b0000001-0000-0000-0000-000000000006', 'ff3f33a2-fd07-4523-b22a-dc78bbc883e8'::uuid,
 '数据分析辅助', 'data-analysis',
 '分析公开数据、上传数据或企业经营数据，生成结论、建议和报告。',
 '["数据分析"]'::jsonb, '["数据分析","数据报告","经营分析"]'::jsonb, 'BarChart3',
 '分析公开数据、上传数据或企业经营数据，生成结论、建议和报告。',
 'published', 0, 0, 0, NOW(), NOW()),

('b0000001-0000-0000-0000-000000000007', 'ff3f33a2-fd07-4523-b22a-dc78bbc883e8'::uuid,
 '资源价值评估', 'resource-management',
 '评估地铁广告位、商铺、空间、场景和站点资源的经营价值。',
 '["资源经营"]'::jsonb, '["资源评估","价值判断","经营策略"]'::jsonb, 'Landmark',
 '评估地铁广告位、商铺、空间、场景和站点资源的经营价值。',
 'published', 0, 0, 0, NOW(), NOW()),

('b0000001-0000-0000-0000-000000000008', 'ff3f33a2-fd07-4523-b22a-dc78bbc883e8'::uuid,
 '广告方案生成', 'advertising',
 '根据品牌目标、投放需求和资源情况，生成地铁广告投放方案。',
 '["广告经营"]'::jsonb, '["广告方案","媒体经营","投放策略"]'::jsonb, 'Megaphone',
 '根据品牌目标、投放需求和资源情况，生成地铁广告投放方案。',
 'published', 0, 0, 0, NOW(), NOW()),

('b0000001-0000-0000-0000-000000000009', 'ff3f33a2-fd07-4523-b22a-dc78bbc883e8'::uuid,
 '商业招商辅助', 'commercial-leasing',
 '辅助商铺业态判断、品牌匹配、租金参考、招商话术和招商方案生成。',
 '["商业招商"]'::jsonb, '["招商","业态规划","品牌匹配"]'::jsonb, 'Store',
 '辅助商铺业态判断、品牌匹配、租金参考、招商话术和招商方案生成。',
 'published', 0, 0, 0, NOW(), NOW()),

('b0000001-0000-0000-0000-000000000010', 'ff3f33a2-fd07-4523-b22a-dc78bbc883e8'::uuid,
 '生活圈活动策划', 'lifestyle-operation',
 '围绕地铁生活圈场景，生成活动策划、商户联动和运营复盘方案。',
 '["生活圈运营"]'::jsonb, '["生活圈","活动策划","商户联动"]'::jsonb, 'Coffee',
 '围绕地铁生活圈场景，生成活动策划、商户联动和运营复盘方案。',
 'published', 0, 0, 0, NOW(), NOW()),

('b0000001-0000-0000-0000-000000000011', 'ff3f33a2-fd07-4523-b22a-dc78bbc883e8'::uuid,
 '经营报告生成', 'report-generation',
 '快速生成日报、周报、月报、专题分析、经营复盘和管理汇报材料。',
 '["报告生成"]'::jsonb, '["报告","经营分析","管理汇报"]'::jsonb, 'FileText',
 '快速生成日报、周报、月报、专题分析、经营复盘和管理汇报材料。',
 'published', 0, 0, 0, NOW(), NOW()),

('b0000001-0000-0000-0000-000000000012', 'ff3f33a2-fd07-4523-b22a-dc78bbc883e8'::uuid,
 '系统数据查询', 'system-connection',
 '面向已接入系统客户，辅助查询 Union3.0、地铁生活圈、媒体商城、站点画像和经营数据。',
 '["系统连接"]'::jsonb, '["系统连接","数据查询","Union3.0"]'::jsonb, 'Database',
 '面向已接入系统客户，辅助查询 Union3.0、地铁生活圈、媒体商城、站点画像和经营数据。',
 'published', 0, 0, 0, NOW(), NOW())

ON CONFLICT (skill_id) DO NOTHING;

-- =============================================
-- 4. 为12个新技能创建 v1.0.0 版本记录
-- =============================================
INSERT INTO skill_versions (id, skill_id, version, changelog, created_at)
SELECT gen_random_uuid(), s.id, '1.0.0', '初始版本', NOW()
FROM skills s
WHERE s.skill_id IN (
  'industry-knowledge', 'frontier-concepts', 'national-metro',
  'station-portrait', 'business-architecture', 'data-analysis',
  'resource-management', 'advertising', 'commercial-leasing',
  'lifestyle-operation', 'report-generation', 'system-connection'
)
AND NOT EXISTS (
  SELECT 1 FROM skill_versions sv
  WHERE sv.skill_id = s.id AND sv.version = '1.0.0'
);
