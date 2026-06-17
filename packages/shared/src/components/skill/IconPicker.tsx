import { useState } from 'react';
import {
  Rocket, Zap, Target, Star, Flame, Heart,
  Code, Bug, Wrench, Package, Database, Terminal,
  Brain, Bot, BarChart3, Microscope,
  Pencil, FileText, Clipboard, BookOpen,
  Wallet, TrendingUp, Building,
  Camera, Palette, Music,
  Search, Settings2, Download, Link2,
} from 'lucide-react';

const PRESET_ICONS = [
  { name: 'rocket', icon: Rocket, category: '通用', color: '#EE7C4B' },
  { name: 'zap', icon: Zap, category: '通用', color: '#F59E0B' },
  { name: 'target', icon: Target, category: '通用', color: '#EF4444' },
  { name: 'star', icon: Star, category: '通用', color: '#F59E0B' },
  { name: 'flame', icon: Flame, category: '通用', color: '#F97316' },
  { name: 'heart', icon: Heart, category: '通用', color: '#EC4899' },
  { name: 'code', icon: Code, category: '编程', color: '#3B82F6' },
  { name: 'bug', icon: Bug, category: '编程', color: '#84CC16' },
  { name: 'wrench', icon: Wrench, category: '编程', color: '#6B7280' },
  { name: 'package', icon: Package, category: '编程', color: '#8B5CF6' },
  { name: 'database', icon: Database, category: '编程', color: '#06B6D4' },
  { name: 'terminal', icon: Terminal, category: '编程', color: '#10B981' },
  { name: 'brain', icon: Brain, category: 'AI', color: '#A855F7' },
  { name: 'bot', icon: Bot, category: 'AI', color: '#6366F1' },
  { name: 'chart3', icon: BarChart3, category: 'AI', color: '#14B8A6' },
  { name: 'microscope', icon: Microscope, category: 'AI', color: '#0EA5E9' },
  { name: 'pencil', icon: Pencil, category: '文档', color: '#F97316' },
  { name: 'file-text', icon: FileText, category: '文档', color: '#64748B' },
  { name: 'clipboard', icon: Clipboard, category: '文档', color: '#06B6D4' },
  { name: 'book-open', icon: BookOpen, category: '文档', color: '#8B5CF6' },
  { name: 'wallet', icon: Wallet, category: '商务', color: '#10B981' },
  { name: 'trending-up', icon: TrendingUp, category: '商务', color: '#22C55E' },
  { name: 'building', icon: Building, category: '商务', color: '#64748B' },
  { name: 'camera', icon: Camera, category: '创意', color: '#EC4899' },
  { name: 'palette', icon: Palette, category: '创意', color: '#F43F5E' },
  { name: 'music', icon: Music, category: '创意', color: '#A855F7' },
  { name: 'search', icon: Search, category: '工具', color: '#3B82F6' },
  { name: 'settings2', icon: Settings2, category: '工具', color: '#6B7280' },
  { name: 'download', icon: Download, category: '工具', color: '#10B981' },
  { name: 'link2', icon: Link2, category: '工具', color: '#6366F1' },
] as const;

interface IconPickerProps {
  selected: string;
  onSelect: (iconName: string) => void;
  className?: string;
}

export default function IconPicker({ selected, onSelect, className }: IconPickerProps) {
  const [category, setCategory] = useState('全部');
  const categories = ['全部', ...Array.from(new Set(PRESET_ICONS.map(i => i.category)))];

  const filtered = category === '全部'
    ? PRESET_ICONS
    : PRESET_ICONS.filter(i => i.category === category);

  return (
    <div className={className}>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              category === cat
                ? 'bg-skillhub-blue text-white'
                : 'bg-skillhub-soft text-skillhub-ink/60 hover:text-skillhub-ink'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Icon grid */}
      <div className="grid grid-cols-8 gap-2">
        {filtered.map(({ name, icon: Icon, color }) => (
          <button
            key={name}
            type="button"
            onClick={() => onSelect(name)}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
              selected === name
                ? 'bg-brand/10 ring-2 ring-brand ring-offset-1'
                : 'hover:bg-skillhub-soft'
            }`}
            title={name}
          >
            <Icon className="w-8 h-8" style={{ color: selected === name ? '#EE7C4B' : color }} />
            <span className="text-[10px] text-skillhub-ink/40 truncate max-w-[64px]">{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
