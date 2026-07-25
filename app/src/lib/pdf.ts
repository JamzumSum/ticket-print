import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { PDFDocument } from 'pdf-lib'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const BASE = import.meta.env.BASE_URL || '/'

export interface CropBox {
  /** PDF 用户空间坐标（pt，原点左下） */
  left: number
  bottom: number
  right: number
  top: number
}

export interface TicketImage {
  /** 预览用栅格图（PNG dataURL） */
  dataUrl: string
  /** 像素尺寸（裁边后） */
  width: number
  height: number
  pageCount: number
  /** 自动裁边对应的 PDF 页面裁剪框；未裁边时为 null */
  cropBox: CropBox | null
  /** 页面提取文本，用于乘车日期解析 */
  text: string
}

const RENDER_SCALE = 3 // 预览渲染倍率，兼顾清晰度与内存

interface CropRectPx {
  left: number
  top: number
  right: number
  bottom: number
}

/** 扫描画布，返回近白边距裁剪框（像素坐标）；无内容时为 null */
function findCropRect(src: HTMLCanvasElement): CropRectPx | null {
  const ctx = src.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const { width, height } = src
  const data = ctx.getImageData(0, 0, width, height).data

  const isWhite = (x: number, y: number) => {
    const i = (y * width + x) * 4
    return data[i] > 242 && data[i + 1] > 242 && data[i + 2] > 242
  }

  let top = 0
  outerTop: for (; top < height; top++) {
    for (let x = 0; x < width; x += 2) if (!isWhite(x, top)) break outerTop
  }
  let bottom = height - 1
  outerBottom: for (; bottom > top; bottom--) {
    for (let x = 0; x < width; x += 2) if (!isWhite(x, bottom)) break outerBottom
  }
  let left = 0
  outerLeft: for (; left < width; left++) {
    for (let y = top; y <= bottom; y += 2) if (!isWhite(left, y)) break outerLeft
  }
  let right = width - 1
  outerRight: for (; right > left; right--) {
    for (let y = top; y <= bottom; y += 2) if (!isWhite(right, y)) break outerRight
  }

  // 安全边距，避免裁掉票面条线
  const pad = Math.round(6 * RENDER_SCALE)
  top = Math.max(0, top - pad)
  left = Math.max(0, left - pad)
  bottom = Math.min(height - 1, bottom + pad)
  right = Math.min(width - 1, right + pad)

  if (right - left + 1 <= 0 || bottom - top + 1 <= 0) return null
  if (left === 0 && top === 0 && right === width - 1 && bottom === height - 1) return null
  return { left, top, right, bottom }
}

/** 将上传的 PDF 指定页渲染为预览图（可选自动裁边），并给出矢量导出用的裁剪框 */
export async function renderTicketPdf(
  file: File,
  pageNumber: number,
  autoCrop: boolean,
): Promise<TicketImage> {
  const buf = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({
    data: buf,
    cMapUrl: `${BASE}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${BASE}standard_fonts/`,
  }).promise
  try {
    const pageCount = doc.numPages
    const page = await doc.getPage(Math.min(Math.max(1, pageNumber), pageCount))
    const baseViewport = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: RENDER_SCALE })

    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport, canvas }).promise

    // 提取文本用于乘车日期解析
    const textContent = await page.getTextContent()
    const text = textContent.items.map((it) => ('str' in it ? it.str : '')).join('')

    const rect = autoCrop ? findCropRect(canvas) : null

    let out = canvas
    let cropBox: CropBox | null = null
    if (rect) {
      const w = rect.right - rect.left + 1
      const h = rect.bottom - rect.top + 1
      out = document.createElement('canvas')
      out.width = w
      out.height = h
      out.getContext('2d')!.drawImage(canvas, rect.left, rect.top, w, h, 0, 0, w, h)

      // 像素裁剪框 → PDF 用户空间（pt，原点左下，y 翻转）
      const pageHpt = baseViewport.height
      cropBox = {
        left: rect.left / RENDER_SCALE,
        right: (rect.right + 1) / RENDER_SCALE,
        top: pageHpt - rect.top / RENDER_SCALE,
        bottom: pageHpt - (rect.bottom + 1) / RENDER_SCALE,
      }
    }

    return {
      dataUrl: out.toDataURL('image/png'),
      width: out.width,
      height: out.height,
      pageCount,
      cropBox,
      text,
    }
  } finally {
    doc.destroy()
  }
}

