export type Preset = { name: string; description: string; mode: string; codec: string; crf: number; width?: number; quality: number; removeAudio: boolean };

// Platform profiles are conservative export targets, not guarantees of platform acceptance.
// The app applies a maximum width; source aspect ratio is preserved.
export const presets: Record<string, Preset> = {
  'instagram-reels': { name: 'Instagram Reels', description: 'MP4 H.264, largura até 1080 px, proporção de origem', mode: 'platform', codec: 'libx264', crf: 20, width: 1080, quality: 90, removeAudio: false },
  'instagram-stories': { name: 'Instagram Stories', description: 'MP4 H.264, largura até 1080 px, proporção de origem', mode: 'platform', codec: 'libx264', crf: 20, width: 1080, quality: 90, removeAudio: false },
  'instagram-feed': { name: 'Instagram Feed', description: 'MP4 H.264, largura até 1080 px, proporção de origem', mode: 'platform', codec: 'libx264', crf: 21, width: 1080, quality: 88, removeAudio: false },
  tiktok: { name: 'TikTok', description: 'MP4 H.264, largura até 1080 px, proporção de origem', mode: 'platform', codec: 'libx264', crf: 20, width: 1080, quality: 90, removeAudio: false },
  'youtube-shorts': { name: 'YouTube Shorts', description: 'MP4 H.264, largura até 1080 px, proporção de origem', mode: 'platform', codec: 'libx264', crf: 20, width: 1080, quality: 90, removeAudio: false },
  youtube: { name: 'YouTube tradicional', description: 'MP4 H.264, largura até 1920 px, proporção de origem', mode: 'platform', codec: 'libx264', crf: 20, width: 1920, quality: 90, removeAudio: false },
  maximum: { name: 'Qualidade máxima', description: 'H.264 CRF 16, sem redução de dimensão', mode: 'clean-reencode', codec: 'libx264', crf: 16, quality: 100, removeAudio: false },
  balanced: { name: 'Equilibrado', description: 'H.264 CRF 20, sem redução de dimensão', mode: 'clean-reencode', codec: 'libx264', crf: 20, quality: 88, removeAudio: false },
  compact: { name: 'Compressão compacta', description: 'H.264 CRF 28, sem redução de dimensão', mode: 'clean-reencode', codec: 'libx264', crf: 28, quality: 75, removeAudio: false },
};

export function validatePreset(preset: Preset) {
  if (!['clean-reencode', 'platform'].includes(preset.mode)) throw new Error('Modo de preset inválido.');
  if (preset.codec !== 'libx264') throw new Error('Codec não suportado pelo perfil.');
  if (!Number.isInteger(preset.crf) || preset.crf < 0 || preset.crf > 51) throw new Error('CRF do preset inválido.');
  if (preset.width !== undefined && (!Number.isInteger(preset.width) || preset.width < 16 || preset.width > 16384)) throw new Error('Dimensão do preset inválida.');
  if (!Number.isInteger(preset.quality) || preset.quality < 1 || preset.quality > 100) throw new Error('Qualidade de imagem do preset inválida.');
  return preset;
}
