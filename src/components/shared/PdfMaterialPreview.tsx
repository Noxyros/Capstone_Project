'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import { Maximize2, X } from 'lucide-react'

type Translate = (en: string, id: string) => string

type PdfMaterialPreviewProps = {
  src: string
  title: string
  t: Translate
  onTextExtracted?: (text: string) => void
}

type ElementRef = { readonly current: HTMLDivElement | null }

const MAX_EXTRACTED_CHARACTERS = 10_000
// Browsers crawl (or refuse) on huge canvases; iOS Safari caps at ~16.7M pixels.
const MAX_CANVAS_PIXELS = 16_777_216
// While zooming, pages are stretched with CSS (instant). The sharp re-render waits until zooming pauses.
const RENDER_DEBOUNCE_MS = 150

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/* -------------------------------------------------------------------------- */
/* Hooks                                                                       */
/* -------------------------------------------------------------------------- */

/** Debounces a number. The first real (non-zero) value is adopted immediately. */
function useDebouncedNumber(value: number, delay: number) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    if (debounced === 0) {
      setDebounced(value)
      return
    }
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay, debounced])

  return debounced
}

/** Content-box width of an element (padding excluded), kept up to date by a ResizeObserver. */
function useElementWidth(ref: ElementRef, enabled = true) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!enabled || !element) return
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, enabled])

  return width
}

/**
 * Owns the zoom value and wires up Ctrl+wheel / pinch zoom and drag-to-pan.
 *
 * - The wheel listener is attached natively with `passive: false`. React's `onWheel` is passive,
 *   so `preventDefault()` is ignored there and the browser zooms the whole page instead.
 * - Zoom is anchored to the cursor, so the spot you point at stays put.
 * - Dragging uses refs and direct style writes, so it never triggers a React re-render.
 */
