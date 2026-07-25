/** 从车票 PDF 文本中解析乘车日期，并生成导出文件名 */

export interface TripDate {
  y: number
  m: number
  d: number
}

/**
 * 解析票面文本中的乘车日期。
 * 优先取后随时刻或"开"字的日期（避开开票日期等），
 * 支持 "2026年07月20日" / "2026-07-20" 格式。
 */
export function parseTripDate(text: string): TripDate | null {
  const t = text.replace(/\s+/g, '')
  const dm =
    t.match(/(\d{4})年(\d{1,2})月(\d{1,2})日(?=\d{1,2}[:：]\d{2}|开)/) ||
    t.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/) ||
    t.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  return dm ? { y: +dm[1], m: +dm[2], d: +dm[3] } : null
}

const cmpDate = (a: TripDate, b: TripDate) =>
  a.y * 10000 + a.m * 100 + a.d - (b.y * 10000 + b.m * 100 + b.d)

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * 根据已排入车票的乘车日期生成文件名（不含扩展名）。
 * 取最早~最晚乘车日，形如 "07.20-07.24"；同日为 "07.20"；
 * 跨年带完整年份。无有效日期时返回 null。
 */
export function buildDateRangeFileName(dates: (TripDate | null)[]): string | null {
  const valid = dates.filter((d): d is TripDate => d !== null).sort(cmpDate)
  if (valid.length === 0) return null

  const first = valid[0]
  const last = valid[valid.length - 1]
  if (cmpDate(first, last) === 0) {
    return `${pad(first.m)}.${pad(first.d)}`
  }
  if (first.y === last.y) {
    return `${pad(first.m)}.${pad(first.d)}-${pad(last.m)}.${pad(last.d)}`
  }
  return `${first.y}.${pad(first.m)}.${pad(first.d)}-${last.y}.${pad(last.m)}.${pad(last.d)}`
}

/** 文件名消毒：替换文件系统非法字符 */
export function sanitizeFileName(name: string): string {
  return name.replace(/[\\/<>:"|?*]/g, '_').replace(/\.+$/, '').trim()
}