export interface LayoutParams {
  /** 左侧装订线额外间距（mm） */
  bindingMm: number
  /** 车票之间的排版间距（mm） */
  gapMm: number
  /** 页面外边距（mm） */
  marginMm: number
}

export const A4_LANDSCAPE = { widthMm: 297, heightMm: 210 }
const MM_TO_PT = 72 / 25.4

export interface CellRect {
  xMm: number
  yMm: number
  wMm: number
  hMm: number
}

/**
 * 计算 2x2 四个格子的位置（mm 坐标，原点在左上）。
 * 顺序为列优先：左上、左下、右上、右下。
 */
export function computeCells(p: LayoutParams): CellRect[] {
  const { widthMm, heightMm } = A4_LANDSCAPE
  const contentX = p.marginMm + p.bindingMm
  const contentY = p.marginMm
  const contentW = widthMm - p.marginMm * 2 - p.bindingMm
  const contentH = heightMm - p.marginMm * 2
  const cellW = (contentW - p.gapMm) / 2
  const cellH = (contentH - p.gapMm) / 2
  return [
    { xMm: contentX, yMm: contentY, wMm: cellW, hMm: cellH }, // 左上
    { xMm: contentX, yMm: contentY + cellH + p.gapMm, wMm: cellW, hMm: cellH }, // 左下
    { xMm: contentX + cellW + p.gapMm, yMm: contentY, wMm: cellW, hMm: cellH }, // 右上
    { xMm: contentX + cellW + p.gapMm, yMm: contentY + cellH + p.gapMm, wMm: cellW, hMm: cellH }, // 右下
  ]
}

export const SLOT_LABELS = ['左上', '左下', '右上', '右下']

/** 图像在格子内等比缩放居中后的矩形（mm） */
export function fitInCell(
  imgW: number,
  imgH: number,
  cell: CellRect,
): { xMm: number; yMm: number; wMm: number; hMm: number } {
  const scale = Math.min(cell.wMm / imgW, cell.hMm / imgH)
  const wMm = imgW * scale
  const hMm = imgH * scale
  return {
    xMm: cell.xMm + (cell.wMm - wMm) / 2,
    yMm: cell.yMm + (cell.hMm - hMm) / 2,
    wMm,
    hMm,
  }
}

export interface ExportTicket {
  file: File
  page: number
  cropBox: CropBox | null
}

/**
 * 导出单页 A4 横向 PDF。
 * 车票页面以矢量形式嵌入（保留原字体与图形），确保与原 PDF 渲染完全一致。
 */
export async function exportLayoutPdf(
  slots: (ExportTicket | null)[],
  params: LayoutParams,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([A4_LANDSCAPE.widthMm * MM_TO_PT, A4_LANDSCAPE.heightMm * MM_TO_PT])
  const cells = computeCells(params)
  const pageHPt = A4_LANDSCAPE.heightMm * MM_TO_PT

  for (let i = 0; i < 4; i++) {
    const t = slots[i]
    if (!t) continue
    const srcDoc = await PDFDocument.load(await t.file.arrayBuffer(), {
      ignoreEncryption: true,
    })
    const srcPage = srcDoc.getPages()[Math.min(t.page, srcDoc.getPageCount()) - 1]
    // 带裁剪框嵌入：只保留票面区域的矢量内容
    const embedded = t.cropBox
      ? await doc.embedPage(srcPage, t.cropBox)
      : await doc.embedPage(srcPage)

    const rect = fitInCell(embedded.width, embedded.height, cells[i])
    page.drawPage(embedded, {
      x: rect.xMm * MM_TO_PT,
      y: pageHPt - (rect.yMm + rect.hMm) * MM_TO_PT, // pdf-lib 原点在左下
      width: rect.wMm * MM_TO_PT,
      height: rect.hMm * MM_TO_PT,
    })
  }
  return doc.save()
}
