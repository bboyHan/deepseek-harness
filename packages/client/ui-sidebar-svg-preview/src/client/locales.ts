/** `sidebarSvgPreview` namespace dictionaries. */

/** Locale namespace. */
export const NS = 'sidebarSvgPreview'

/** Simplified Chinese dictionary and key-set source of truth. */
export const zh = {
  loading: '正在读取 SVG...',
  changed: '文件已被修改，显示的还是旧内容。',
  reloadNow: '重新载入',
  reload: '重新读取文件',
  retry: '重试',
  tooLarge: 'SVG 超过 {limit}，侧栏不会继续读取。',
  incomplete: 'SVG 读取未完成。',
  invalidUtf8: 'SVG 不是有效的 UTF-8 文本。',
  unsafeContent: 'SVG 含有不允许的脚本、嵌入内容或外部资源引用。',
  invalidDocument: 'SVG 文档无效，无法显示。',
  fileSize: '文件大小：{size}',
  activeContentRemoved: '已移除不安全内容，保留其余 SVG 内容。',
  externalResourcesRemoved: '已移除外部资源，保留其余 SVG 内容。',
  externalResourcesLoaded: '此 SVG 使用了外部资源，预览会向对应网站发起网络请求。',
  'error.notFound': '这个文件不在了。可能已被移动或删除。',
  'error.outsideWorkspace': '这个文件在工作区之外，侧栏不会读取它。',
  'error.notRegularFile': '这不是一个普通文件，没有可显示的内容。',
  'error.unavailable': '读取失败：{message}',
} satisfies Record<string, string>

/** SVG-preview dictionary key union. */
export type SidebarSvgPreviewKey = keyof typeof zh

/** English dictionary, checked against the Chinese key set. */
export const en = {
  loading: 'Reading SVG...',
  changed: 'The file has changed; this is the older preview.',
  reloadNow: 'Reload',
  reload: 'Read the file again',
  retry: 'Retry',
  tooLarge: 'The SVG is above {limit}, so the sidebar will not keep reading it.',
  incomplete: 'The SVG did not finish reading.',
  invalidUtf8: 'The SVG is not valid UTF-8 text.',
  unsafeContent: 'The SVG contains disallowed scripts, embedded content, or external resource references.',
  invalidDocument: 'The SVG document is invalid and cannot be shown.',
  fileSize: 'File size: {size}',
  activeContentRemoved: 'Disallowed active content was removed; the rest of the SVG is shown.',
  externalResourcesRemoved: 'External resources were removed; the rest of the SVG is shown.',
  externalResourcesLoaded: 'This SVG uses external resources; the preview may request them from their websites.',
  'error.notFound': 'That file is gone. It may have been moved or deleted.',
  'error.outsideWorkspace': 'That file is outside the workspace, so the sidebar will not read it.',
  'error.notRegularFile': 'That is not a regular file, so it has no content to show.',
  'error.unavailable': 'Read failed: {message}',
} satisfies Record<SidebarSvgPreviewKey, string>
