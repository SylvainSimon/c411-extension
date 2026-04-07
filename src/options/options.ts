import { Config } from '../core/config/config';

document.addEventListener('DOMContentLoaded', async () => {
  const status = document.getElementById('status')!;
  const tmdbInput = document.getElementById('tmdb-key') as HTMLInputElement;
  const minRatioInput = document.getElementById('min-ratio') as HTMLInputElement;
  
  // Charge la configuration actuelle
  const config = await Config.getAll();
  
  // Remplit les champs
  tmdbInput.value = config.tmdbApiKey;
  minRatioInput.value = config.minRatio.toString();

  // Écouteur pour la sauvegarde
  document.getElementById('save')?.addEventListener('click', async () => {
    const tmdbApiKey = tmdbInput.value.trim();
    const minRatio = parseInt(minRatioInput.value, 10);

    if (!tmdbApiKey) {
      status.textContent = '❌ La clé API TMDB est requise';
      status.style.color = '#ef4444';
      return;
    }

    if (isNaN(minRatio) || minRatio < 1) {
      status.textContent = '❌ Le seuil de ratio doit être un nombre valide (>= 1)';
      status.style.color = '#ef4444';
      return;
    }

    try {
      await Config.set({ tmdbApiKey, minRatio });
      status.textContent = '✅ Configuration enregistrée !';
      status.style.color = '#4ade80';
      setTimeout(() => { status.textContent = ''; }, 3000);
    } catch (error) {
      console.error('[Options] Erreur sauvegarde:', error);
      status.textContent = '❌ Erreur lors de la sauvegarde';
      status.style.color = '#ef4444';
    }
  });
});
