'use client'

import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minus, Plus, RotateCcw, X } from 'lucide-react'

type Translate = (en: string, id: string) => string

export default function ImageMaterialPreview({
  src,
  alt,
  t,
}: {
  src: string
  alt: string
  t: Translate
}) {
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  useEffect(() => {
    if (!isFullScreen) return
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullScreen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullScreen])

  const openFullScreen = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setIsFullScreen(true)
  }

  const changeZoom = (change: number) => {
    setZoom((current) => Math.min(4, Math.max(1, Number((current + change).toFixed(2)))))
  }

  const resetZoom = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const startPan = (event: React.PointerEvent<HTMLImageElement>) => {
    if (zoom <= 1) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
  }

  const movePan = (event: React.PointerEvent<HTMLImageElement>) => {
    if (!drag.current) return
    setPan({
      x: drag.current.panX + event.clientX - drag.current.x,
      y: drag.current.panY + event.clientY - drag.current.y,
    })
  }

  const stopPan = () => {
    drag.current = null
  }

  return (
    <>
      <section
        aria-label={t('Image material', 'Materi gambar')}
        className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-100"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
          <span className="text-sm font-bold text-slate-700">{t('Image material', 'Materi gambar')}</span>
          <button
            type="button"
            onClick={openFullScreen}
            aria-label={t('Open full screen image viewer', 'Buka gambar layar penuh')}
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
          >
            <Maximize2 className="h-4 w-4" />
            <span>{t('Full Screen', 'Layar Penuh')}</span>
          </button>
        </div>
        <div className="bg-white p-2 sm:p-4">
          <img
            src={src}
            alt={alt}
            crossOrigin="anonymous"
            className="mx-auto block max-h-[65vh] w-full rounded-xl object-contain"
          />
        </div>
      </section>

      {isFullScreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 text-white backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-700 bg-slate-900 px-3 py-3 shadow-lg sm:px-4">
            <h2 className="min-w-0 truncate text-sm font-bold sm:text-base">{alt}</h2>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
              <span className="hidden text-xs text-slate-400 sm:inline">
                {t('Drag to explore when zoomed', 'Geser gambar saat diperbesar')}
              </span>
              <button
                type="button"
                onClick={() => changeZoom(-0.25)}
                disabled={zoom <= 1}
                aria-label={t('Zoom out', 'Perkecil')}
                className="grid h-10 w-10 place-items-center rounded-lg bg-slate-800 text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={resetZoom}
                aria-label={t('Reset zoom', 'Atur ulang zoom')}
                className="inline-flex h-10 min-w-14 items-center justify-center gap-1 rounded-lg bg-slate-800 px-2 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => changeZoom(0.25)}
                disabled={zoom >= 4}
                aria-label={t('Zoom in', 'Perbesar')}
                className="grid h-10 w-10 place-items-center rounded-lg bg-slate-800 text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                aria-label={t('Close full screen', 'Tutup layar penuh')}
                className="grid h-10 w-10 place-items-center rounded-lg bg-slate-800 text-slate-200 transition-colors hover:bg-rose-600 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2 sm:p-6">
            <img
              src={src}
              alt={alt}
              crossOrigin="anonymous"
              draggable={false}
              onPointerDown={startPan}
              onPointerMove={movePan}
              onPointerUp={stopPan}
              onPointerCancel={stopPan}
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
              className={`max-h-full max-w-full select-none object-contain touch-none ${
                zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
            />
          </div>
        </div>
      )}
    </>
  )
}
