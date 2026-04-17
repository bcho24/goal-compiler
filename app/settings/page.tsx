'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Save, Check, Globe, Cpu, Key, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Header } from '@/components/layout/Header';
import { useSettingsStore } from '@/lib/store/settingsStore';
import { useI18n } from '@/lib/i18n';
import type { CompatType } from '@/lib/types';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { config, initialized, initConfig, updateConfig } = useSettingsStore();
  const { t } = useI18n();
  const [showKey, setShowKey] = useState(false);
  const [localKey, setLocalKey] = useState('');
  const [localBaseURL, setLocalBaseURL] = useState('');
  const [localModel, setLocalModel] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    initConfig();
  }, [initConfig]);

  useEffect(() => {
    if (initialized) {
      setTimeout(() => {
        setLocalKey(config.apiKey);
        setLocalBaseURL(config.baseURL);
        setLocalModel(config.model);
      }, 0);
    }
  }, [initialized, config.apiKey, config.baseURL, config.model]);

  const handleCompatTypeChange = (value: string | null) => {
    if (!value) return;
    updateConfig({ compatType: value as CompatType });
  };

  const handleSave = () => {
    updateConfig({ apiKey: localKey, baseURL: localBaseURL, model: localModel });
    setSaved(true);
    toast.success(t('settings.settingsSaved'));
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">{t('settings.title')}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              {t('settings.configTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>{t('settings.protocolLabel')}</Label>
              <Select value={config.compatType} onValueChange={handleCompatTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">{t('settings.protocolOpenAI')}</SelectItem>
                  <SelectItem value="anthropic">{t('settings.protocolAnthropic')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('settings.protocolHint')}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                {t('settings.baseURLLabel')}
              </Label>
              <Input
                value={localBaseURL}
                onChange={(e) => setLocalBaseURL(e.target.value)}
                placeholder={t('settings.baseURLPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">{t('settings.baseURLHint')}</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5" />
                {t('settings.apiKeyLabel')}
              </Label>
              <div className="flex gap-2">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  placeholder={t('settings.apiKeyPlaceholder')}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('settings.apiKeyHint')}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                {t('settings.modelLabel')}
              </Label>
              <Input
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                placeholder={t('settings.modelPlaceholder')}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground">{t('settings.suggested')}</span>
                <button
                  onClick={() => setLocalModel('claude-haiku-4-5')}
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs transition-colors ${
                    localModel === 'claude-haiku-4-5'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  claude-haiku-4-5
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{t('settings.modelHint')}</p>
            </div>

            <Button onClick={handleSave} className="w-full gap-2">
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? t('settings.saved') : t('settings.saveConfig')}
            </Button>
          </CardContent>
        </Card>

        {config.compatType === 'anthropic' && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Anthropic 高级选项
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">启用 Prompt Caching</Label>
                  <p className="text-xs text-muted-foreground">
                    将静态 prompt 内容标记为可缓存，可将 TTFT 降低最多 80%。仅限官方 Anthropic API，第三方转发端点不支持。
                  </p>
                </div>
                <Switch
                  checked={config.enablePromptCaching ?? false}
                  onCheckedChange={(checked) => updateConfig({ enablePromptCaching: checked })}
                />
              </div>
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  );
}
