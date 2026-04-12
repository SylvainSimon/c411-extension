import { initializeUserProfile } from './features/cheater-detection/user-profile';
import { initializeBBCodeGenerator } from './features/bbcode-generator/c411-generator';
import { ModerationCenter } from './features/moderation-center/moderation-center';

// Importation des règles Torrent - Snatch (Basées sur le profil)
import './features/cheater-detection/rules/torrent/snatch/high-ratio-rule';
import './features/cheater-detection/rules/torrent/snatch/high-upload-rule';
import './features/cheater-detection/rules/torrent/snatch/suspicious-speed-rule';

// Importation des règles Torrent - Deep (Nécessitent des appels API supplémentaires)
import './features/cheater-detection/rules/torrent/deep/late-activity-rule';
import './features/cheater-detection/rules/torrent/deep/impossible-ratio-rule';
import './features/cheater-detection/rules/torrent/deep/dominance-rule';

// Importation des règles Account
import './features/cheater-detection/rules/account/identical-upload-rule';
import './features/cheater-detection/rules/account/aggregate-speed-rule';

/**
 * Initialisation de l'extension
 */
function init() {
  console.log('[C411Tools] Initialisation...');
  
  // Initialisation des fonctionnalités
  initializeUserProfile();
  initializeBBCodeGenerator();
  
  // Initialisation du centre de modération global (Hub multi-outils)
  new ModerationCenter();
}

// Lancement
init();
