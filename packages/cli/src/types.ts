/**
 * Skills Hub CLI — Types
 * 这个SB类型文件只管CLI用到的数据结构，别tm跟桌面端的类型搞混
 */

export interface SkillManifest {
  name: string;
  slug: string;
  version: string;
  description: string;
  author?: string;
  icon?: string;
  tags?: string[];
  license?: string;
  homepage?: string;
  args?: Record<string, ArgDef>;
}

export interface ArgDef {
  type: 'string' | 'number' | 'boolean';
  description?: string;
  required?: boolean;
  enum?: string[];
  default?: unknown;
}

export interface InstalledSkill {
  slug: string;
  version: string;
  source: InstallSource;
  installedAt: string;
  updatedAt: string;
}

export interface InstalledManifest {
  skills: Record<string, InstalledSkill>;
  updatedAt: string;
}

export type InstallSource =
  | { type: 'registry'; slug: string; version: string }
  | { type: 'git'; url: string; ref?: string }
  | { type: 'npm'; package: string; version: string };

export interface SkillsConfig {
  skillsDir: string;
  registryUrl: string;
  autoDetect: boolean;
  detectedTools: string[];
}

export interface RegistrySearchResult {
  slug: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  downloads?: number;
  icon?: string;
}

export interface InstalledMetadata {
  slug: string;
  version: string;
  source: 'registry' | 'npm' | 'git';
  installed_at: string;
  file_count?: number;
  total_size?: number;
}
