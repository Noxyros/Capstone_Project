'use client'

import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import { ZoomIn, ZoomOut } from 'lucide-react'

type PdfMaterialPreviewProps = {
  src: string
  title: string
  t: (en: string, id: string) => string
  onTextExtracted?: (text: string) => void
}

export function PdfMaterialPreview({ src, title, t, onTextExtracted }: PdfMaterialPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [zoom, setZoom] = useState(1.2)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let loadingTask: ReturnType<typeof import('pdfjs-dist').getDocument> | undefined

    setPdf(null)
    setError('')

    void import('pdfjs-dist')
      .then((pdfjs) => {
        if (!active) return
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString()
        loadingTask = pdfjs.getDocument({ url: src })
        return loadingTask.promise
      })
      .then((loadedPdf) => {
        if (!active || !loadedPdf) return
        setPdf(loadedPdf)
        void (async () => {
          const extractedPages: string[] = []
          let characterCount = 0
          for (let pageNumber = 1; pageNumber <= loadedPdf.numPages && characterCount < 10_000; pageNumber += 1) {
            const page = await loadedPdf.getPage(pageNumber)
            const textContent = await page.getTextContent()
            const pageText = textContent.items
              .flatMap((item) => 'str' in item && typeof item.str === 'string' ? [item.str] : [])
              .join(' ')
              .trim()
            if (pageText) {
              const remaining = 10_000 - characterCount
              const boundedText = pageText.slice(0, remaining)
              extractedPages.push(`Page ${pageNumber}:\n${boundedText}`)
              characterCount += boundedText.length
            }
          }
          if (active) onTextExtracted?.(extractedPages.join('\n\n'))
        })().catch((extractError: unknown) => {
          console.error('Failed to extract text from PDF lesson material.', extractError)
          if (active) onTextExtracted?.('')
        })
      })
      .catch((loadError: unknown) => {
        if (!active) return
        console.error('Failed to load PDF lesson material.', loadError)
        setError(t('This PDF could not be previewed. Check the file and try again.', 'PDF ini tidak dapat dipratinjau. Periksa file lalu coba lagi.'))
      })

    return () => {
      active = false
      void loadingTask?.destroy()
    }
  }, [onTextExtracted, src, t])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  return (
    <section aria-label={title} className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-100">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2">
        <span aria-live="polite" className="text-sm font-bold text-slate-600">
          {pdf
            ? t(`${pdf.numPages} pages`, `${pdf.numPages} halaman`)
            : t('Loading PDF…', 'Memuat PDF…')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((current) => Math.max(0.75, Number((current - 0.1).toFixed(2))))}
            disabled={zoom <= 0.75}
            aria-label={t('Zoom out', 'Perkecil')}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <span className="w-12 text-center text-xs font-bold text-slate-500">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((current) => Math.min(2, Number((current + 0.1).toFixed(2))))}
            disabled={zoom >= 2}
            aria-label={t('Zoom in', 'Perbesar')}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="h-[65vh] min-h-96 overflow-auto p-2 sm:p-4"
      >
        {error ? (
          <p role="alert" className="mx-auto my-8 max-w-sm text-center text-sm font-semibold text-rose-700">{error}</p>
        ) : pdf ? (
          <div className="flex min-w-full flex-col items-center gap-4">
            {Array.from({ length: pdf.numPages }, (_, index) => (
              <PdfPage
                key={`${src}-${index + 1}`}
                pdf={pdf}
                pageNumber={index + 1}
                width={containerWidth}
                zoom={zoom}
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
  )
}

function PdfPage({
  pdf,
  pageNumber,
  width,
  zoom,
  t,
}: {
  pdf: PDFDocumentProxy
  pageNumber: number
  width: number
  zoom: number
  t: (en: string, id: string) => string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!canvasRef.current || !textLayerRef.current || width <= 0) return

    let active = true
    let renderTask: ReturnType<PDFPageProxy['render']> | undefined
    let textLayer: InstanceType<typeof import('pdfjs-dist').TextLayer> | undefined

    void pdf.getPage(pageNumber).then((page) => {
      if (!active || !canvasRef.current || !textLayerRef.current) return

      const baseViewport = page.getViewport({ scale: 1 })
      const scale = Math.min((width * zoom) / baseViewport.width, 3)
      const viewport = page.getViewport({ scale })
      const outputScale = Math.min(window.devicePixelRatio || 1, 2)
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas rendering is unavailable.')

      canvas.width = Math.floor(viewport.width * outputScale)
      canvas.height = Math.floor(viewport.height * outputScale)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`
      const textLayerElement = textLayerRef.current
      textLayerElement.style.width = `${Math.floor(viewport.width)}px`
      textLayerElement.style.height = `${Math.floor(viewport.height)}px`

      renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
      })
      return Promise.all([
        renderTask.promise,
        page.getTextContent().then(async (textContent) => {
          const pdfjs = await import('pdfjs-dist')
          if (!active || !textLayerRef.current) return
          textLayer = new pdfjs.TextLayer({
            textContentSource: textContent,
            container: textLayerRef.current,
            viewport,
          })
          await textLayer.render()
        }),
      ])
    }).catch((renderError: unknown) => {
      if (!active) return
      console.error(`Failed to render PDF page ${pageNumber}.`, renderError)
      setError(true)
    })

    return () => {
      active = false
      renderTask?.cancel()
      textLayer?.cancel()
      textLayerRef.current?.replaceChildren()
    }
  }, [pageNumber, pdf, t, width, zoom])

  if (error) {
    return <p role="alert" className="max-w-sm rounded-lg bg-white p-4 text-center text-sm font-semibold text-rose-700">{t(`Page ${pageNumber} could not be displayed.`, `Halaman ${pageNumber} tidak dapat ditampilkan.`)}</p>
  }

  return (
    <div className="relative max-w-none bg-white shadow-md">
      <canvas
        ref={canvasRef}
        aria-label={t(`PDF page ${pageNumber}`, `Halaman PDF ${pageNumber}`)}
        className="block max-w-none"
      />
      <div
        ref={textLayerRef}
        aria-label={t(`Selectable text on PDF page ${pageNumber}`, `Teks yang dapat dipilih pada halaman PDF ${pageNumber}`)}
        className="pdf-text-layer absolute left-0 top-0 select-text overflow-hidden leading-none"
      />
    </div>
  )
}
