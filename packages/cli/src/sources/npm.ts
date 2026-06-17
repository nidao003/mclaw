/**
 * Skills Hub CLI — npm 源
 * 从 npm registry 安装技能包
 * 格式: @scope/pkg 或 pkg-name 或 pkg@version
 */
import { execSync } from 'node:child_process';
import { mkdir, rm, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { parseSkillMd } from '../utils/skill.js';
import type { InstallSource } from '../types.js';

export function isNpmSource(input: string): boolean {
  // npm 源判断：@scope/pkg 或包含 @version（但不含 / 路径分隔符的非Git格式）
  if (input.startsWith('@')) return true;
  // 如果包含 @version 后缀且不能解析为 Git 格式
  if (input.includes('@') && !input.includes('/')) return true;
  return false;
}

interface NpmInput {
  packageName: string;
  version?: string;
}

export function parseNpmInput(input: string): NpmInput {
  // @scope/pkg@version
  const scopeMatch = input.match(/^(@[^/]+\/[^@]+)(?:@(.+))?$/);
  if (scopeMatch) {
    return { packageName: scopeMatch[1], version: scopeMatch[2] };
  }

  // pkg@version
  const parts = input.split('@');
  if (parts.length === 2) {
    return { packageName: parts[0], version: parts[1] };
  }

  return { packageName: input };
}

export async function installFromNpm(input: string, destDir: string): Promise<InstallSource> {
  const parsed = parseNpmInput(input);

  if (!hasNpm()) {
    throw new Error('npm 源需要 Node.js/npm 环境，当前未找到 npm。请先安装 Node.js 或改用其他源。');
  }

  const installSpec = parsed.version
    ? `${parsed.packageName}@${parsed.version}`
    : parsed.packageName;
  const tmpDir = join(tmpdir(), `skills-cli-${randomUUID()}`);

  console.log(`📦 正在从 npm 安装 ${installSpec}...`);

  try {
    // 创建临时 npm 项目并安装包
    await mkdir(tmpDir, { recursive: true });
    execSync('npm init -y', { cwd: tmpDir, stdio: 'pipe' });
    execSync(`npm install ${installSpec} --no-save`, {
      cwd: tmpDir,
      stdio: 'pipe',
      timeout: 120_000,
    });

    // 查找包中的技能文件
    const pkgName = parsed.packageName.replace(/^@.+\//, '').replace('@', '').replace('/', '-');
    const pkgDir = join(tmpDir, 'node_modules', parsed.packageName);

    // 尝试多个可能的技能文件位置
    const skillMdCandidates = [
      join(pkgDir, 'SKILL.md'),
      join(pkgDir, 'skill.md'),
      join(pkgDir, 'skills', 'SKILL.md'),
    ];

    let found = false;
    for (const candidate of skillMdCandidates) {
      try {
        await parseSkillMd(candidate);
        // 复制整个包目录作为技能目录
        await mkdir(destDir, { recursive: true });
        await cp(pkgDir, destDir, { recursive: true });
        found = true;
        break;
      } catch {
        continue;
      }
    }

    if (!found) {
      throw new Error(
        `npm 包 "${parsed.packageName}" 中未找到 SKILL.md 文件。\n` +
        '技能 npm 包必须包含 SKILL.md（YAML frontmatter + Markdown body）',
      );
    }

    const { manifest } = await parseSkillMd(join(destDir, 'SKILL.md'));
    console.log(`✅ 安装完成: ${manifest.name} v${manifest.version}`);

    return {
      type: 'npm',
      package: parsed.packageName,
      version: parsed.version || 'latest',
    };
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function hasNpm(): boolean {
  try {
    execSync('npm --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
