/**
 * Parser pour analyser la structure d'un titre de série
 * Format attendu : [Titre].ANNEE.[Saison/Episode/INTEGRALE].[Flags?].[Langue].[Résolution].[Source].[Détails?].[Audio].[Vidéo]-[TAG]
 */
const SerieTitleParser = {
  /**
   * Parse un titre de série et extrait ses composants
   * @param {string} title - Le titre à parser
   * @returns {Object} Objet contenant les différents champs identifiés
   */
  parse(title) {
    const parts = title.split('.');
    const result = {
      raw: title,
      parts: parts,
      year: null,
      yearIndex: -1,
      seasonEpisode: null,
      seasonEpisodeIndex: -1,
      isIntegrale: false,
      integraleIndex: -1,
      flags: [],
      flagsIndex: [],
      language: null,
      languageIndex: -1,
      resolution: null,
      resolutionIndex: -1,
      source: null,
      sourceIndex: -1,
      details: [],
      audioCodec: null,
      audioCodecIndex: -1,
      videoCodec: null,
      videoCodecIndex: -1,
      tag: null
    };

    // Extraction du TAG (toujours à la fin après un tiret)
    const tagMatch = title.match(/-([A-Za-z0-9]+)$/);
    if (tagMatch) {
      result.tag = tagMatch[1];
    }

    // Recherche de l'année, saison/épisode, INTEGRALE et flags
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const upperPart = part.toUpperCase();

      // Année
      if (Patterns.YEAR_PATTERN.test(part) && result.year === null) {
        result.year = part;
        result.yearIndex = i;
      }

      // Saison/Episode (S01, S01E01, etc.)
      if (Patterns.SEASON_PATTERN.test(part)) {
        result.seasonEpisode = part;
        result.seasonEpisodeIndex = i;
      }

      // INTEGRALE ou COMPLETE (COMPLETE est incorrect mais on le détecte pour éviter l'erreur de saison manquante)
      if (upperPart === 'INTEGRALE' || upperPart === 'COMPLETE') {
        result.isIntegrale = true;
        result.integraleIndex = i;
      }

      // Flags composés (ex: DIRECTORS.CUT)
      if (i < parts.length - 1) {
        const composedFlag = `${upperPart}.${parts[i + 1].toUpperCase()}`;
        if (Patterns.FLAGS.includes(composedFlag)) {
          result.flags.push(`${part}.${parts[i + 1]}`);
          result.flagsIndex.push(i);
          i++; // Skip next part as it's part of the composed flag
          continue;
        }
      }

      // Flags simples
      if (Patterns.FLAGS.includes(upperPart)) {
        result.flags.push(part);
        result.flagsIndex.push(i);
      }
    }

    // Recherche de la langue
    for (let i = 0; i < parts.length; i++) {
      if (Patterns.LANGUAGES.includes(parts[i].toUpperCase())) {
        result.language = parts[i];
        result.languageIndex = i;
        break;
      }
    }

    // Recherche de la résolution
    for (let i = 0; i < parts.length; i++) {
      if (Patterns.RESOLUTIONS.includes(parts[i])) {
        result.resolution = parts[i];
        result.resolutionIndex = i;
        break;
      }
    }

    // Recherche de la source
    for (let i = 0; i < parts.length; i++) {
      const upperPart = parts[i].toUpperCase();
      if (Patterns.SOURCES.includes(upperPart)) {
        result.source = parts[i];
        result.sourceIndex = i;
        break;
      }
    }

    // Recherche des détails optionnels
    for (const part of parts) {
      const upperPart = part.toUpperCase();
      if (Patterns.DETAILS.includes(upperPart)) {
        result.details.push(part);
      }
    }

    // Recherche du codec audio (peut être composé de plusieurs parties : codec.technologie.canaux)
    // Exemples : AAC.5.1, TRUEHD.ATMOS.7.1, DTS.HD.MA.7.1
    for (let i = 0; i < parts.length; i++) {
      let currentPart = parts[i];

      // Si la partie contient un tiret, extraire la partie avant le tiret
      // (cas où le codec est collé au tag : "AC3-Nyu")
      if (currentPart.includes('-')) {
        currentPart = currentPart.split('-')[0];
      }

      const upperPart = currentPart.toUpperCase();

      // Vérifie si c'est un codec audio
      if (Patterns.AUDIO_CODECS.includes(upperPart)) {
        let audioString = currentPart;
        let offset = 0;

        // Vérifie si suivi de détails du codec (HD, MA, ATMOS, canaux)
        for (let j = i + 1; j < parts.length && j < i + 4; j++) {
          let nextPart = parts[j];

          // Extraire la partie avant le tiret si présent
          if (nextPart.includes('-')) {
            nextPart = nextPart.split('-')[0];
          }

          const upperNextPart = nextPart.toUpperCase();

          // Technologies/formats : HD, MA, ATMOS
          if (Patterns.AUDIO_TECHNOLOGIES.includes(upperNextPart)) {
            audioString += `.${nextPart}`;
            offset++;
            continue;
          }

          // Canaux audio (format X.Y comme 5.1, 7.1, 2.0)
          if (Patterns.AUDIO_CHANNELS_PATTERN.test(upperNextPart)) {
            audioString += `.${nextPart}`;
            offset++;
            break; // Les canaux sont le dernier élément
          }

          // Si ce n'est ni une technologie ni des canaux, on s'arrête
          break;
        }

        result.audioCodec = audioString;
        result.audioCodecIndex = i;
        break;
      }
    }

    // Recherche du codec vidéo (doit être après le codec audio et avant le tag)
    const allVideoCodecs = [...Patterns.VIDEO_CODECS_ACCEPTED, ...Patterns.VIDEO_CODECS_OLD];

    for (let i = 0; i < parts.length; i++) {
      let currentPart = parts[i];

      // Si la partie contient un tiret, extraire la partie avant le tiret
      if (currentPart.includes('-')) {
        currentPart = currentPart.split('-')[0];
      }

      const upperPart = currentPart.toUpperCase();

      // Vérifie les patterns
      if (allVideoCodecs.some(codec => upperPart.includes(codec))) {
        result.videoCodec = currentPart;
        result.videoCodecIndex = i;
        break;
      }
    }

    return result;
  }
};
