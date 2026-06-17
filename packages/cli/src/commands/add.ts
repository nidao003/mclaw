/**
 * Skills Hub CLI — add 命令
 * 双源智能安装: Registry / npm
 */
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { loadConfig, ensureSkillsDir } from '../utils/config.js';
import { addInstalled } from '../utils/installed.js';
import { isRegistrySource, installFromRegistry } from '../sources/registry.js';
import { isNpmSource, installFromNpm } from '../sources/npm.js';
import type { InstallSource, InstalledMetadata } from '../types.js';

export async function cmdAdd(source: string, options: { dir?: string }): Promise<void> {
  if (!source || source.trim() === '') {
    console.log('❌ 请指定要安装的技能来源。\n');
    console.log('用法:');
    console.log('  npx mclaw-skills add mclaw/<slug>          # Skills Hub Registry（推荐）');
    console.log('  npx mclaw-skills add <slug>                # 纯 slug，默认走 Registry');
    console.log('  npx mclaw-skills add @scope/pkg            # npm 源');
    process.exit(1);
  }

  const config = await loadConfig();
  await ensureSkillsDir();

  // 自动检测：未初始化时自动跑 init，实现真正的一句话安装
  if (config.detectedTools.length === 0) {
    const { detectTools } = await import('../utils/detect.js');
    const { saveConfig } = await import('../utils/config.js');
    console.log('🔍 检测到首次使用，正在自动初始化...');
    config.detectedTools = await detectTools();
    await saveConfig(config);
    if (config.detectedTools.length > 0) {
      console.log(`✅ 已检测到 ${config.detectedTools.length} 个 AI 工具`);
    }
  }

  let installSource: InstallSource;

  try {
    if (isNpmSource(source)) {
      console.log('📦 检测到 npm 源');
      const destDir = options.dir || join(config.skillsDir, extractSlug(source));
      installSource = await installFromNpm(source, destDir);
    } else if (isRegistrySource(source)) {
      console.log('🏪 检测到 Registry 源（Skills Hub）');
      // 如果是 mclaw/xxx 格式，去掉前缀后查 API；否则直接用
      const slug = source.startsWith('mclaw/') ? source.replace('mclaw/', '') : source;
      const installSlug = slug.includes('@') ? slug.split('@')[0] : slug;
      const destDir = options.dir || join(config.skillsDir, installSlug);
      installSource = await installFromRegistry(source, destDir);
    } else {
      console.error(`❌ 无法识别技能来源: ${source}`);
      console.log('支持格式: mclaw/<slug> | <slug> | @scope/pkg');
      process.exit(1);
    }

    // 记录到 installed.json
    const version = installSource.type === 'npm' ? installSource.version
      : installSource.type === 'registry' ? installSource.version
      : installSource.ref ?? 'latest';

    const slug = installSource.type === 'npm' ? extractSlug(source)
      : installSource.type === 'registry' ? installSource.slug
      : extractSlug(source);

    await addInstalled(slug, version, installSource);

    // Write .installed.json metadata to skill directory
    const metadata: InstalledMetadata = {
      slug,
      version,
      source: installSource.type,
      installed_at: new Date().toISOString(),
    };
    const skillDir = options.dir || join(config.skillsDir, slug);
    await writeFile(
      join(skillDir, '.installed.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8',
    );

    // 提示后续操作
    console.log(`\n💡 技能已安装到: ${options.dir || join(config.skillsDir, slug)}`);
    if (config.detectedTools.length > 0) {
      console.log('   检测到的 AI 工具:');
      for (const tool of config.detectedTools) {
        const toolDir = tool === 'claude-code' ? '.claude' : tool === 'openclaw' ? '.mclaw' : `.${tool}`;
        console.log(`   - 手动链接: ln -s ~/.skills/skills/${slug} ~/${toolDir}/skills/${slug}`);
      }
    }
    console.log('   或使用 skillshare / skillsmgr 自动同步到所有工具');
  } catch (err) {
    console.error(`\n❌ 安装失败: ${(err as Error).message}`);
    process.exit(1);
  }
}

function extractSlug(source: string): string {
  // @scope/pkg@version → scope-pkg
  // pkg@version → pkg
  return source
    .replace(/^@/, '')
    .replace(/@.+$/, '')
    .replace(/\//g, '-');
}
