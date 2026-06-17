/**
 * Skills Hub CLI — Registry 源 (Skills Hub API)
 * 从 Skills Hub 市场下载技能包
 */
import { join } from 'node:path';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { loadConfig } from '../utils/config.js';
import { parseSkillMd } from '../utils/skill.js';
import type { InstallSource } from '../types.js';

export function isRegistrySource(input: string): boolean {
  if (input.startsWith('mclaw/')) return true;
  return !input.includes('/') && !input.includes('@') && !input.includes('github.com');
}

export function parseRegistryInput(input: string): { slug: string; version?: string } {
  let clean = input.startsWith('mclaw/') ? input.replace('mclaw/', '') : input;
  if (clean.includes('@')) {
    const [slug, version] = clean.split('@');
    return { slug: slug.trim(), version: version.trim() };
  }
  return { slug: clean.trim() };
}

interface RegistrySkillInfo {
  skill_id: string;
  name: string;
  description: string;
  icon?: string;
  versions?: { version: string }[];
}

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

async function fetchSkillInfo(slug: string): Promise<{ name: string; version: string }> {
  const config = await loadConfig();
  const url = `${config.registryUrl}/skills/by-slug/${slug}`;

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`技能 "${slug}" 在 Registry 中未找到。先去 Skills Hub 市场搜一下？`);
    }
    throw new Error(`Registry 请求失败 (${res.status}): ${res.statusText}`);
  }

  const json = await res.json() as ApiResponse<RegistrySkillInfo>;
  if (json.code !== 0 || !json.data) {
    throw new Error(`Registry 返回错误: ${json.message}`);
  }

  const info = json.data;
  const latestVersion = info.versions && info.versions.length > 0
    ? info.versions[info.versions.length - 1].version
    : '0.0.0';

  return { name: info.name, version: latestVersion };
}

async function downloadSkill(slug: string, version: string, destDir: string): Promise<void> {
  const config = await loadConfig();
  // 下载端点：/by-slug/:slug/download 或 /by-slug/:slug/versions/:version/download
  const downloadPath = version
    ? `skills/by-slug/${slug}/versions/${version}/download`
    : `skills/by-slug/${slug}/download`;
  const downloadUrl = `${config.registryUrl}/${downloadPath}`;

  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error(`下载失败 (${res.status}): ${res.statusText}`);
  }

  await mkdir(destDir, { recursive: true });

  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/zip')) {
    // V2: ZIP multi-file mode
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save ZIP to temp location, then extract
    const tmpZipPath = join(destDir, `${slug}.zip`);
    await writeFile(tmpZipPath, buffer);

    // Use unzip command to extract
    try {
      execSync(`unzip -o "${tmpZipPath}" -d "${destDir}"`, { stdio: 'pipe' });
    } catch {
      // If unzip fails, fall back to treating as SKILL.md
      const content = buffer.toString('utf-8');
      await writeFile(join(destDir, 'SKILL.md'), content, 'utf-8');
    } finally {
      // Clean up ZIP file
      try { await unlink(tmpZipPath); } catch {}
    }
  } else {
    // Backward compatible: single SKILL.md text
    const body = await res.text();
    await writeFile(join(destDir, 'SKILL.md'), body, 'utf-8');
  }
}

/**
 * 从 Registry 安装技能
 * 1. 查 Registry 获取技能信息
 * 2. 下载 tarball
 * 3. 解压到 ~/.skills/skills/<slug>/
 * 4. 校验 SKILL.md
 */
export async function installFromRegistry(
  input: string,
  destDir: string,
): Promise<InstallSource> {
  const { slug, version: requestedVersion } = parseRegistryInput(input);

  console.log(`🔍 正在从 Registry 查找 ${slug}...`);
  const info = await fetchSkillInfo(slug);
  const installVersion = requestedVersion || info.version;

  console.log(`📦 找到 ${info.name} v${installVersion}`);
  console.log(`⬇️  正在下载...`);

  await downloadSkill(slug, installVersion, destDir);

  // 校验
  const { manifest } = await parseSkillMd(join(destDir, 'SKILL.md'));
  console.log(`✅ 安装完成: ${manifest.name} v${manifest.version}`);

  return { type: 'registry', slug, version: installVersion };
}
