/** `sidebarPatchPreview` namespace dictionaries. */

/** Locale namespace. */
export const NS = 'sidebarPatchPreview'

/** Simplified Chinese dictionary and key-set source of truth. */
export const zh = {
  loading: '正在读取补丁...',
  changed: '文件已被修改，显示的还是旧内容。',
  reloadNow: '重新载入',
  reload: '重新读取补丁',
  retry: '重试',
  fileSize: '文件大小：{size}',
  truncatedText: '这里只显示补丁文件开头的一页。',
  hunkLimit: '补丁包含的变更区块太多，只显示前面的区块。',
  summary: '{files} 个文件，{hunks} 个变更区块，新增 {added} 行，删除 {removed} 行。',
  emptyPatch: '这个补丁没有可显示的变更。',
  invalidPatch: '补丁解析失败：{message}',
  'error.notFound': '这个补丁文件不在了。可能已被移动或删除。',
  'error.outsideWorkspace': '这个补丁文件在工作区之外，侧栏不会读取它。',
  'error.tooLarge': '补丁内容超过读取限制。',
  'error.notText': '这不是文本补丁文件，没法在这里查看。',
  'error.notRegularFile': '这不是一个普通文件，没有可显示的补丁。',
  'error.unavailable': '读取补丁失败：{message}',
  'diff.copy': '复制变更',
  'diff.copied': '复制成功',
  'diff.collapseAria': '收起变更',
  'diff.expandAria': '展开隐藏的 {hidden} 行变更',
  'diff.collapse': '收起',
  'diff.expand': '展开 {hidden} 行',
  'diff.files': '{count} 个文件',
} satisfies Record<string, string>

/** Patch-preview dictionary key union. */
export type SidebarPatchPreviewKey = keyof typeof zh

/** English dictionary, checked against the Chinese key set. */
export const en = {
  loading: 'Reading patch...',
  changed: 'The file has changed; this is the older preview.',
  reloadNow: 'Reload',
  reload: 'Read the patch again',
  retry: 'Retry',
  fileSize: 'File size: {size}',
  truncatedText: 'Only the first page of this patch file is shown here.',
  hunkLimit: 'This patch has too many hunks; only the first hunks are shown.',
  summary: '{files} files, {hunks} hunks, {added} added lines, {removed} removed lines.',
  emptyPatch: 'This patch has no changes to show.',
  invalidPatch: 'Patch parsing failed: {message}',
  'error.notFound': 'That patch file is gone. It may have been moved or deleted.',
  'error.outsideWorkspace': 'That patch file is outside the workspace, so the sidebar will not read it.',
  'error.tooLarge': 'The patch content is above the read limit.',
  'error.notText': 'That is not a text patch file, so it cannot be shown here.',
  'error.notRegularFile': 'That is not a regular file, so it has no patch content to show.',
  'error.unavailable': 'Patch read failed: {message}',
  'diff.copy': 'Copy changes',
  'diff.copied': 'Copied',
  'diff.collapseAria': 'Collapse changes',
  'diff.expandAria': 'Expand {hidden} hidden changed lines',
  'diff.collapse': 'Collapse',
  'diff.expand': 'Expand {hidden} lines',
  'diff.files': '{count} files',
} satisfies Record<SidebarPatchPreviewKey, string>
