/**
 * Parser pour analyser la structure d'un titre de film
 * Format attendu : [Titre].ANNEE.[Flags?].[Langue].[Résolution].[Source].[Détails?].[Audio].[Vidéo]-[TAG]
 */
const FilmTitleParser = {
  /**
   * Parse un titre de film et extrait ses composants
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

    // Patterns de flags
    const flagPatterns = [
      'REPACK', 'PROPER', 'UNCENSORED', 'IMAX', 'UNRATED',
      'DIRECTORS.CUT', 'EXTENDED.CUT', 'THEATRICAL.CUT', 'UNRATED.CUT', 'FINAL.CUT'
    ];

    // Recherche de l'année (format YYYY) et des flags
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // Année
      if (/^\d{4}$/.test(part) && result.year === null) {
        result.year = part;
        result.yearIndex = i;
      }

      // Flags (peuvent apparaître plusieurs fois, chercher les flags composés d'abord)
      const upperPart = part.toUpperCase();

      // Flags composés (ex: DIRECTORS.CUT)
      if (i < parts.length - 1) {
        const composedFlag = `${upperPart}.${parts[i + 1].toUpperCase()}`;
        if (flagPatterns.includes(composedFlag)) {
          result.flags.push(`${part}.${parts[i + 1]}`);
          result.flagsIndex.push(i);
          i++; // Skip next part as it's part of the composed flag
          continue;
        }
      }

      // Flags simples
      if (flagPatterns.includes(upperPart)) {
        result.flags.push(part);
        result.flagsIndex.push(i);
      }
    }

    // Recherche de la langue
    const languagePatterns = ['TRUEFRENCH', 'MULTI', 'VOSTFR', 'VFF', 'VFQ', 'VFI', 'VF2', 'VOF'];
    for (let i = 0; i < parts.length; i++) {
      if (languagePatterns.includes(parts[i].toUpperCase())) {
        result.language = parts[i];
        result.languageIndex = i;
        break;
      }
    }

    // Recherche de la résolution
    const resolutionPatterns = ['2160p', '1080p', '720p', '576p', '480p'];
    for (let i = 0; i < parts.length; i++) {
      if (resolutionPatterns.includes(parts[i])) {
        result.resolution = parts[i];
        result.resolutionIndex = i;
        break;
      }
    }

    // Recherche de la source
    const sourcePatterns = ['BLURAY', 'WEB', 'WEBRIP', 'WEBDL', 'WEB-DL', 'DVDRIP', 'BDRIP', 'HDRIP', 'DVD'];
    for (let i = 0; i < parts.length; i++) {
      const upperPart = parts[i].toUpperCase();
      if (sourcePatterns.includes(upperPart)) {
        result.source = parts[i];
        result.sourceIndex = i;
        break;
      }
    }

    // Recherche des détails optionnels
    const detailPatterns = ['4KLIGHT', 'REMUX', 'BDMV', 'DV', 'HDR10', 'HDR10PLUS', 'HDR', 'SDR', 'DOLBYVISION'];
    for (const part of parts) {
      const upperPart = part.toUpperCase();
      if (detailPatterns.includes(upperPart)) {
        result.details.push(part);
      }
    }

    // Recherche du codec audio (peut être composé de plusieurs parties : codec.technologie.canaux)
    // Exemples : AAC.5.1, TRUEHD.ATMOS.7.1, DTS.HD.MA.7.1
    const audioCodecPatterns = ['TRUEHD', 'DDP', 'AAC', 'AC3', 'DD', 'FLAC', 'DTS', 'MP3', 'EAC3', 'HE-AAC'];

    for (let i = 0; i < parts.length; i++) {
      let currentPart = parts[i];

      // Si la partie contient un tiret, extraire la partie avant le tiret
      // (cas où le codec est collé au tag : "AC3-Nyu")
      if (currentPart.includes('-')) {
        currentPart = currentPart.split('-')[0];
      }

      const upperPart = currentPart.toUpperCase();

      // Vérifie si c'est un codec audio
      if (audioCodecPatterns.includes(upperPart)) {
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
          if (['HD', 'MA', 'ATMOS'].includes(upperNextPart)) {
            audioString += `.${nextPart}`;
            offset++;
            continue;
          }

          // Canaux audio (format X.Y comme 5.1, 7.1, 2.0)
          if (/^\d+\.\d+$/.test(upperNextPart)) {
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
    const videoCodecPatterns = ['X264', 'X265', 'SVT-AV1', 'AV1', 'HEVC', 'AVC', 'H264', 'H265', 'H266', 'XVID', 'H262', 'MPEG-2', 'MPEG2'];

    for (let i = 0; i < parts.length; i++) {
      let currentPart = parts[i];

      // Si la partie contient un tiret, extraire la partie avant le tiret
      if (currentPart.includes('-')) {
        currentPart = currentPart.split('-')[0];
      }

      const upperPart = currentPart.toUpperCase();

      // Vérifie les patterns
      if (videoCodecPatterns.some(codec => upperPart.includes(codec))) {
        result.videoCodec = currentPart;
        result.videoCodecIndex = i;
        break;
      }
    }

    return result;
  }
};
