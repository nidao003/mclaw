import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, FileArchive, X, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@shared';
import { IconPicker } from '@shared/components';

// 技能上传页 — Publisher+ 用户上传新技能
export default function SkillUpload() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [iconName, setIconName] = useState('');
  const [version, setVersion] = useState('1.0.0');

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.zip')) {
      setFile(f);
      setError('');
    } else {
      setError('只支持 .zip 格式文件');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name || !slug) {
      setError('请填写必填字段并上传 ZIP 文件');
      return;
    }
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('slug', slug);
    formData.append('summary', summary);
    formData.append('version', version);
    if (iconName) formData.append('icon_name', iconName);

    try {
      const res = await fetch('/api/v1/skills/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error('上传失败');
      navigate('/settings/my-skills');
    } catch (err: any) {
      setError(err.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const generateSlug = (nameStr: string) => {
    return nameStr
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 64);
  };

  // 未登录提示
  if (!user) {
    return (
      <div className="mx-auto flex max-w-[720px] flex-col items-center px-4 py-24 text-center">
        <Upload className="h-10 w-10 text-black/30" />
        <h1 className="mt-4 font-display text-3xl font-semibold">请先登录</h1>
        <p className="mt-3 text-sm text-black/55">上传技能需要登录。</p>
        <Link to="/login" className="skillhub-capsule-button mt-6">
          去登录
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <p className="text-skillhub-ink/50 mb-8">上传 ZIP 压缩包，包含 SKILL.md 和附件资源</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 拖拽上传区 */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
            file
              ? 'border-green-300 bg-green-50'
              : 'border-skillhub-line hover:border-skillhub-blue/40 bg-skillhub-soft/50'
          }`}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3 text-green-700">
              <CheckCircle className="w-6 h-6" />
              <div className="text-left">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-green-600">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <button type="button" onClick={() => setFile(null)} className="ml-4 p-1 hover:bg-green-200 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <FileArchive className="w-12 h-12 text-skillhub-ink/20 mx-auto mb-4" />
              <p className="text-skillhub-ink/50 mb-2">拖拽 ZIP 文件到此处</p>
              <p className="text-sm text-skillhub-ink/30">或点击下方选择文件</p>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-4 text-sm"
              />
            </>
          )}
        </div>

        {/* 表单字段 */}
        <div>
          <label className="block text-sm font-medium text-skillhub-ink mb-1.5">技能名称 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSlug(generateSlug(e.target.value)); }}
            placeholder="例如: 中文公文排版"
            className="w-full px-4 py-3 bg-white border border-skillhub-line rounded-xl text-sm focus:outline-none focus:border-skillhub-blue focus:ring-1 focus:ring-skillhub-blue/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-skillhub-ink mb-1.5">唯一标识 (slug) *</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="chinese-official-word-style"
            className="w-full px-4 py-3 bg-white border border-skillhub-line rounded-xl text-sm font-mono focus:outline-none focus:border-skillhub-blue"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-skillhub-ink mb-1.5">简介 *</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="简要描述这个技能的功能..."
            className="w-full px-4 py-3 bg-white border border-skillhub-line rounded-xl text-sm focus:outline-none focus:border-skillhub-blue resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-skillhub-ink mb-1.5">选择图标</label>
          <IconPicker selected={iconName} onSelect={setIconName} />
        </div>

        <div>
          <label className="block text-sm font-medium text-skillhub-ink mb-1.5">版本号</label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-skillhub-line rounded-xl text-sm font-mono focus:outline-none focus:border-skillhub-blue"
          />
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={uploading || !file || !name || !slug}
          className="w-full py-3.5 bg-skillhub-blue text-white rounded-xl font-semibold text-[15px] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? '上传中...' : '提交上传'}
        </button>
      </form>
    </div>
  );
}
