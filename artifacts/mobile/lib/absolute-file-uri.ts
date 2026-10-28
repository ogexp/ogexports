/**
 * Expo asset APIs may return a filesystem path instead of a file:// URI on
 * Android. expo-file-system's native File methods require an absolute URI.
 */
export function absoluteFileUri(value: string): string {
  const location = value.trim();

  if (/^file:\/\//i.test(location)) return location;

  const singleSlashFileUri = location.match(/^file:(\/.*)$/i);
  if (singleSlashFileUri) return `file://${singleSlashFileUri[1]}`;

  if (location.startsWith('/')) return `file://${location}`;

  throw new Error('The file path is not an absolute local URI.');
}
