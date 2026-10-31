/**
 * Formata segundos em formato HH:MM:SS ou MM:SS
 */
export function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';

  const totalSecs = Math.floor(seconds);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSecs = String(secs).padStart(2, '0');

  if (hours > 0) {
    const paddedHours = String(hours).padStart(2, '0');
    return `${paddedHours}:${paddedMinutes}:${paddedSecs}`;
  }

  return `${paddedMinutes}:${paddedSecs}`;
}

/**
 * Formata bytes em tamanho legível (MB, GB)
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
