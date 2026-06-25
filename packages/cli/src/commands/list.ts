/**
 * Skills Hub CLI — list 命令
 * 列出已安装的技能
 */
import { listInstalled } from '../utils/installed.js';
import { loadConfig } from '../utils/config.js';
import { join } from 'node:path';
import { parseSkillMd } from '../utils/skill.js';

export async function cmdList(): Promise<void> {
  const installed = await listInstalled();

  if (installed.length === 0) {
    console.log('📭 还没有安装任何技能。\n');
    console.log('试试: npx skills add <技能名>');
    console.log('或去 Skills Hub 市场逛逛: https://skills.mclaw.example.com/skills');
    return;
  }

  const config = await loadConfig();
  console.log(`📋 已安装技能 (${installed.length}):\n`);

  for (const skill of installed) {
    try {
      const skillDir = join(config.skillsDir, skill.slug);
      const result = await parseSkillMd(join(skillDir, 'SKILL.md'));
      const icon = result.manifest.icon || '📦';
      const sourceLabel =
        skill.source.type === 'registry' ? 'registry' :
        skill.source.type === 'git' ? 'github' :
        'npm';

      console.log(`  ${icon}  ${result.manifest.name.padEnd(20)} ${skill.slug.padEnd(24)} v${skill.version}  ${sourceLabel}`);
    } catch {
      console.log(`  ⚠️  ${skill.slug.padEnd(24)} v${skill.version}  (SKILL.md 损坏)`);
    }
  }

  console.log(`\n📁 技能目录: ${config.skillsDir}`);
}
