/**
 * Skills Hub CLI — init 命令
 * 初始化本地技能环境: ~/.skills/
 */
import { ensureSkillsDir, loadConfig, saveConfig } from '../utils/config.js';
import { detectTools, getToolInfo } from '../utils/detect.js';

export async function cmdInit(options: { dir?: string; tools?: string }): Promise<void> {
  console.log('🚀 正在初始化 Skills Hub 环境...\n');

  const homeDir = await ensureSkillsDir();
  console.log(`📁 技能目录: ${homeDir}/skills/`);

  const config = await loadConfig();

  if (options.dir) {
    config.skillsDir = options.dir;
  }

  if (options.tools) {
    config.detectedTools = options.tools.split(',').map((t) => t.trim());
    config.autoDetect = false;
  } else if (config.autoDetect) {
    console.log('🔍 正在检测本地 AI 工具...');
    config.detectedTools = await detectTools();
  }

  await saveConfig(config);

  if (config.detectedTools.length > 0) {
    console.log(`\n✅ 已检测到以下 AI 工具:`);
    for (const toolName of config.detectedTools) {
      const info = getToolInfo(toolName);
      if (info) {
        console.log(`   - ${info.label} (${info.globalDir})`);
      }
    }
  } else {
    console.log('\n⚠️  未检测到本地 AI 工具。');
  }

  console.log('\n💡 快速上手:');
  console.log('   npx mclaw-skills add mclaw/<技能名>    # 一句话安装（自动初始化）');
  console.log('   npx mclaw-skills list                 # 查看已安装');
  console.log('\n✨ 初始化完成!\n');
}
