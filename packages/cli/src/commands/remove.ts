/**
 * Skills Hub CLI — remove 命令
 * 卸载已安装的技能
 */
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from '../utils/config.js';
import { removeInstalled, isInstalled } from '../utils/installed.js';

export async function cmdRemove(slug: string, options: { force?: boolean }): Promise<void> {
  if (!slug || slug.trim() === '') {
    console.error('❌ 请指定要卸载的技能 slug。\n');
    console.log('用法: npx skills remove <slug>');
    console.log('查看已安装: npx skills list');
    process.exit(1);
  }

  const exists = await isInstalled(slug);
  if (!exists) {
    console.error(`❌ 技能 "${slug}" 未安装。`);
    console.log('查看已安装: npx skills list');
    process.exit(1);
  }

  const config = await loadConfig();
  const skillDir = join(config.skillsDir, slug);

  try {
    await rm(skillDir, { recursive: true, force: options.force });
    await removeInstalled(slug);
    console.log(`🗑️  已卸载: ${slug}`);
  } catch (err) {
    console.error(`❌ 卸载失败: ${(err as Error).message}`);
    process.exit(1);
  }
}
