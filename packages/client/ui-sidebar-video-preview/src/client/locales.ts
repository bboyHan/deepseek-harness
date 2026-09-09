/** `sidebarVideoPreview` namespace dictionaries. */

/** Locale namespace. */
export const NS = 'sidebarVideoPreview'

/** Simplified Chinese dictionary. */
export const zh = {
  loading: '正在读取视频元数据...',
  changed: '文件已更新。重新载入后会播放最新版本。',
  reloadNow: '重新载入',
  reload: '重新读取文件',
  retry: '重试',
  openExternal: '用系统默认应用打开',
  openingExternal: '正在打开...',
  openInWindow: '在新窗口打开',
  download: '下载视频',
  videoLabel: '视频预览',
  fileSize: '文件大小：{size}',
  duration: '时长：{duration}',
  resolution: '分辨率：{resolution}',
  errorAborted: '视频加载已取消。',
  errorNetwork: '视频读取失败，请重新载入或下载后查看。',
  errorDecode: '浏览器无法解码这个视频。请下载或用系统默认应用打开。',
  errorUnsupported: '浏览器不支持当前视频编码或容器。请下载或用系统默认应用打开。',
  errorOpenFailed: '无法打开系统默认应用：{message}',
  errorUnavailable: '视频预览失败：{message}',
} satisfies Record<string, string>

/** Video locale key union. */
export type SidebarVideoPreviewKey = keyof typeof zh

/** English dictionary with the same key set. */
export const en = {
  loading: 'Reading video metadata...',
  changed: 'The file changed. Reload to play the latest version.',
  reloadNow: 'Reload',
  reload: 'Read the file again',
  retry: 'Retry',
  openExternal: 'Open in the system default app',
  openingExternal: 'Opening...',
  openInWindow: 'Open in a new window',
  download: 'Download video',
  videoLabel: 'Video preview',
  fileSize: 'File size: {size}',
  duration: 'Duration: {duration}',
  resolution: 'Resolution: {resolution}',
  errorAborted: 'Video loading was cancelled.',
  errorNetwork: 'Video reading failed. Reload it or download it to inspect the file.',
  errorDecode: 'The browser cannot decode this video. Download it or open it in the system default app.',
  errorUnsupported: 'The browser does not support this video codec or container. Download it or open it in the system default app.',
  errorOpenFailed: 'Could not open the system default app: {message}',
  errorUnavailable: 'Video preview failed: {message}',
} satisfies Record<SidebarVideoPreviewKey, string>
