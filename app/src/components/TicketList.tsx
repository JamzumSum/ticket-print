import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Grid3x3, Loader2, TriangleAlert, X } from 'lucide-react'
import { SLOT_LABELS, type CropBox } from '@/lib/pdf'
import type { TripDate } from '@/lib/naming'

export interface Ticket {
  id: string
  fileName: string
  file: File
  page: number
  pageCount: number
  slot: number | null
  dataUrl: string | null
  width: number
  height: number
  cropBox: CropBox | null
  tripDate: TripDate | null
  status: 'loading' | 'ready' | 'error'
}

const ease = { duration: 0.2, ease: [0.2, 0, 0, 1] as const }

interface ItemProps {
  ticket: Ticket
  canPlace: boolean
  onRemove: (id: string) => void
  onPageChange: (id: string, page: number) => void
  onPlace: (id: string) => void
}

function TicketItem({ ticket, canPlace, onRemove, onPageChange, onPlace }: ItemProps) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={ease}
      className="group relative flex items-center gap-3 rounded-lg border border-border/30 bg-card p-2.5 select-none hover:border-border/60"
    >
      <div className="relative h-12 w-[76px] shrink-0 overflow-hidden rounded border border-border/30 bg-background">
        {ticket.status === 'ready' && ticket.dataUrl ? (
          <img src={ticket.dataUrl} alt={ticket.fileName} className="h-full w-full object-contain" />
        ) : ticket.status === 'loading' ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <TriangleAlert className="h-4 w-4 text-[#ffcc00]" />
          </div>
        )}
        {ticket.slot !== null && ticket.status === 'ready' && (
          <span className="absolute right-0.5 bottom-0.5 rounded bg-primary/80 px-1 py-px text-[9px] font-medium text-primary-foreground">
            {SLOT_LABELS[ticket.slot]}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="truncate text-sm font-medium text-foreground" title={ticket.fileName}>
            {ticket.fileName}
          </p>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {ticket.status === 'error' ? (
            <span className="text-[#ff7300]">解析失败</span>
          ) : ticket.pageCount > 1 ? (
            <label className="flex items-center gap-1">
              第
              <input
                type="number"
                min={1}
                max={ticket.pageCount}
                value={ticket.page}
                onChange={(e) => {
                  const p = Math.round(Number(e.target.value))
                  if (p >= 1 && p <= ticket.pageCount) onPageChange(ticket.id, p)
                }}
                className="w-10 rounded border border-border bg-background px-1 py-0.5 text-center text-xs text-foreground focus:border-primary focus:outline-none"
              />
              / {ticket.pageCount} 页
            </label>
          ) : (
            <span>{ticket.status === 'loading' ? '解析中…' : '1 页'}</span>
          )}
          {ticket.status === 'ready' && ticket.slot === null && (
            <button
              onClick={() => onPlace(ticket.id)}
              disabled={!canPlace}
              className="flex items-center gap-0.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/25 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              title={canPlace ? '放入第一个空位' : '版面已满，可在预览中拖拽换入'}
            >
              <Grid3x3 className="h-3 w-3" />
              排入版面
            </button>
          )}
        </div>
      </div>

      <button
        onClick={() => onRemove(ticket.id)}
        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
        aria-label="移除"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.li>
  )
}

interface ListProps {
  tickets: Ticket[]
  onRemove: (id: string) => void
  onPageChange: (id: string, page: number) => void
  onPlace: (id: string) => void
}

export default function TicketList({ tickets, onRemove, onPageChange, onPlace }: ListProps) {
  const sorted = [...tickets].sort((a, b) => {
    if (a.slot !== null && b.slot !== null) return a.slot - b.slot
    if (a.slot !== null) return -1
    if (b.slot !== null) return 1
    return 0
  })
  const canPlace = tickets.filter((t) => t.slot !== null).length < 4

  return (
    <ul className="space-y-2">
      <AnimatePresence initial={false}>
        {sorted.map((t) => (
          <TicketItem
            key={t.id}
            ticket={t}
            canPlace={canPlace}
            onRemove={onRemove}
            onPageChange={onPageChange}
            onPlace={onPlace}
          />
        ))}
      </AnimatePresence>
    </ul>
  )
}
