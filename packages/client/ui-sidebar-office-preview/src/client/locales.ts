/** `sidebarOfficePreview` namespace dictionaries. */

/** Locale namespace. */
export const NS = 'sidebarOfficePreview'

/** Simplified Chinese dictionary. */
export const zh = {
  loading: '正在读取并解析...',
  reloadNow: '重新载入',
  reload: '重新读取文件',
  retry: '重试',
  tooLarge: '文件超过 {limit}，侧栏不会继续读取。',
  incomplete: '文件读取未完成。',
  empty: '文件没有可显示的内容。',
  parseFailed: '文件解析失败：{message}',
  pdfLabel: 'PDF 文档',
  openPdf: '在新窗口打开',
  downloadPdf: '下载 PDF',
  fileSize: '文件大小：{size}',
  docxLabel: 'Word 文档',
  xlsxLabel: 'Excel 工作簿',
  sheetRows: '{rows} 行',
  sheetEmpty: '这个工作表没有可显示的行。',
  sheetTruncated: '已按预览限制截断行或列。',
  errorNotFound: '这个文件不在了。可能已被移动或删除。',
  errorOutsideWorkspace: '这个文件在工作区之外，侧栏不会读取它。',
  errorTooLarge: '读取内容超过 {limit}。',
  errorNotRegularFile: '这不是一个普通文件，没有可显示的内容。',
  errorUnavailable: '读取失败：{message}',
} satisfies Record<string, string>

/** Office locale key union. */
export type SidebarOfficePreviewKey = keyof typeof zh

/** English dictionary with the same key set. */
export const en = {
  loading: 'Reading and parsing...',
  reloadNow: 'Reload',
  reload: 'Read the file again',
  retry: 'Retry',
  tooLarge: 'The file is above {limit}, so the sidebar will not keep reading it.',
  incomplete: 'The file did not finish reading.',
  empty: 'The file has no content to show.',
  parseFailed: 'File parsing failed: {message}',
  pdfLabel: 'PDF document',
  openPdf: 'Open in a new window',
  downloadPdf: 'Download PDF',
  fileSize: 'File size: {size}',
  docxLabel: 'Word document',
  xlsxLabel: 'Excel workbook',
  sheetRows: '{rows} rows',
  sheetEmpty: 'This worksheet has no rows to show.',
  sheetTruncated: 'Rows or columns were truncated to the preview limits.',
  errorNotFound: 'That file is gone. It may have been moved or deleted.',
  errorOutsideWorkspace: 'That file is outside the workspace, so the sidebar will not read it.',
  errorTooLarge: 'The requested content is above {limit}.',
  errorNotRegularFile: 'That is not a regular file, so it has no content to show.',
  errorUnavailable: 'Read failed: {message}',
} satisfies Record<SidebarOfficePreviewKey, string>
