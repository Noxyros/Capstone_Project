type QuestionImageProps = {
  src?: string | null
  alt?: string | null
}

export default function QuestionImage({ src, alt }: QuestionImageProps) {
  if (!src) return null
  const description = alt?.trim()

  return (
    <figure className="my-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
      {description && (
        <figcaption className="px-2 pb-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
          {description}
        </figcaption>
      )}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="mx-auto max-h-96 max-w-full object-contain"
      />
    </figure>
  )
}
