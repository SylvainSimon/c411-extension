import { AppConfig } from '../../types/config';

const defaults: AppConfig = {
  tmdbApiKey: '',
  minRatio: 100,
  minUploadedTB: null,
  apiRateLimit: 200,
  deepAnalysisLimit: 5
};

export const Config = {
  /**
   * Récupère une valeur de configuration
   */
  async get<K extends keyof AppConfig>(key: K): Promise<AppConfig[K]> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(defaults, (items) => {
        resolve((items as AppConfig)[key]);
      });
    });
  },

  /**
   * Récupère l'intégralité de la configuration
   */
  async getAll(): Promise<AppConfig> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(defaults, (items) => {
        resolve(items as AppConfig);
      });
    });
  },

  /**
   * Sauvegarde une ou plusieurs valeurs
   */
  async set(items: Partial<AppConfig>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.set(items, () => {
        console.log('[Config] Configuration mise à jour');
        resolve();
      });
    });
  }
};
