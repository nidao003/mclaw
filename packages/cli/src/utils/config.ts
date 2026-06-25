/**
 * Skills Hub CLI — 配置管理
 * 读写 ~/.skills/config.json
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { SkillsConfig } from '../types.js';

const SKILLS_HOME = join(homedir(), '.skills');
const CONFIG_PATH = join(SKILLS_HOME, 'config.json');

const DEFAULT_CONFIG: SkillsConfig = {
  skillsDir: join(SKILLS_HOME, 'skills'),
  registryUrl: 'https://skills.mclaw.example.com/api/v1',
  autoDetect: true,
  detectedTools: [],
};

export function getSkillsHome(): string {
  return process.env.SKILLS_HOME || SKILLS_HOME;
}

export function getConfigPath(): string {
  return process.env.SKILLS_CONFIG_PATH || CONFIG_PATH;
}

export async function ensureSkillsDir(): Promise<string> {
  const dir = getSkillsHome();
  await mkdir(dir, { recursive: true });
  await mkdir(join(dir, 'skills'), { recursive: true });
  return dir;
}

export async function loadConfig(): Promise<SkillsConfig> {
  try {
    const raw = await readFile(getConfigPath(), 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(config: SkillsConfig): Promise<void> {
  await mkdir(join(getConfigPath(), '..'), { recursive: true });
  await writeFile(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}
