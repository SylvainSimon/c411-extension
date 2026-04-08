# C411 Tools

Extension Chrome moderne (Manifest V3) pour le site C411.org, offrant des outils avancés de détection de tricheurs et d'automatisation d'upload.

## 🚀 Fonctionnalités

- **Analyseur de triche** : Analyse heuristique profonde des profils utilisateurs.
    - Détection de ratios impossibles.
    - Identification d'uploads synchronisés (patterns de fake upload).
    - Analyse des débits suspects (> 1 Gbps).
    - Synthèse automatique des preuves pour le motif de ban.
- **Générateur de BBCode** : Création automatique de présentations de films via l'API TMDB.
- **MVC & Twig** : Architecture solide séparant la logique métier des vues HTML.

## 🛠 Installation

### 1. Prérequis
- **Node.js** (v18 ou supérieur recommandé)
- **NPM** (inclus avec Node.js)

### 2. Cloner et installer
```bash
# Clonez le repository (ou téléchargez les sources)
cd c411-extension

# Installez les dépendances
npm install
```

### 3. Charger dans Chrome
1. Lancez la compilation en mode développement :
   ```bash
   npm run dev
   ```
2. Ouvrez Chrome et allez sur `chrome://extensions/`.
3. Activez le **Mode développeur** (en haut à droite).
4. Cliquez sur **Charger l'extension non empaquetée**.
5. Sélectionnez le dossier **`dist/`** à la racine de ce projet.

## 💻 Développement

L'extension utilise un workflow moderne basé sur **Vite** et **TypeScript**.

### Commandes utiles
- `npm run dev` : Lance le serveur de build en temps réel. Toute modification dans `src/` est immédiatement répercutée dans l'extension.
- `npm run build` : Génère une version de production optimisée.
- `npx tsc --noEmit` : Vérifie l'intégrité des types TypeScript.

### Structure du projet
- `src/core/` : Clients API (C411, TMDB), configuration et utilitaires système.
- `src/features/` : Logique métier découpée par fonctionnalité.
- `src/templates/` : Fichiers `.twig` pour l'interface utilisateur.
- `src/types/` : Interfaces TypeScript centralisées.
- `src/main.ts` : Point d'entrée unique de l'extension.

## 🧪 Ajouter une règle de détection
Pour ajouter une nouvelle vérification de triche :
1. Créez un fichier dans `src/features/cheater-detection/rules/votre-regle-rule.ts`.
2. Enregistrez-la via `CheatRuleRegistry.register({ ... })`.
3. Importez votre fichier dans `src/main.ts`.

## ⚙️ Configuration
Après l'installation, n'oubliez pas de configurer votre **clé API TMDB** dans les options de l'extension (Clic droit sur l'icône -> Options) pour activer le générateur de BBCode.

---
Développé avec ❤️ par Grindelwald.
