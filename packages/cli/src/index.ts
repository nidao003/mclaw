#!/usr/bin/env node
/**
 * Skills Hub CLI — 通用 AI 技能包管理器
 *
 * 一句话安装:
 *   npx mclaw-skills add mclaw/<技能名>    （自动初始化 + 安装，零配置）
 *
 * 其他用法:
 *   npx mclaw-skills init                 手动初始化环境
 *   npx mclaw-skills list                 列出已安装
 *   npx mclaw-skills remove <slug>        卸载
 *
 * 安装源:
 *   Registry:  npx mclaw-skills add <slug> 或 mclaw/<slug>
 *   npm:       npx mclaw-skills add @scope/pkg
 */

import { cmdInit } from './commands/init.js';
import { cmdAdd } from './commands/add.js';
import { cmdList } from './commands/list.js';
import { cmdRemove } from './commands/remove.js';

const args = process.argv.slice(2);
const command = args[0];

function printHelp(): void {
  console.log(`
Skills Hub CLI — 通用 AI 技能包管理器

用法:
  npx mclaw-skills <command> [options]

命令:
  add <source>      安装技能（Registry / npm，首次自动初始化）
  init              手动初始化本地技能环境 (~/.skills/)
  list              列出已安装技能
  remove <slug>     卸载技能
  search <query>    搜索 Skills Hub 市场
  help              显示此帮助

安装源格式:
  Skills Hub   npx mclaw-skills add mclaw/<slug>         （推荐）
  纯 slug      npx mclaw-skills add <slug>               （默认走 Registry）
  npm          npx mclaw-skills add @scope/skill-package

示例:
  npx mclaw-skills add mclaw/mckinsey-visual             # 一句话安装
  npx mclaw-skills add web-search                        # 纯 slug 搜市场
  npx mclaw-skills list                                  # 查看已装
  npx mclaw-skills remove web-search                     # 卸载

更多信息: https://[REDACTED]/skills
`);
}

async function main(): Promise<void> {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  // 解析通用选项（简单处理，不引入 commander 依赖）
  const options: Record<string, string | boolean> = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--dir' && i + 1 < args.length) {
      options.dir = args[++i];
    } else if (args[i] === '--tools' && i + 1 < args.length) {
      options.tools = args[++i];
    } else if (args[i] === '--force') {
      options.force = true;
    }
  }

  // 剩余非选项参数
  const positional = args.slice(1).filter((a) => !a.startsWith('--') && !['--dir', '--tools'].includes(args[args.indexOf(a) - 1]));

  switch (command) {
    case 'init':
      await cmdInit({
        dir: options.dir as string | undefined,
        tools: options.tools as string | undefined,
      });
      break;

    case 'add':
    case 'install':
      await cmdAdd(positional[0] || '', {
        dir: options.dir as string | undefined,
      });
      break;

    case 'list':
    case 'ls':
      await cmdList();
      break;

    case 'remove':
    case 'rm':
    case 'uninstall':
      await cmdRemove(positional[0] || '', {
        force: !!options.force,
      });
      break;

    case 'search':
      console.log('🔍 搜索功能即将上线。请访问 Skills Hub 市场: https://skills-hub.example.com');
      break;

    case 'update':
      console.log('🔄 更新功能即将上线。');
      break;

    default:
      console.error(`❌ 未知命令: ${command}`);
      console.log('运行 npx mclaw-skills help 查看帮助');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`❌ 运行错误: ${err.message}`);
  process.exit(1);
});
