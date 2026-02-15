/**
 * Patterns et constantes centralisés pour la validation des titres
 */
const Patterns = {
  // Langues acceptées
  LANGUAGES: ['TRUEFRENCH', 'MULTI', 'VOSTFR', 'VFF', 'VFQ', 'VFI', 'VF2', 'VOF'],

  // Langues valides après MULTI
  MULTI_FOLLOWUPS: ['VFF', 'VFQ', 'VFI', 'VF2', 'TRUEFRENCH'],

  // Résolutions acceptées
  RESOLUTIONS: ['2160p', '1080p', '720p', '576p', '480p'],

  // Sources acceptées
  SOURCES: ['BLURAY', 'WEB', 'WEBRIP', 'WEBDL', 'WEB-DL', 'DVDRIP', 'BDRIP', 'HDRIP', 'DVD'],

  // Flags acceptés
  FLAGS: [
    'REPACK', 'PROPER', 'UNCENSORED', 'IMAX', 'UNRATED',
    'DIRECTORS.CUT', 'EXTENDED.CUT', 'THEATRICAL.CUT', 'UNRATED.CUT', 'FINAL.CUT',
    'INTEGRALE'
  ],

  // Détails optionnels
  DETAILS: ['4KLIGHT', 'REMUX', 'BDMV', 'DV', 'HDR10', 'HDR10PLUS', 'HDR', 'SDR', 'DOLBYVISION'],

  // Codecs audio
  AUDIO_CODECS: ['TRUEHD', 'DDP', 'AAC', 'AC3', 'DD', 'FLAC', 'DTS', 'MP3', 'EAC3', 'HE-AAC'],

  // Technologies/formats audio
  AUDIO_TECHNOLOGIES: ['HD', 'MA', 'ATMOS'],

  // Codecs vidéo acceptés
  VIDEO_CODECS_ACCEPTED: ['X264', 'X265', 'SVT-AV1', 'AV1', 'HEVC', 'AVC', 'H264', 'H265', 'H266'],

  // Codecs vidéo anciens (acceptés exceptionnellement)
  VIDEO_CODECS_OLD: ['XVID', 'H262', 'MPEG-2', 'MPEG2'],

  // Encodeurs GPU interdits
  GPU_ENCODERS_FORBIDDEN: ['NVENC', 'QSV', 'AMF'],

  // Pattern pour les années
  YEAR_PATTERN: /^\d{4}$/,

  // Pattern pour les saisons/épisodes
  SEASON_PATTERN: /^S\d{1,2}(E\d{1,2})?$/i,

  // Pattern pour les canaux audio (format X.Y)
  AUDIO_CHANNELS_PATTERN: /^\d+\.\d+$/
};
