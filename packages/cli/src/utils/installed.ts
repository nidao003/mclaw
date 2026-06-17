/**
 * Skills Hub CLI — 已安装技能清单管理
 * 读写 ~/.skills/installed.json，这个憨批文件记录所有安装历史
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { getSkillsHome } from './config.js';
import type { InstalledManifest, InstalledSkill, InstallSource } from '../types.js';

const INSTALLED_PATH = join(getSkillsHome(), 'installed.json');

async function readManifest(): Promise<InstalledManifest> {
  try {
    const raw = await readFile(INSTALLED_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { skills: {}, updatedAt: new Date().toISOString() };
  }
}

async function writeManifest(manifest: InstalledManifest): Promise<void> {
  await mkdir(dirname(INSTALLED_PATH), { recursive: true });
  manifest.updatedAt = new Date().toISOString();
  await writeFile(INSTALLED_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
}

export async function addInstalled(slug: string, version: string, source: InstallSource): Promise<void> {
  const manifest = await readManifest();
  const now = new Date().toISOString();
  const existing = manifest.skills[slug];

  manifest.skills[slug] = {
    slug,
    version,
    source,
    installedAt: existing?.installedAt || now,
    updatedAt: now,
  };

  await writeManifest(manifest);
}

export async function removeInstalled(slug: string): Promise<void> {
  const manifest = await readManifest();
  delete manifest.skills[slug];
  await writeManifest(manifest);
}

export async function listInstalled(): Promise<InstalledSkill[]> {
  const manifest = await readManifest();
  return Object.values(manifest.skills);
}

export async function getInstalled(slug: string): Promise<InstalledSkill | undefined> {
  const manifest = await readManifest();
  return manifest.skills[slug];
}

export async function isInstalled(slug: string): Promise<boolean> {
  const manifest = await readManifest();
  return slug in manifest.skills;
}