function usePanZoom(
  ref: ElementRef,
  { min, max, initial = 1, enabled = true }: { min: number; max: number; initial?: number; enabled?: boolean },
) {
  const [zoom, setZoom] = useState(initial)
  const zoomRef = useRef(initial)
  const anchorRef = useRef<{ px: number; py: number; ratio: number } | null>(null)

  const reset = useCallback(() => {
    zoomRef.current = initial
    anchorRef.current = null
    setZoom(initial)
  }, [initial])

  // After the new zoom has been laid out, shift the scroll position so the point under the cursor stays put.
  useIsomorphicLayoutEffect(() => {
    const element = ref.current
    const anchor = anchorRef.current
    if (!element || !anchor) return
    anchorRef.current = null
    element.scrollLeft = (element.scrollLeft + anchor.px) * anchor.ratio - anchor.px
    element.scrollTop = (element.scrollTop + anchor.py) * anchor.ratio - anchor.py
  }, [zoom, ref])

  useEffect(() => {
    const element = ref.current
    if (!enabled || !element) return

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()

      // Normalise: mouse wheels send big steps, trackpad pinch sends many tiny ones.
      const rawDelta = event.deltaMode === 1 ? event.deltaY * 33 : event.deltaY
      const delta = Math.max(-60, Math.min(60, rawDelta))
      const current = zoomRef.current
      const next = Math.min(max, Math.max(min, current * Math.exp(-delta * 0.004)))
      if (next === current) return

      const rect = element.getBoundingClientRect()
      anchorRef.current = {
        px: event.clientX - rect.left,
        py: event.clientY - rect.top,
        ratio: (anchorRef.current?.ratio ?? 1) * (next / current),
      }
      zoomRef.current = next
      setZoom(next)
    }

    let drag: { x: number; y: number; left: number; top: number } | null = null

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return
      // Let the native scrollbar be dragged normally.
      if (event.target === element && (event.offsetX >= element.clientWidth || event.offsetY >= element.clientHeight)) return
      drag = { x: event.clientX, y: event.clientY, left: element.scrollLeft, top: element.scrollTop }
      element.style.cursor = 'grabbing'
      element.style.userSelect = 'none'
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!drag) return
      element.scrollLeft = drag.left - (event.clientX - drag.x)
      element.scrollTop = drag.top - (event.clientY - drag.y)
    }

    const handleMouseUp = () => {
      if (!drag) return
      drag = null
      element.style.cursor = ''
      element.style.userSelect = ''
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    element.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      element.removeEventListener('wheel', handleWheel)
      element.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      element.style.cursor = ''
      element.style.userSelect = ''
    }
  }, [enabled, max, min, ref])

  return { zoom, reset }
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function PdfMaterialPreview({ src, title, t, onTextExtracted }: PdfMaterialPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fullScreenContainerRef = useRef<HTMLDivElement>(null)

  // Keep the callback in a ref so an unstable `onTextExtracted` can't reload the PDF on every parent render.
  const onTextExtractedRef = useRef(onTextExtracted)
  useEffect(() => {
    onTextExtractedRef.current = onTextExtracted
  }, [onTextExtracted])

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [hasError, setHasError] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)

  const inlineView = usePanZoom(containerRef, { min: 0.5, max: 3 })
  // Full screen starts at zoom 1 = fit to width.
  const fullView = usePanZoom(fullScreenContainerRef, { min: 0.5, max: 4, enabled: isFullScreen })

  const containerWidth = useElementWidth(containerRef)
  const fullScreenWidth = useElementWidth(fullScreenContainerRef, isFullScreen)

  // `*PageWidth` follows the zoom instantly (cheap CSS resize); `*RenderWidth` settles after zooming pauses.
  const inlinePageWidth = Math.floor(containerWidth * inlineView.zoom)
  const fullScreenPageWidth = Math.floor(fullScreenWidth * fullView.zoom)
  const inlineRenderWidth = useDebouncedNumber(inlinePageWidth, RENDER_DEBOUNCE_MS)
  const fullScreenRenderWidth = useDebouncedNumber(fullScreenPageWidth, RENDER_DEBOUNCE_MS)

  // Load the document + extract text. Depends on `src` only.
  // Fetches the file as an ArrayBuffer first to bypass mobile CORS and range-request restrictions.
  useEffect(() => {
    let active = true
    let loadingTask: ReturnType<typeof import('pdfjs-dist').getDocument> | undefined

    setPdf(null)
    setHasError(false)

    void import('pdfjs-dist')
      .then((pdfjsLib) => {
        if (!active) return
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs'
        return fetch(src).then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return response.arrayBuffer()
        }).then((arrayBuffer) => {
          if (!active) return
          loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
          return loadingTask.promise
        })
      })
      .then((loadedPdf) => {
        if (!active || !loadedPdf) return
        setPdf(loadedPdf)
        void (async () => {
          const extractedPages: string[] = []
          let characterCount = 0
          for (
            let pageNumber = 1;
            pageNumber <= loadedPdf.numPages && characterCount < MAX_EXTRACTED_CHARACTERS;
            pageNumber += 1
          ) {
            const page = await loadedPdf.getPage(pageNumber)
            const textContent = await page.getTextContent()
            const pageText = textContent.items
              .flatMap((item) => ('str' in item && typeof item.str === 'string' ? [item.str] : []))
              .join(' ')
              .trim()
            if (pageText) {
              const remaining = MAX_EXTRACTED_CHARACTERS - characterCount
              const boundedText = pageText.slice(0, remaining)
              extractedPages.push(`Page ${pageNumber}:\n${boundedText}`)
              characterCount += boundedText.length
            }
          }
          if (active) onTextExtractedRef.current?.(extractedPages.join('\n\n'))
        })().catch((extractError: unknown) => {
          console.error('Failed to extract text from PDF lesson material.', extractError)
          if (active) onTextExtractedRef.current?.('')
        })
      })
      .catch((loadError: unknown) => {
        if (!active) return
        console.error('Failed to load PDF lesson material.', loadError)
        setHasError(true)
      })

    return () => {
      active = false
      void loadingTask?.destroy()
    }
  }, [src])

  // Escape closes full screen; lock background scroll while it's open.
  useEffect(() => {
    if (!isFullScreen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullScreen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isFullScreen])

  const openFullScreen = () => {
    fullView.reset()
    setIsFullScreen(true)
  }

  return (
    <>
      <section aria-label={title} className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-100">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
          <span aria-live="polite" className="text-sm font-bold text-slate-700">
            {pdf ? t(`${pdf.numPages} pages`, `${pdf.numPages} halaman`) : t('Loading PDF…', 'Memuat PDF…')}
          </span>
          {pdf && (
            <button
              type="button"
              onClick={openFullScreen}
              aria-label={t('Open full screen viewer', 'Buka tampilan layar penuh')}
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
            >
              <Maximize2 className="h-4 w-4" />
              <span>{t('Full Screen', 'Layar Penuh')}</span>
            </button>
          )}
        </div>
        <div ref={containerRef} className="h-[65vh] min-h-96 cursor-grab overflow-auto p-2 sm:p-4">
          {hasError ? (
            <p role="alert" className="mx-auto my-8 max-w-sm text-center text-sm font-semibold text-rose-700">
              {t(
                'This PDF could not be previewed. Check the file and try again.',
                'PDF ini tidak dapat dipratinjau. Periksa file lalu coba lagi.',
              )}
            </p>
          ) : pdf ? (
            // w-max + min-w-full lets the wrapper grow with zoomed pages, so the left edge is never clipped.
            <div className="flex w-max min-w-full flex-col items-center gap-4">
              {Array.from({ length: pdf.numPages }, (_, index) => (
                <PdfPage
                  key={`${src}-${index + 1}`}
                  pdf={pdf}
                  pageNumber={index + 1}
                  rootRef={containerRef}
                  width={inlinePageWidth}
                  renderWidth={inlineRenderWidth}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <p role="status" className="py-8 text-center text-sm font-semibold text-slate-500">
              {t('Loading PDF…', 'Memuat PDF…')}
            </p>
          )}
        </div>
      </section>

      {/* Full screen viewer */}
      {isFullScreen && pdf && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <h2 className="max-w-xs truncate text-sm font-bold sm:max-w-md sm:text-base">{title}</h2>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                {t(`${pdf.numPages} pages`, `${pdf.numPages} halaman`)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-slate-400 sm:inline">
                {t(
                  'Tip: Hold Ctrl + Scroll to zoom, drag to pan',
                  'Tip: Tahan Ctrl + Scroll untuk memperbesar, geser untuk menggeser',
                )}
              </span>
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                aria-label={t('Close full screen', 'Tutup layar penuh')}
                className="grid h-9 w-9 place-items-center rounded-lg bg-slate-800 text-slate-200 transition-colors hover:bg-rose-600 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div ref={fullScreenContainerRef} className="flex-1 cursor-grab overflow-auto p-4 sm:p-8">
            <div className="flex w-max min-w-full flex-col items-center gap-6">
              {Array.from({ length: pdf.numPages }, (_, index) => (
                <PdfPage
                  key={`fs-${src}-${index + 1}`}
                  pdf={pdf}
                  pageNumber={index + 1}
                  rootRef={fullScreenContainerRef}
                  width={fullScreenPageWidth}
                  renderWidth={fullScreenRenderWidth}
                  t={t}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

function PdfPage({
  pdf,
  pageNumber,
  rootRef,
  width,
  renderWidth,
  t,
}: {
  pdf: PDFDocumentProxy
  pageNumber: number
  rootRef: ElementRef
  /** Live on-screen width in CSS px. Follows the zoom instantly. */
  width: number
  /** Width the canvas is actually rasterised at. Lags `width` while zooming. */
  renderWidth: number
  t: Translate
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)

  const [page, setPage] = useState<PDFPageProxy | null>(null)
  const [visible, setVisible] = useState(false)
  const [renderedWidth, setRenderedWidth] = useState(0)
  const [error, setError] = useState(false)

  // 1. Load the page proxy (needed up front for its aspect ratio, so scroll height is right).
  useEffect(() => {
    let active = true
    setPage(null)
    setRenderedWidth(0)
    setError(false)

    pdf
      .getPage(pageNumber)
      .then((loadedPage) => {
        if (active) setPage(loadedPage)
      })
      .catch((loadError: unknown) => {
        if (!active) return
        console.error(`Failed to load PDF page ${pageNumber}.`, loadError)
        setError(true)
      })

    return () => {
      active = false
    }
  }, [pdf, pageNumber])

  const aspectRatio = useMemo(() => {
    if (!page) return Math.SQRT2 // A4 placeholder until the real size is known
    const viewport = page.getViewport({ scale: 1 })
    return viewport.height / viewport.width
  }, [page])

  // 2. Only rasterise pages that are on (or near) screen.
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      root: rootRef.current,
      rootMargin: '100% 0px',
    })
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [rootRef])

  // 3. Rasterise at `renderWidth` (debounced). Draw into an off-screen canvas first, then swap it in,
  //    so re-rendering after a zoom never flashes blank.
  useEffect(() => {
    const canvas = canvasRef.current
    const textLayerElement = textLayerRef.current
    if (!page || !canvas || !textLayerElement || renderWidth <= 0) return

    if (!visible) {
      // Free memory for pages that scrolled far away.
      canvas.width = 0
      canvas.height = 0
      textLayerElement.replaceChildren()
      return
    }

    let active = true
    let renderTask: ReturnType<PDFPageProxy['render']> | undefined
    let textLayer: InstanceType<typeof import('pdfjs-dist').TextLayer> | undefined

    void (async () => {
      const baseViewport = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: renderWidth / baseViewport.width })

      // Sharp on retina screens, but never beyond the browser's canvas budget.
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const pixelBudgetScale = Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height))
      const outputScale = Math.min(devicePixelRatio, pixelBudgetScale)

      const buffer = document.createElement('canvas')
      buffer.width = Math.floor(viewport.width * outputScale)
      buffer.height = Math.floor(viewport.height * outputScale)
      const bufferContext = buffer.getContext('2d')
      if (!bufferContext) throw new Error('Canvas rendering is unavailable.')

      const textContentPromise = page.getTextContent()
      renderTask = page.render({
        canvas: buffer,
        canvasContext: bufferContext,
        viewport,
        transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
      })
      await renderTask.promise
      if (!active) return

      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas rendering is unavailable.')
      canvas.width = buffer.width
      canvas.height = buffer.height
      context.drawImage(buffer, 0, 0)
      buffer.width = 0
      buffer.height = 0

      const textContent = await textContentPromise
      const pdfjs = await import('pdfjs-dist')
      if (!active) return

      textLayerElement.replaceChildren()
      textLayerElement.style.width = `${Math.floor(viewport.width)}px`
      textLayerElement.style.height = `${Math.floor(viewport.height)}px`
      setRenderedWidth(viewport.width)

      textLayer = new pdfjs.TextLayer({
        textContentSource: textContent,
        container: textLayerElement,
        viewport,
      })
      await textLayer.render()
    })().catch((renderError: unknown) => {
      if (!active) return
      console.error(`Failed to render PDF page ${pageNumber}.`, renderError)
      setError(true)
    })

    return () => {
      active = false
      renderTask?.cancel()
      textLayer?.cancel()
      textLayerElement.replaceChildren()
    }
  }, [page, pageNumber, renderWidth, visible])

  if (error) {
    return (
      <p role="alert" className="max-w-sm rounded-lg bg-white p-4 text-center text-sm font-semibold text-rose-700">
        {t(`Page ${pageNumber} could not be displayed.`, `Halaman ${pageNumber} tidak dapat ditampilkan.`)}
      </p>
    )
  }

  // The canvas is stretched to the live size; the text layer is scaled from the size it was rendered at.
  const textScale = renderedWidth > 0 ? width / renderedWidth : 1

  return (
    <div
      ref={wrapperRef}
      className="relative shrink-0 overflow-hidden bg-white shadow-md"
      style={{ width, height: Math.floor(width * aspectRatio) }}
    >
      <canvas
        ref={canvasRef}
        aria-label={t(`PDF page ${pageNumber}`, `Halaman PDF ${pageNumber}`)}
        className="block max-w-none"
        style={{ width: '100%', height: '100%' }}
      />
      <div
        ref={textLayerRef}
        aria-label={t(`Selectable text on PDF page ${pageNumber}`, `Teks yang dapat dipilih pada halaman PDF ${pageNumber}`)}
        className="pdf-text-layer absolute left-0 top-0 select-text overflow-hidden leading-none"
        style={{
          transform: Math.abs(textScale - 1) < 0.001 ? undefined : `scale(${textScale})`,
          transformOrigin: '0 0',
        }}
      />
    </div>
  )
}