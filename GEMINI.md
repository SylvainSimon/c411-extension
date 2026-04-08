# Gemini Instructions - C411 Tools (TypeScript MVC Edition)

Ce document définit les standards techniques et fonctionnels pour le développement de l'extension C411 Tools. Il sert de contexte de référence pour garantir la cohérence du projet au fil des sessions.

---

## 🎯 Description Fonctionnelle

C411 Tools est une extension Chrome conçue pour les modérateurs et uploadeurs du site C411.org (une plateforme de partage Nuxt). Elle propose deux fonctionnalités majeures :

### 1. Détection de Tricheurs (Cheater Detection)
L'outil analyse l'historique de téléchargement (snatches) d'un utilisateur pour détecter des anomalies statistiques suggérant une triche (ex: seedbox survitaminée ou modification de client).
- **Déclenchement** : Un bouton "Analyser tricheur" est injecté sur les pages de profil (`/user/ID` ou `/users/ID`).
- **Analyse en deux passes** :
    1. **Passe Rapide** : Récupère l'intégralité de l'historique via `/api/users/{id}/snatch-history`. Calcule les ratios et débits pour chaque torrent.
    2. **Analyse Profonde** : Pour les 5 torrents les plus suspects, interroge les métadonnées (`/api/torrents/{hash}`) et le classement (`/api/torrents/{hash}/snatchers`) pour confirmer la triche.
- **Règles Heuristiques** :
    - **Ratio élevé** : Ratio d'upload > seuil (défaut: 25).
    - **Débit suspect** : Vitesse d'envoi moyenne > 1 Gbps (125 Mo/s).
    - **Activité tardive** : Téléchargement débuté plus de 24h après la sortie alors qu'un ratio énorme est atteint (peu probable sans triche).
    - **Domination** : L'utilisateur a envoyé X fois plus que le second meilleur uploader sur le même torrent.
    - **Ratio impossible** : L'utilisateur a un ratio supérieur au nombre total de complétions du torrent (mathématiquement impossible sans triche).
- **Action** : Synthétise les preuves dans un motif de ban suggéré et propose un bouton pour bannir l'utilisateur via `/api/team-pending/users/{id}/ban`.

### 2. Générateur de BBCode (BBCode Generator)
Automatise la création de fiches de présentation pour les films lors de l'upload.
- **Déclenchement** : Un bouton "🎬 Générer BBCode" est injecté sur la page `/upload` à côté du champ "Nom de release".
- **Flux** : 
    1. Extrait le titre et l'année du nom du torrent (ex: `Film.Name.2024...`).
    2. Recherche sur **TMDB** via son API.
    3. Si plusieurs résultats, affiche un sélecteur graphique pour que l'utilisateur choisisse le bon film.
    4. Récupère les détails (casting, réalisateur, pays, affiche, note).
    5. Formate le tout via un template Twig (`presentation.twig`) et le copie dans le presse-papier.

---

## 🏗 Architecture MVC & Responsabilités

- **Modèles (`src/types/`)** : Interfaces TypeScript strictes. Aucune définition locale autorisée.
- **Vues (`src/templates/`)** : Fichiers `.twig`. Séparés du code TS. Importés via `?raw`.
- **Contrôleurs (`src/features/`)** : Logique métier et manipulation du DOM (via `MutationObserver` pour gérer le SPA Nuxt).
- **Coeur (`src/core/`)** : Clients API (`C411ApiClient`, `TmdbApiClient`), Config et Utilitaires de formatage.

---

## 📏 Standards & Conventions

### Normalisation des Données
- **Dates** : Toujours utiliser `FormatUtils.parseDate()` (force l'interprétation UTC pour corriger les décalages de l'API).
- **Nombres** : `FormatUtils.formatNumber()` (Notation française : espaces insécables, arrondi à l'entier au-delà de 1000).
- **Durées** : `FormatUtils.formatDuration()` (Padding des zéros obligatoire : `2h05` et non `2h5`).

### Sécurité & Confidentialité
- **Identité Git** : `Grindelwald <grindelwald-himself@proton.me>`.
- **Secrets** : Pas de clé API versionnée. Stockage via `chrome.storage.sync`.

### Workflow
- `npm run dev` pour le développement (Vite + HMR).
- `npx tsc --noEmit` pour valider les types avant chaque commit.
