# Gemini Instructions - C411 Tools (TypeScript MVC Edition)

Ce document définit les standards techniques et fonctionnels pour le développement de l'extension C411 Tools. Il sert de contexte de référence pour garantir la cohérence du projet au fil des sessions.

---

## 🎯 Description Fonctionnelle

C411 Tools est une extension Chrome conçue pour les modérateurs et uploadeurs du site C411.org (une plateforme de partage Nuxt). Elle propose trois fonctionnalités majeures :

### 1. Centre de Modération (Moderation Center) - **NOUVEAU v0.4**
Un hub centralisé pour la surveillance proactive du site.
- **Interface** : Un bouton flottant injecté sur toutes les pages ouvre un overlay en **Shadow DOM**.
- **Outils intégrés** :
    - **Registration Tool** : Permet de scanner massivement les nouveaux inscrits sur une période donnée (ex: aujourd'hui, hier, semaine dernière).
    - **Leaderboard Tool** : Analyse les utilisateurs par rang (ex: Power User, Elite) ou via le classement général pour détecter les tricheurs "historiques".
- **Fonctionnalités** :
    - Scan multi-utilisateurs avec barre de progression.
    - Historique des sessions de scan stocké localement.
    - Filtrage en temps réel par "Pattern de suspicion" (Flags) dont un filtre spécifique "1 Snatch".
    - Tri des résultats (par Score, Date, Vitesse max, Ratio max, Retard max).
    - Interface en **Accordéon** : un clic sur une ligne suspecte dévoile une synthèse des torrents incriminés sans ouvrir de nouvelle popup.
    - Exportation/Synthèse des preuves pour le ban via `BanUtils`.

### 2. Détection de Tricheurs (Cheater Detection)
L'outil analyse l'historique de téléchargement (snatches) d'un utilisateur pour détecter des anomalies statistiques.
- **Architecture Modulaire** : Les règles sont enregistrées via `CheatRuleRegistry`.
- **Types de Règles** :
    - **Règles de Compte (`account`)** : Analyse globale du profil (ex: `IdenticalUploadRule`).
    - **Règles de Torrent (`torrent`)** :
        - **Pass Rapide (`snatch`)** : Analyse les métadonnées de base de l'historique (ex: `HighRatioRule`, `SuspiciousSpeedRule`).
        - **Analyse Profonde (`deep`)** : Requiert des appels API supplémentaires sur le torrent pour confirmer la triche (ex: `DominanceRule`, `LateActivityRule`, `ImpossibleRatioRule`).
- **Calculs Robustes** :
    - **Vitesse d'upload** : Utilise une méthode hybride croisant le temps de *leech* (via `completedAt`), le temps de *seed* déclaré, et la fenêtre temporelle globale (`lastAction - firstAction`) pour éviter les faux positifs causés par des annonces manquantes.
    - **Délais** : Les comparaisons de dates sont sécurisées et interprétées via `FormatUtils.parseDate()`.
- **Scoring** : Chaque règle génère un score de suspicion. Un utilisateur est marqué comme "suspect" si son score total dépasse les seuils configurés.

### 3. Générateur de BBCode (BBCode Generator)
Automatise la création de fiches de présentation pour les films lors de l'upload.
- **Déclenchement** : Un bouton "🎬 Générer BBCode" est injecté sur la page `/upload`.
- **Flux** : 
    1. Extraction intelligente du titre/année.
    2. Recherche **TMDB** avec sélecteur graphique si ambiguïté.
    3. Formatage via template Twig (`presentation.twig`) et copie dans le presse-papier.

---

## 🏗 Architecture & Responsabilités

- **Core (`src/core/`)** :
    - `api/` : Clients typés pour C411 et TMDB.
    - `utils/` : `FormatUtils` (dates/nombres/vitesses), `TemplateEngine` (Twig), `BanUtils` (génération centralisée de motifs), `sweetalert-theme.ts`.
- **Features (`src/features/`)** :
    - Logique métier découpée par domaine.
    - Utilisation intensive de `Shadow DOM` pour les overlays afin d'éviter les conflits CSS avec Nuxt.
    - `MutationObserver` pour l'injection dynamique dans le SPA.
- **Templates (`src/templates/`)** : Fichiers `.twig` importés via le plugin Vite `?raw`.
- **Types (`src/types/`)** : Définitions TypeScript strictes partagées.

---

## 📏 Standards & Conventions

### Normalisation des Données
- **Dates** : Toujours utiliser `FormatUtils.parseDate()` (force l'interprétation UTC).
- **Nombres** : `FormatUtils.formatNumber()` (Notation française : espaces insécables).
- **Vitesses** : `FormatUtils.formatSpeed()` (Conversion automatique en Mo/s ou Go/s).
- **Durées** : `FormatUtils.formatDuration()` (Padding des zéros : `2h05`).

### Interface Utilisateur (UI)
- **Isolation** : Toute UI complexe *doit* être encapsulée dans un `ShadowRoot`.
- **Boîtes de dialogue** : Utiliser exclusivement **SweetAlert2** via le mixin personnalisé `C411Swal` (`import { C411Swal as Swal } from '../../core/utils/sweetalert-theme'`) au lieu des fonctions natives `alert`, `confirm` ou `prompt`.
- **Design** : Respecter la charte graphique de C411 (couleurs sombres, accents bleus/verts).
- **Réactivité** : Gérer le chargement asynchrone (spinners, barres de progression) pour ne pas bloquer l'interface. Les listes massives doivent être rendues par blocs (chunks) via `requestAnimationFrame`.

### Workflow Technique
- **Version actuelle** : 0.4.0
- **Stack** : Vite 8 (moteur Rolldown), TypeScript 6, CRXJS.
- **Validation** : `npx tsc --noEmit` obligatoire. Utiliser `"moduleResolution": "bundler"` dans `tsconfig.json`.
- **Configuration Vite** :
    - Utiliser `rolldownOptions` au lieu de `rollupOptions` pour le build.
    - Un plugin de nettoyage (`fix-crxjs-platform`) est nécessaire dans `vite.config.ts` pour supprimer l'option injectée `platform` incompatible avec Rolldown.
- **Développement** : `npm run dev` (Vite + CRXJS).