import type { LanguageCode } from '../language';

// EN
import enCommon from './locales/en/common.json';
import enSettings from './locales/en/settings.json';
import enDashboard from './locales/en/dashboard.json';
import enChat from './locales/en/chat.json';
import enChannels from './locales/en/channels.json';
import enAgents from './locales/en/agents.json';
import enSkills from './locales/en/skills.json';
import enCron from './locales/en/cron.json';
import enDreams from './locales/en/dreams.json';
import enSetup from './locales/en/setup.json';
import enMenu from './locales/en/menu.json';

// ZH
import zhCommon from './locales/zh/common.json';
import zhSettings from './locales/zh/settings.json';
import zhDashboard from './locales/zh/dashboard.json';
import zhChat from './locales/zh/chat.json';
import zhChannels from './locales/zh/channels.json';
import zhAgents from './locales/zh/agents.json';
import zhSkills from './locales/zh/skills.json';
import zhCron from './locales/zh/cron.json';
import zhDreams from './locales/zh/dreams.json';
import zhSetup from './locales/zh/setup.json';
import zhMenu from './locales/zh/menu.json';


export const I18N_NAMESPACES = [
  'common',
  'settings',
  'dashboard',
  'chat',
  'channels',
  'agents',
  'skills',
  'cron',
  'dreams',
  'setup',
  'menu',
] as const;

export const I18N_RESOURCES = {
  en: {
    common: enCommon,
    settings: enSettings,
    dashboard: enDashboard,
    chat: enChat,
    channels: enChannels,
    agents: enAgents,
    skills: enSkills,
    cron: enCron,
    dreams: enDreams,
    setup: enSetup,
    menu: enMenu,
  },
  zh: {
    common: zhCommon,
    settings: zhSettings,
    dashboard: zhDashboard,
    chat: zhChat,
    channels: zhChannels,
    agents: zhAgents,
    skills: zhSkills,
    cron: zhCron,
    dreams: zhDreams,
    setup: zhSetup,
    menu: zhMenu,
  },


} as const;

export type MenuLabels = typeof enMenu;

export const MENU_LABELS: Record<LanguageCode, MenuLabels> = {
  en: enMenu,
  zh: zhMenu,
};
