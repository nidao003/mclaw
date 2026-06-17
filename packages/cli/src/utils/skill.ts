/**
 * Skills Hub CLI — SKILL.md 解析/校验
 * 解析 YAML frontmatter + Markdown body，校验包格式是否合法
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { SkillManifest, ArgDef } from '../types.js';

/**
 * 从 SKILL.md 文件中解析技能元数据
 * frontmatter 用 --- 包裹，中间是 YAML，后面是 Markdown body
 */
export async function parseSkillMd(filePath: string): Promise<{ manifest: SkillManifest; body: string }> {
  const raw = await readFile(filePath, 'utf-8');
  return parseSkillContent(raw);
}

export function parseSkillContent(raw: string): { manifest: SkillManifest; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error('SKILL.md 缺少 YAML frontmatter（必须以 --- 开头）');
  }

  const yamlStr = match[1];
  const body = match[2].trim();
  let frontmatter: Record<string, unknown>;

  try {
    frontmatter = parseYaml(yamlStr) || {};
  } catch (err) {
    throw new Error(`SKILL.md YAML 解析失败: ${(err as Error).message}`);
  }

  if (!frontmatter.name || typeof frontmatter.name !== 'string') {
    throw new Error('SKILL.md frontmatter 缺少必填字段: name');
  }
  if (!frontmatter.slug || typeof frontmatter.slug !== 'string') {
    throw new Error('SKILL.md frontmatter 缺少必填字段: slug');
  }
  if (!frontmatter.description || typeof frontmatter.description !== 'string') {
    throw new Error('SKILL.md frontmatter 缺少必填字段: description');
  }

  return {
    manifest: {
      name: frontmatter.name as string,
      slug: frontmatter.slug as string,
      version: (frontmatter.version as string) || '0.0.0',
      description: frontmatter.description as string,
      author: frontmatter.author as string | undefined,
      icon: frontmatter.icon as string | undefined,
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags as string[] : undefined,
      license: frontmatter.license as string | undefined,
      homepage: frontmatter.homepage as string | undefined,
      args: frontmatter.args as unknown as Record<string, ArgDef> | undefined,
    },
    body,
  };
}

/**
 * 校验技能目录结构是否合法
 * 最小要求：目录里必须有 SKILL.md
 */
export async function validateSkillDir(skillDir: string): Promise<SkillManifest> {
  const skillMdPath = join(skillDir, 'SKILL.md');
  const { manifest } = await parseSkillMd(skillMdPath);

  // slug 必须与目录名一致
  const dirName = skillDir.split('/').pop() || '';
  if (manifest.slug !== dirName) {
    console.warn(`⚠️ slug "${manifest.slug}" 与目录名 "${dirName}" 不一致，建议统一`);
  }

  return manifest;
}
