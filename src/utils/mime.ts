/**
 * Allowed MIME types, extensions and category mapping for DROPONCE.
 */

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB (Supabase Storage free tier)
export const MAX_SESSION_QUOTA_BYTES = 150 * 1024 * 1024; // 150 MB session quota

export interface FileTypeInfo {
  label: string;
  category: 'image' | 'document' | 'spreadsheet' | 'presentation' | 'archive' | 'code' | 'audio' | 'video' | 'other';
  color: string;
}

export function categorizeFile(filename: string, mimeType?: string): FileTypeInfo {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif', 'bmp', 'ico'].includes(ext) || mimeType?.startsWith('image/')) {
    return { label: ext.toUpperCase() || 'IMAGE', category: 'image', color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400' };
  }
  if (['pdf'].includes(ext) || mimeType === 'application/pdf') {
    return { label: 'PDF', category: 'document', color: 'from-red-500/20 to-orange-500/20 text-rose-400' };
  }
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) {
    return { label: ext.toUpperCase(), category: 'document', color: 'from-blue-500/20 to-indigo-500/20 text-blue-400' };
  }
  if (['xls', 'xlsx', 'csv', 'tsv', 'ods'].includes(ext)) {
    return { label: ext.toUpperCase(), category: 'spreadsheet', color: 'from-emerald-500/20 to-green-500/20 text-emerald-400' };
  }
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) {
    return { label: ext.toUpperCase(), category: 'presentation', color: 'from-amber-500/20 to-yellow-500/20 text-amber-400' };
  }
  if (['zip', 'tar', 'gz', '7z', 'rar', 'bz2', 'xz'].includes(ext)) {
    return { label: ext.toUpperCase(), category: 'archive', color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400' };
  }
  if (['txt', 'md', 'json', 'xml', 'yaml', 'yml', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'go', 'rs', 'sh'].includes(ext)) {
    return { label: ext.toUpperCase(), category: 'code', color: 'from-purple-500/20 to-violet-500/20 text-purple-400' };
  }

  return { label: ext.toUpperCase() || 'FILE', category: 'other', color: 'from-gray-500/20 to-zinc-500/20 text-gray-300' };
}
