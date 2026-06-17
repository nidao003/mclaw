/**
 * Skills Hub CLI — Git 源 (GitHub / GitLab)
 * 从 Git 仓库克隆技能，支持子目录路径指定
 * 格式: user/repo 或 user/repo/tree/<branch>/<path>
 */
import { execSync } from 'node:child_process';
import { mkdir, rm, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { parseSkillMd } from '../utils/skill.js';
import type { InstallSource } from '../types.js';

export function isGitSource(input: string): boolean {
  return (
    input.includes('github.com') ||
    /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/.test(input)
  );
}

interface GitInput {
  owner: string;
  repo: string;
  ref?: string;
  subPath?: string;
}

export function parseGitInput(input: string): GitInput {
  // 去掉协议前缀
  let clean = input.replace(/^https?:\/\/github\.com\//, '');

  // 格式: owner/repo/tree/branch/path/to/skill
  const treeMatch = clean.match(/^([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)$/);
  if (treeMatch) {
    return {
      owner: treeMatch[1],
      repo: treeMatch[2],
      ref: treeMatch[3],
      subPath: treeMatch[4],
    };
  }

  // 格式: owner/repo
  const simpleMatch = clean.match(/^([^/]+)\/([^/]+)$/);
  if (simpleMatch) {
    return { owner: simpleMatch[1], repo: simpleMatch[2] };
  }

  throw new Error(`无法解析 Git 源: ${input}。支持格式: user/repo 或 user/repo/tree/branch/path`);
}

export async function installFromGit(input: string, destDir: string): Promise<InstallSource> {
  const parsed = parseGitInput(input);

  if (!hasGit()) {
    throw new Error('Git 源需要 git 命令行工具，但当前环境未找到 git。请先安装 git 或改用其他源。');
  }

  const cloneUrl = `https://github.com/${parsed.owner}/${parsed.repo}.git`;
  const ref = parsed.ref || 'main';
  const tmpDir = join(tmpdir(), `skills-cli-${randomUUID()}`);

  console.log(`🔄 正在克隆 ${parsed.owner}/${parsed.repo}...`);

  try {
    // 浅克隆到临时目录
    execSync(
      `git clone --depth 1 --branch "${ref}" "${cloneUrl}" "${tmpDir}"`,
      { stdio: 'pipe', timeout: 60_000 },
    );

    // 如果有子目录路径，只取子目录；否则取整个仓库
    const sourceDir = parsed.subPath ? join(tmpDir, parsed.subPath) : tmpDir;

    // 校验源目录中存在 SKILL.md
    await parseSkillMd(join(sourceDir, 'SKILL.md'));

    // 复制到目标目录
    await mkdir(destDir, { recursive: true });
    await cp(sourceDir, destDir, { recursive: true });

    // 再次校验安装后的目录
    const { manifest } = await parseSkillMd(join(destDir, 'SKILL.md'));
    console.log(`✅ 安装完成: ${manifest.name} v${manifest.version}`);

    return {
      type: 'git',
      url: cloneUrl,
      ref,
    };
  } finally {
    // 清理临时目录
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function hasGit(): boolean {
  try {
    execSync('git --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
