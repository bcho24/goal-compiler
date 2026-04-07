import { create } from 'zustand';
import type { AIConfig, CompatType } from '@/lib/types';
import { PROVIDER_PRESETS } from '@/lib/types';

const STORAGE_KEY = 'gte-ai-config';

const DEFAULT_CONFIG: AIConfig = {
  provider: 'custom',
  apiKey: '',
  model: '',
  baseURL: '',
  compatType: 'openai',
};

function loadConfig(): AIConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

function saveConfig(config: AIConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

interface SettingsStore {
  config: AIConfig;
  initialized: boolean;
  initConfig: () => void;
  applyPreset: (presetId: string) => void;
  updateConfig: (partial: Partial<AIConfig>) => void;
  isConfigured: () => boolean;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  config: DEFAULT_CONFIG,
  initialized: false,

  initConfig: () => {
    const config = loadConfig();
    set({ config, initialized: true });
  },

  applyPreset: (presetId: string) => {
    const preset = PROVIDER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const prev = get().config;
    const config: AIConfig = {
      ...prev,
      provider: preset.id,
      baseURL: preset.defaultBaseURL,
      compatType: preset.compatType,
      model: preset.suggestedModels[0]?.id || prev.model,
    };
    saveConfig(config);
    set({ config });
  },

  updateConfig: (partial: Partial<AIConfig>) => {
    const config = { ...get().config, ...partial };
    saveConfig(config);
    set({ config });
  },

  isConfigured: () => {
    const { apiKey, baseURL } = get().config;
    return apiKey.length > 0 && baseURL.length > 0;
  },
}));
