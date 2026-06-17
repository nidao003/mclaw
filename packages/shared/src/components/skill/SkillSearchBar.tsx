import { Search, SlidersHorizontal } from 'lucide-react';
import type { SortBy } from '../../types/skill';
import { SORT_OPTIONS } from '../../utils/constants';
import { cn } from '../../utils/cn';

interface SkillSearchBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  sortBy: SortBy;
  onSortChange: (v: SortBy) => void;
  selectedCategory: string;
  onCategoryChange: (v: string) => void;
  categories: string[];
  className?: string;
}

// 搜索 + 排序 + 分类过滤 — skillhub.cn 圆形搜索条
export function SkillSearchBar({
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  selectedCategory,
  onCategoryChange,
  categories,
  className,
}: SkillSearchBarProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative">
        <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/45" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索技能、MCP、自动化工作流..."
          className="skillhub-soft-shadow h-12 w-full rounded-full border border-skillhub-line bg-white py-3 pl-12 pr-5 text-sm outline-none transition-all placeholder:text-black/30 hover:border-[#DADDE4] focus:border-[#D6DAE2] focus:ring-2 focus:ring-skillhub-blue/20 md:h-[54px]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 flex-wrap gap-2">
          <button
            onClick={() => onCategoryChange('')}
            className={cn(
              'rounded-full px-4 py-2 text-xs font-medium transition-colors',
              !selectedCategory
                ? 'bg-black text-white'
                : 'border border-black/10 bg-white text-black/65 hover:bg-secondary hover:text-foreground',
            )}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-medium transition-colors',
                selectedCategory === cat
                  ? 'bg-black text-white'
                  : 'border border-black/10 bg-white text-black/65 hover:bg-secondary hover:text-foreground',
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 排序 */}
        <div className="flex items-center gap-1.5 text-xs text-black/55">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortBy)}
            className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
