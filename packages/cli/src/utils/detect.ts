/**
 * Skills Hub CLI — AI 工具检测
 * 自动检测本地安装的 AI 工具，返回工具名列表
 * 这个SB检测逻辑不求100%准确，best-effort就行
 */
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { constants } from 'node:fs';

const HOME = homedir();

interface ToolInfo {
  name: string;
  label: string;
  projectDir: string;
  globalDir: string;
}

const KNOWN_TOOLS: ToolInfo[] = [
  {
    name: 'claude-code',
    label: 'Claude Code',
    projectDir: '.claude/skills',
    globalDir: join(HOME, '.claude/skills'),
  },
  {
    name: 'codex',
    label: 'Codex CLI',
    projectDir: '.agents/skills',
    globalDir: join(HOME, '.agents/skills'),
  },
  {
    name: 'openclaw',
    label: 'OpenClaw / mclaw',
    projectDir: 'skills',
    globalDir: join(HOME, '.mclaw/skills'),
  },
  {
    name: 'gemini-cli',
    label: 'Gemini CLI',
    projectDir: '.agents/skills',
    globalDir: join(HOME, '.gemini/skills'),
  },
  {
    name: 'cursor',
    label: 'Cursor',
    projectDir: '.cursor/skills',
    globalDir: join(HOME, '.cursor/skills'),
  },
  {
    name: 'opencode',
    label: 'OpenCode',
    projectDir: '.agents/skills',
    globalDir: join(HOME, '.opencode/skills'),
  },
];

async function dirExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function detectTools(): Promise<string[]> {
  const detected: string[] = [];

  for (const tool of KNOWN_TOOLS) {
    // 检查全局目录或项目级目录是否存在
    const globalExists = await dirExists(tool.globalDir);
    // 也检查常见的CLI二进制
    const binExists = await checkBin(tool.name);

    if (globalExists || binExists) {
      detected.push(tool.name);
    }
  }

  return detected;
}

async function checkBin(name: string): Promise<boolean> {
  const bins: Record<string, string[]> = {
    'claude-code': ['claude'],
    'codex': ['codex'],
    'openclaw': ['openclaw', 'mclaw'],
    'gemini-cli': ['gemini'],
    'cursor': [],
    'opencode': ['opencode'],
  };

  const names = bins[name] || [];
  // 简单检查：不做PATH搜索，只检查常见安装路径
  for (const bin of names) {
    const commonPaths = [
      join(HOME, '.local/bin', bin),
      join(HOME, 'bin', bin),
      `/usr/local/bin/${bin}`,
    ];
    for (const p of commonPaths) {
      if (await dirExists(p)) return true;
    }
  }

  return false;
}

export function getToolInfo(name: string): ToolInfo | undefined {
  return KNOWN_TOOLS.find((t) => t.name === name);
}

export { KNOWN_TOOLS };
