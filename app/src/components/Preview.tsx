import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  A4_LANDSCAPE,
  SLOT_LABELS,
  computeCells,
  fitInCell,
  type LayoutParams,
} from '@/lib/pdf'
import type { Ticket } from './TicketList'

interface PreviewProps {
  tickets: Ticket[]
  params: LayoutParams
  onDropToCell: (ticketId: string, cellIndex: number) => void
}

const { widthMm: PW, heightMm: PH } = A4_LANDSCAPE
const pct = (mm: number, total: number) => `${(mm / total) * 100}%`
const ease = { duration: 0.2, ease: [0.2, 0, 0, 1] }

interface DragState {
  ticketId: string
  offsetXRatio: number
  offsetYRatio: number
  wMm: number
  hMm: number
  xMm: number
  yMm: number
}

export default function Preview({ tickets, params, onDropToCell }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hoverCell, setHoverCell] = useState<number | null>(null)

  const cells = computeCells(params)
  const placed = tickets.filter((t) => t.status === 'ready' && t.dataUrl && t.slot !== null)
  const bindingEdgeMm = params.marginMm + params.bindingMm

  const toMm = (clientX: number, clientY: number) => {
    const r = containerRef.current!.getBoundingClientRect()
    return {
      xMm: ((clientX - r.left) / r.width) * PW,
      yMm: ((clientY - r.top) / r.height) * PH,
    }
  }

  const cellAt = (xMm: number, yMm: number) => {
    const idx = cells.findIndex(
      (c) => xMm >= c.xMm && xMm <= c.xMm + c.wMm && yMm >= c.yMm && yMm <= c.yMm + c.hMm,
    )
    return idx >= 0 ? idx : null
  }

  const handlePointerDown = (e: React.PointerEvent, t: Ticket) => {
    if (t.slot === null) return
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const p = toMm(e.clientX, e.clientY)
    const rect = fitInCell(t.width, t.height, cells[t.slot])
    setDrag({
      ticketId: t.id,
      offsetXRatio: (p.xMm - rect.xMm) / rect.wMm,
      offsetYRatio: (p.yMm - rect.yMm) / rect.hMm,
      wMm: rect.wMm,
      hMm: rect.hMm,
      xMm: p.xMm,
      yMm: p.yMm,
    })
    setHoverCell(t.slot)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    const p = toMm(e.clientX, e.clientY)
    setDrag({ ...drag, xMm: p.xMm, yMm: p.yMm })
    setHoverCell(cellAt(p.xMm, p.yMm))
  }

  const handlePointerUp = () => {
    if (!drag) return
    if (hoverCell !== null) onDropToCell(drag.ticketId, hoverCell)
    setDrag(null)
    setHoverCell(null)
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-full touch-none overflow-hidden rounded-lg bg-background ring-1 ring-border/50 select-none"
      style={{ aspectRatio: `${PW} / ${PH}` }}
    >
      <motion.div
        className="pointer-events-none absolute top-0 bottom-0 left-0 border-r border-dashed border-primary/40 bg-primary/[0.06]"
        animate={{ width: pct(bindingEdgeMm, PW) }}
        transition={ease}
      >
        {params.bindingMm > 2 && (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 text-[10px] tracking-widest whitespace-nowrap text-primary/60">
            装订线 {params.bindingMm} mm
          </span>
        )}
      </motion.div>

      {cells.map((c, i) => {
        const occupied = placed.some((t) => t.slot === i)
        return (
          <motion.div
            key={i}
            className={`pointer-events-none absolute rounded border transition-colors ${
              hoverCell === i && drag
                ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                : 'border-dashed border-border/40'
            }`}
            animate={{
              left: pct(c.xMm, PW),
              top: pct(c.yMm, PH),
              width: pct(c.wMm, PW),
              height: pct(c.hMm, PH),
            }}
            transition={ease}
          >
            {!occupied && (
              <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/40">
                {SLOT_LABELS[i]}
              </span>
            )}
          </motion.div>
        )
      })}

      <AnimatePresence>
        {placed.map((t) => {
          const rect = fitInCell(t.width, t.height, cells[t.slot!])
          const isDragging = drag?.ticketId === t.id
          return (
            <motion.img
              key={t.id}
              src={t.dataUrl!}
              alt={t.fileName}
              onPointerDown={(e) => handlePointerDown(e, t)}
              className={`absolute object-contain ${
                isDragging ? 'opacity-25' : 'cursor-grab'
              }`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: isDragging ? 0.25 : 1,
                scale: 1,
                left: pct(rect.xMm, PW),
                top: pct(rect.yMm, PH),
                width: pct(rect.wMm, PW),
                height: pct(rect.hMm, PH),
              }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={ease}
              draggable={false}
            />
          )
        })}
      </AnimatePresence>

      {drag && (
        <img
          src={tickets.find((t) => t.id === drag.ticketId)?.dataUrl ?? undefined}
          alt=""
          className="pointer-events-none absolute z-20 object-contain opacity-80"
          style={{
            left: pct(drag.xMm - drag.offsetXRatio * drag.wMm, PW),
            top: pct(drag.yMm - drag.offsetYRatio * drag.hMm, PH),
            width: pct(drag.wMm, PW),
            height: pct(drag.hMm, PH),
          }}
          draggable={false}
        />
      )}

      {placed.length === 0 && !drag && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground/40">上传车票后此处实时预览排版效果</p>
        </div>
      )}
    </div>
  )
}
