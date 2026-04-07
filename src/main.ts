import { initializeUserProfile } from './features/cheater-detection/user-profile';
import { initializeBBCodeGenerator } from './features/bbcode-generator/c411-generator';

// Importation des règles
import './features/cheater-detection/rules/high-ratio-rule';
import './features/cheater-detection/rules/high-upload-rule';
import './features/cheater-detection/rules/suspicious-speed-rule';
import './features/cheater-detection/rules/late-activity-rule';
import './features/cheater-detection/rules/impossible-ratio-rule';
import './features/cheater-detection/rules/dominance-rule';

/**
 * Initialisation de l'extension
 */
function init() {
  console.log('[C411Tools] Initialisation...');
  
  // Initialisation des fonctionnalités
  initializeUserProfile();
  initializeBBCodeGenerator();
}

// Lancement
init();
