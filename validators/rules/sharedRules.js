/**
 * Règles de validation partagées entre Films et Séries
 */
const SharedRules = {
  /**
   * Vérifie la présence et la validité de la langue
   */
  checkLanguage(title, parser) {
    const parsed = parser.parse(title);

    if (!parsed.language) {
      return {
        rule: '❌ Langue absente ou invalide',
        message: 'Le titre ne contient pas d\'indication de langue valide.',
        suggestion: 'Ajoute la langue (TRUEFRENCH, MULTI.VFF, MULTI.VFQ, MULTI.VFI, MULTI.VF2, MULTI.TRUEFRENCH, VOSTFR, VFF, VFQ, VFI, VOF).'
      };
    }

    return null;
  },

  /**
   * Vérifie que MULTI est suivi d'une précision de langue française
   */
  checkMultiLanguage(title) {
    const parts = title.split('.');

    for (let i = 0; i < parts.length; i++) {
      if (parts[i].toUpperCase() === 'MULTI') {
        const nextPart = parts[i + 1];

        if (!nextPart || !Patterns.MULTI_FOLLOWUPS.includes(nextPart.toUpperCase())) {
          return {
            rule: '❌ MULTI incomplet',
            message: 'MULTI doit être suivi de la précision sur la langue française.',
            suggestion: 'Utilise MULTI.VFF, MULTI.VFQ, MULTI.VFI, MULTI.VF2 ou MULTI.TRUEFRENCH.'
          };
        }
      }
    }

    return null;
  },

  /**
   * Vérifie la présence de la résolution (optionnelle pour < 720p)
   */
  checkResolution(title, parser) {
    const parsed = parser.parse(title);

    // La résolution est optionnelle pour les sources de faible qualité (< 720p)
    // Donc optionnelle pour DVDRip, DVD, sources anciennes, etc.
    // Elle n'est obligatoire que pour 720p et supérieur

    // Si pas de résolution, on considère que c'est < 720p donc OK
    if (!parsed.resolution) {
      return null;
    }

    return null;
  },

  /**
   * Vérifie la présence et la validité de la source
   */
  checkSource(title, parser) {
    const parsed = parser.parse(title);

    if (!parsed.source) {
      return {
        rule: '❌ Source absente ou invalide',
        message: 'Le titre ne contient pas de source valide.',
        suggestion: 'Ajoute la source (BLURAY, WEB, WEBRIP, WEBDL, DVDRIP, BDRIP, HDRIP, DVD).'
      };
    }

    return null;
  },

  /**
   * Vérifie l'usage de WEB-DL et conseille WEB
   */
  checkWebDLNotation(title) {
    if (title.includes('WEB-DL')) {
      return {
        rule: '⚠️ WEB-DL déconseillé',
        message: 'La notation WEB-DL est détectée.',
        suggestion: 'Utilise WEB à la place de WEB-DL. N\'oublie pas d\'indiquer l\'origine de la release dans la description (Disney+, Netflix, HBO, etc.).'
      };
    }

    return null;
  },

  /**
   * Vérifie l'usage de HDR10+ et exige HDR10PLUS
   */
  checkHDR10PlusNotation(title) {
    // Le + est un caractère spécial, on cherche HDR10 suivi de +
    if (title.toUpperCase().includes('HDR10+')) {
      return {
        rule: '❌ HDR10+ invalide',
        message: 'La notation HDR10+ est détectée avec le caractère +.',
        suggestion: 'Utilise HDR10PLUS sans le caractère + (les caractères spéciaux ne sont pas autorisés).'
      };
    }

    return null;
  },

  /**
   * Vérifie la présence et la validité du codec vidéo
   */
  checkVideoCodec(title) {
    const upperTitle = title.toUpperCase();

    const hasAcceptedCodec = Patterns.VIDEO_CODECS_ACCEPTED.some(codec => upperTitle.includes(codec));
    const hasOldCodec = Patterns.VIDEO_CODECS_OLD.some(codec => upperTitle.includes(codec.replace('.', '')));

    if (hasOldCodec) {
      return {
        rule: '⚠️ Codec ancien détecté',
        message: 'Le titre contient un codec vidéo ancien (H.262/XVID).',
        suggestion: 'Ces codecs ne sont acceptés qu\'à titre exceptionnel pour les médias très anciens si aucune version supérieure n\'est disponible. Si possible, privilégie x264 ou x265.'
      };
    }

    if (!hasAcceptedCodec && !hasOldCodec) {
      return {
        rule: '❌ Codec vidéo absent ou invalide',
        message: 'Le titre ne contient pas de codec vidéo valide.',
        suggestion: 'Ajoute le codec vidéo : x264 (H.264/AVC), x265 (H.265/HEVC) ou SVT-AV1 (AV1).'
      };
    }

    return null;
  },

  /**
   * Vérifie l'absence d'encodeurs GPU interdits
   */
  checkGPUEncoder(title) {
    const upperTitle = title.toUpperCase();

    for (const encoder of Patterns.GPU_ENCODERS_FORBIDDEN) {
      if (upperTitle.includes(encoder)) {
        return {
          rule: `❌ Encodeur GPU (${encoder})`,
          message: `Le titre contient un encodeur GPU (${encoder}) qui est interdit.`,
          suggestion: 'Les encodeurs GPU (NVENC, QSV, AMF) sont interdits. Utilise uniquement les encodeurs CPU : x264, x265 ou SVT-AV1.'
        };
      }
    }

    return null;
  },

  /**
   * Vérifie la présence du codec audio
   */
  checkAudioCodec(title, parser) {
    const parsed = parser.parse(title);

    if (!parsed.audioCodec) {
      return {
        rule: '❌ Codec audio absent ou invalide',
        message: 'Le titre ne contient pas de codec audio valide.',
        suggestion: 'Ajoute le codec audio (AAC, AC3, DD, EAC3, DDP, DTS, DTS-HD, DTS-MA, TrueHD, FLAC, OPUS, MP3).'
      };
    }

    return null;
  },

  /**
   * Vérifie la correspondance avec le titre TMDB si disponible
   * @param {string} title - Le titre à vérifier
   * @param {Object} parser - Le parser à utiliser (FilmTitleParser ou AnimationTitleParser)
   */
  checkTmdbTitle(title, parser) {
    // Si le parser est fourni et que c'est une collection, skip la vérification TMDB
    if (parser) {
      const parsed = parser.parse(title);
      if (parsed.isCollection) {
        return null; // Pas de vérification TMDB pour les collections
      }
    }

    const tmdbTitle = TmdbDetector.detectTmdbTitle();

    // Si pas de titre TMDB trouvé, pas d'erreur
    if (!tmdbTitle) {
      return null;
    }

    // Compare les titres
    if (!TmdbDetector.compareTitles(title, tmdbTitle)) {
      const userTitle = TmdbDetector.extractTorrentTitleRaw(title);
      const displayTmdbTitle = TmdbDetector.formatTitleForDisplay(tmdbTitle);

      return {
        rule: '❌ Titre ne correspond pas à TMDB',
        message: `Le titre du torrent ne correspond pas au titre français de l'œuvre TMDB liée.`,
        suggestion: `Le titre TMDB (titre de commercialisation en France) est "${displayTmdbTitle}" mais le titre du torrent commence par "${userTitle}". Tu dois utiliser le titre français de commercialisation et non le titre original. N'oublie pas d'appliquer les règles de nommage (points au lieu d'espaces, pas d'accents ni de caractères spéciaux). Vérifie la fiche TMDB liée et consulte les règles : https://wiki.c411.ch/fr/upload/naming`
      };
    }

    return null;
  },

  /**
   * Vérifie l'ordre des codecs (audio avant vidéo, et après la source)
   */
  checkCodecOrder(title, parser) {
    const parsed = parser.parse(title);

    // 1. Vérifie que l'audio est avant la vidéo
    if (parsed.audioCodecIndex !== -1 && parsed.videoCodecIndex !== -1) {
      if (parsed.audioCodecIndex > parsed.videoCodecIndex) {
        return {
          rule: '❌ Codecs inversés',
          message: 'Le codec audio doit être placé avant le codec vidéo.',
          suggestion: 'Place le codec audio avant le codec vidéo. Ordre attendu : [Source].[Détails].[Audio].[Vidéo]-[TAG]'
        };
      }
    }

    // 2. Vérifie que le codec vidéo est après la source
    if (parsed.videoCodecIndex !== -1 && parsed.sourceIndex !== -1) {
      if (parsed.videoCodecIndex < parsed.sourceIndex) {
        return {
          rule: '❌ Codec vidéo mal placé',
          message: 'Le codec vidéo est placé avant la source.',
          suggestion: 'Place le codec vidéo après la source. Ordre attendu : [Source].[Détails].[Audio].[Vidéo]-[TAG]'
        };
      }
    }

    // 3. Vérifie que le codec audio est après la source
    if (parsed.audioCodecIndex !== -1 && parsed.sourceIndex !== -1) {
      if (parsed.audioCodecIndex < parsed.sourceIndex) {
        return {
          rule: '❌ Codec audio mal placé',
          message: 'Le codec audio est placé avant la source.',
          suggestion: 'Place le codec audio après la source. Ordre attendu : [Source].[Détails].[Audio].[Vidéo]-[TAG]'
        };
      }
    }

    // 4. Vérifie que le codec vidéo est après la résolution (si résolution présente)
    if (parsed.videoCodecIndex !== -1 && parsed.resolutionIndex !== -1) {
      if (parsed.videoCodecIndex < parsed.resolutionIndex) {
        return {
          rule: '❌ Codec vidéo mal placé',
          message: 'Le codec vidéo est placé avant la résolution.',
          suggestion: 'Place le codec vidéo après la résolution et la source. Ordre attendu : [Résolution].[Source].[Détails].[Audio].[Vidéo]-[TAG]'
        };
      }
    }

    // 5. Vérifie que le codec audio est après la résolution (si résolution présente)
    if (parsed.audioCodecIndex !== -1 && parsed.resolutionIndex !== -1) {
      if (parsed.audioCodecIndex < parsed.resolutionIndex) {
        return {
          rule: '❌ Codec audio mal placé',
          message: 'Le codec audio est placé avant la résolution.',
          suggestion: 'Place le codec audio après la résolution et la source. Ordre attendu : [Résolution].[Source].[Détails].[Audio].[Vidéo]-[TAG]'
        };
      }
    }

    return null;
  }
};
