import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Crop, Download, Moon, MousePointer2, RefreshCw, Sun, TrainFront, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import TicketList, { type Ticket } from '@/components/TicketList'
import Preview from '@/components/Preview'
import { exportLayoutPdf, renderTicketPdf, type LayoutParams } from '@/lib/pdf'
import { buildDateRangeFileName, parseTripDate, sanitizeFileName } from '@/lib/naming'

let idCounter = 0
const nextId = () => `t-${Date.now()}-${idCounter++}`

const ease = { duration: 0.2, ease: [0.2, 0, 0, 1] as const }

function firstFreeSlot(tickets: Ticket[]): number | null {
  const used = new Set(tickets.map((t) => t.slot).filter((s) => s !== null))
  for (let i = 0; i < 4; i++) if (!used.has(i)) return i
  return null
}

const itemAnim = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -16 },
  transition: ease,
}

export default function Home() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [params, setParams] = useState<LayoutParams>({ bindingMm: 15, gapMm: 8, marginMm: 8 })
  const [autoCrop, setAutoCrop] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [fileName, setFileName] = useState('')
  const [fileNameDirty, setFileNameDirty] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('ticket-theme') as 'dark' | 'light') || 'dark',
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autoCropRef = useRef(autoCrop)
  autoCropRef.current = autoCrop

  const suggestedName = useMemo(() => {
    const infos = [0, 1, 2, 3]
      .map((i) => tickets.find((t) => t.slot === i && t.status === 'ready')?.tripDate ?? null)
    return buildDateRangeFileName(infos)
  }, [tickets])

  useEffect(() => {
    if (!fileNameDirty) setFileName(suggestedName ?? '')
  }, [suggestedName, fileNameDirty])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ticket-theme', theme)
  }, [theme])

  const renderTicket = useCallback(async (ticket: Ticket, page: number, crop: boolean) => {
    setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status: 'loading' } : t)))
    try {
      const img = await renderTicketPdf(ticket.file, page, crop)
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticket.id
            ? {
                ...t,
                status: 'ready',
                page,
                pageCount: img.pageCount,
                dataUrl: img.dataUrl,
                width: img.width,
                height: img.height,
                cropBox: img.cropBox,
                tripDate: parseTripDate(img.text),
              }
            : t,
        ),
      )
    } catch {
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status: 'error' } : t)))
      toast.error(`「${ticket.fileName}」解析失败，请确认是有效的 PDF`)
    }
  }, [])

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const pdfs = Array.from(files).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
      )
      if (pdfs.length === 0) {
        toast.error('请上传 PDF 格式的车票文件')
        return
      }
      setTickets((prev) => {
        const added: Ticket[] = pdfs.map((f) => ({
          id: nextId(),
          fileName: f.name.replace(/\.pdf$/i, ''),
          file: f,
          page: 1,
          pageCount: 1,
          slot: null,
          dataUrl: null,
          width: 0,
          height: 0,
          cropBox: null,
          tripDate: null,
          status: 'loading' as const,
        }))
        const all = [...prev]
        for (const t of added) {
          t.slot = firstFreeSlot(all)
          all.push(t)
        }
        added.forEach((t) => renderTicket(t, 1, autoCropRef.current))
        return all
      })
      toast.success(`已添加 ${pdfs.length} 张车票`)
    },
    [renderTicket],
  )

  const handleRemove = useCallback((id: string) => {
    setTickets((prev) => {
      const next = prev.filter((t) => t.id !== id).map((t) => ({ ...t }))
      const used = new Set(next.filter((t) => t.slot !== null).map((t) => t.slot))
      for (const t of next) {
        if (t.slot !== null) continue
        for (let i = 0; i < 4; i++) {
          if (!used.has(i)) {
            t.slot = i
            used.add(i)
            break
          }
        }
      }
      return next
    })
  }, [])

  const handlePageChange = useCallback(
    (id: string, page: number) => {
      setTickets((prev) => {
        const t = prev.find((x) => x.id === id)
        if (t) renderTicket(t, page, autoCropRef.current)
        return prev
      })
    },
    [renderTicket],
  )

  const handleAutoCropToggle = useCallback(
    (checked: boolean) => {
      setAutoCrop(checked)
      autoCropRef.current = checked
      setTickets((prev) => {
        prev.forEach((t) => renderTicket(t, t.page, checked))
        return prev
      })
    },
    [renderTicket],
  )

  const handleDropToCell = useCallback((ticketId: string, cellIndex: number) => {
    setTickets((prev) => {
      const dragged = prev.find((t) => t.id === ticketId)
      if (!dragged || dragged.slot === cellIndex) return prev
      const occupant = prev.find((t) => t.slot === cellIndex && t.id !== ticketId)
      return prev.map((t) => {
        if (t.id === ticketId) return { ...t, slot: cellIndex }
        if (occupant && t.id === occupant.id) return { ...t, slot: dragged.slot }
        return t
      })
    })
  }, [])

  const handlePlace = useCallback((id: string) => {
    setTickets((prev) => {
      const slot = firstFreeSlot(prev)
      if (slot === null) return prev
      return prev.map((t) => (t.id === id ? { ...t, slot } : t))
    })
  }, [])

  const handleExport = useCallback(async () => {
    const slots = [0, 1, 2, 3].map((i) => tickets.find((t) => t.slot === i && t.status === 'ready') ?? null)
    if (slots.every((s) => s === null)) {
      toast.error('请先上传至少一张可解析的车票 PDF')
      return
    }
    setExporting(true)
    try {
      const bytes = await exportLayoutPdf(
        slots.map((s) => (s ? { file: s.file, page: s.page, cropBox: s.cropBox } : null)),
        params,
      )
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const finalName = sanitizeFileName(fileName) || suggestedName || '火车票排版-A4横向'
      a.download = `${finalName}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('已导出单页 PDF，可直接打印（A4 横向）')
    } catch {
      toast.error('导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }, [tickets, params, fileName, suggestedName])

  const placedCount = tickets.filter((t) => t.slot !== null && t.status === 'ready').length
  const unplacedCount = tickets.filter((t) => t.slot === null && t.status === 'ready').length

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header data-od-id="app-header" className="sticky top-0 z-40 border-b border-border/40 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <TrainFront className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base leading-tight font-semibold text-foreground">火车票排版打印</h1>
            <p className="text-xs text-muted-foreground">电子车票 2×2 拼版 · A4 横向单页输出</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
              aria-label="切换主题"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Button
              data-od-id="btn-export-pdf"
              onClick={handleExport}
              disabled={exporting || placedCount === 0}
              className="rounded-full bg-primary px-6 text-primary-foreground transition-all hover:bg-[#005073] active:scale-[0.97]"
            >
              <Download className="mr-1.5 h-4 w-4" />
              {exporting ? '正在生成…' : '导出 PDF'}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <div
            data-od-id="upload-area"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              addFiles(e.dataTransfer.files)
            }}
            className={`cursor-pointer rounded-xl border-2 border-dashed bg-card p-6 text-center transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${
              dragOver
                ? 'border-primary bg-primary/[0.03]'
                : 'border-border hover:border-primary/60'
            }`}
          >
            <div className={`mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-lg transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${
              dragOver ? '-translate-y-0.5 bg-primary/20' : 'bg-primary/10'
            }`}>
              <UploadCloud className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {dragOver ? '松开即可添加' : '点击或拖拽上传车票 PDF'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">支持批量上传 · 每张 PDF 取一页参与排版</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>

          <div data-od-id="params-panel" className="space-y-4 rounded-xl border border-border/50 bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">排版参数</h2>

            <ParamSlider
              label="装订线间距"
              hint="页面左侧预留的装订区域"
              value={params.bindingMm}
              min={0}
              max={40}
              onChange={(v) => setParams((p) => ({ ...p, bindingMm: v }))}
            />
            <ParamSlider
              label="车票排版间距"
              hint="2×2 车票之间的间隔"
              value={params.gapMm}
              min={0}
              max={40}
              onChange={(v) => setParams((p) => ({ ...p, gapMm: v }))}
            />
            <ParamSlider
              label="页面边距"
              hint="内容距纸张边缘的距离"
              value={params.marginMm}
              min={0}
              max={30}
              onChange={(v) => setParams((p) => ({ ...p, marginMm: v }))}
            />

            <div className="flex items-center justify-between border-t border-border/30 pt-4">
              <Label htmlFor="crop" className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <Crop className="h-3.5 w-3.5 text-muted-foreground" />
                自动裁剪白边
              </Label>
              <Switch id="crop" checked={autoCrop} onCheckedChange={handleAutoCropToggle} />
            </div>
          </div>

          <AnimatePresence>
            {tickets.length > 0 && (
              <motion.div
                {...itemAnim}
                className="rounded-xl border border-border/50 bg-card p-4"
              >
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 data-od-id="ticket-list-heading" className="text-sm font-semibold text-foreground">车票列表</h2>
                  <span className="text-xs text-muted-foreground">在预览中拖拽车票调整位置</span>
                </div>
                <TicketList
                  tickets={tickets}
                  onRemove={handleRemove}
                  onPageChange={handlePageChange}
                  onPlace={handlePlace}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div data-od-id="preview-section">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 data-od-id="preview-heading" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              打印预览
              {placedCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  <MousePointer2 className="h-3 w-3" />
                  可拖拽车票到任意格子，落点有票则交换
                </span>
              )}
            </h2>
            <span className="text-xs text-muted-foreground">A4 · 297 × 210 mm · 横向</span>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-6 sm:p-10">
            <Preview tickets={tickets} params={params} onDropToCell={handleDropToCell} />
          </div>

          <div data-od-id="export-filename" className="mt-4 flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-3">
            <Label htmlFor="filename" className="shrink-0 text-sm text-foreground">
              导出文件名
            </Label>
            <div className="relative flex-1">
              <input
                id="filename"
                value={fileName}
                placeholder="火车票排版-A4横向"
                onChange={(e) => {
                  setFileName(e.target.value)
                  setFileNameDirty(true)
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 pr-16 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                .pdf
              </span>
            </div>
            {suggestedName && !fileNameDirty && (
              <span className="shrink-0 rounded bg-primary/15 px-2 py-1 text-xs text-primary">
                根据行程自动命名
              </span>
            )}
            <button
              onClick={() => {
                setFileNameDirty(false)
                setFileName(suggestedName ?? '')
              }}
              disabled={!suggestedName}
              title="重新根据行程生成"
              className="shrink-0 rounded-lg p-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {unplacedCount > 0 && (
            <p className="mt-3 text-center text-xs text-[#ffcc00]">
              {unplacedCount} 张车票未排入版面（输出为单页，仅 4 个位置）
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

interface ParamSliderProps {
  label: string
  hint: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}

function ParamSlider({ label, hint, value, min, max, onChange }: ParamSliderProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <Label className="text-sm text-foreground">{label}</Label>
        <motion.span
          key={value}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={ease}
          className="text-sm font-semibold tabular-nums text-foreground"
        >
          {value} mm
        </motion.span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={([v]) => onChange(v)}
        className="py-1"
      />
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
