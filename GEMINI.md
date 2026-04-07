# Gemini Instructions - C411 Tools (TypeScript Edition)

Ce document définit les standards techniques et architecturaux pour le développement de l'extension C411 Tools via **Vite** et **TypeScript**.

## Workflow de Développement

### Commandes
- **`npm install`** : À lancer une seule fois pour installer les dépendances.
- **`npm run dev`** : Lance le serveur de développement Vite. Compile en temps réel dans le dossier `dist/`.
- **`npm run build`** : Génère la version finale optimisée dans `dist/`.

### Installation dans Chrome
1. Allez sur `chrome://extensions/`.
2. Activez le "Mode développeur".
3. Cliquez sur "Charger l'extension non empaquetée".
4. Sélectionnez le dossier **`dist/`** (généré par Vite).

---

## Architecture & Responsabilités

### Structure (Dossier `src/`)
- **`core/config/`** : Configuration globale (`AppConfig`).
- **`core/api/`** : Client technique pur avec interfaces de données C411.
- **`features/cheater-detection/`** : Orchestrateur et système de règles.
- **`features/bbcode-generator/`** : Logique TMDB et injection.
- **`main.ts`** : Point d'entrée des scripts de contenu.

### Standards TypeScript
- **Pas de `any`** : Toujours utiliser des interfaces ou des types explicites.
- **Imports/Exports** : Utiliser les modules ES. Ne plus utiliser `window` ou d'IIFE manuelle.
- **Interfaces Coeurs** :
  - `SnatchData` : Données brutes de l'API.
  - `SnatchStats` : Métriques calculées.
  - `AnalysisResult` : Résultat complet de l'analyseur.
  - `CheatRule` : Interface pour les règles de détection.

---

## Règles de Codage

### Sécurité
- Les clés API (TMDB) doivent être renseignées par l'utilisateur dans la page d'options.
- Utiliser `chrome.storage.sync` pour stocker les réglages.

### Performance
- **Rate Limiting** : Utiliser `Config.apiRateLimit` (200ms par défaut).
- **Analyse Profonde** : Limitée par `Config.deepAnalysisLimit` (Top 5).

### Maintenance du Manifest
Le `manifest.json` se trouve dans `src/`. Toute modification doit être faite dans ce fichier. Vite gère la mise à jour automatique des chemins compilés.
