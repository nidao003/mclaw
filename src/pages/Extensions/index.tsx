/**
 * src/pages/Extensions/index.tsx
 *
 * 扩展管理页面（设置 → 扩展）。
 * 仿 QClaw 扩展管理 UI：
 *   - 列出所有已安装扩展
 *   - 显示扩展名、版本、作者、描述
 *   - 提供启用/禁用、卸载操作（builtin 不可卸载）
 *   - 顶部提供"从本地包安装"按钮（接收 .tar.gz）
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Puzzle, Trash2, Upload, Shield, Power, PowerOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

export interface ExtensionInfo {
  name: string;
  version: string;
  displayName: string;
  description: string;
  author?: string;
  permissions: string[];
  builtin: boolean;
  category: string;
  enabled: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export default function ExtensionsPage() {
  const { t } = useTranslation();
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // hostApi 是按模块分组的，extension API 我加在 extensions 模块下
  // 这里直接通过 window.mclaw.hostInvoke 调用底层桥接（保持向后兼容）
  const callExtension = useCallback(async <T,>(action: string, params?: unknown): Promise<T> => {
    // 用 hostApi 的扩展接口
    const bridge = (window as unknown as { mclaw?: { hostInvoke?: (req: unknown) => Promise<unknown> } }).mclaw;
    if (!bridge?.hostInvoke) {
      throw new Error('Host bridge not available');
    }
    return (await bridge.hostInvoke({
      id: crypto.randomUUID(),
      module: 'extensions',
      action,
      payload: params,
    })) as T;
  }, []);

  const loadExtensions = useCallback(async () => {
    try {
      setLoading(true);
      const list = await callExtension<ExtensionInfo[]>('list');
      setExtensions(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [callExtension]);

  useEffect(() => {
    void loadExtensions();
  }, [loadExtensions]);

  const handleToggle = async (name: string, enabled: boolean) => {
    try {
      await callExtension('setEnabled', { name, enabled });
      await loadExtensions();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleUninstall = async (name: string) => {
    if (!confirm(t('extensions.confirmUninstall', { name }))) return;
    try {
      await callExtension('uninstall', { name });
      await loadExtensions();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleInstallFromFile = async () => {
    try {
      const tarballPath = await callExtension<string | null>('pickTarball');
      if (!tarballPath) return;
      await callExtension('installFromTarball', { tarballPath });
      await loadExtensions();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-normal tracking-tight">
            {t('extensions.title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('extensions.description')}
          </p>
        </div>
        <Button onClick={handleInstallFromFile} className="gap-2">
          <Upload className="h-4 w-4" />
          {t('extensions.installFromFile')}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive mb-4 flex items-center gap-2 rounded-md p-3 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {extensions.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground flex flex-col items-center justify-center py-12">
              <Puzzle className="mb-2 h-12 w-12 opacity-30" />
              <p>{t('extensions.empty')}</p>
            </CardContent>
          </Card>
        ) : (
          extensions.map((ext) => (
            <Card key={ext.name} className={ext.hasError ? 'border-destructive' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <CardTitle className="font-serif text-lg font-normal">
                        {ext.displayName}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        v{ext.version}
                      </Badge>
                      {ext.builtin && (
                        <Badge variant="outline" className="text-xs">
                          <Shield className="mr-1 h-3 w-3" />
                          {t('extensions.builtin')}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {ext.category}
                      </Badge>
                    </div>
                    {ext.author && (
                      <p className="text-muted-foreground text-xs">
                        {t('extensions.byAuthor', { author: ext.author })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {ext.enabled ? <Power className="h-4 w-4" /> : <PowerOff className="text-muted-foreground h-4 w-4" />}
                      <Switch
                        checked={ext.enabled}
                        onCheckedChange={(checked) => void handleToggle(ext.name, checked)}
                        disabled={ext.builtin}
                      />
                    </div>
                    {!ext.builtin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleUninstall(ext.name)}
                        title={t('extensions.uninstall')}
                      >
                        <Trash2 className="text-destructive h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {ext.description}
                </CardDescription>
                {ext.permissions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {ext.permissions.map((perm) => (
                      <Badge key={perm} variant="outline" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                )}
                {ext.hasError && ext.errorMessage && (
                  <div className="bg-destructive/10 text-destructive mt-3 rounded-md p-2 text-xs">
                    {ext.errorMessage}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
