type YouTubeEmbedProps = {
  src: string
  title: string
}

export function YouTubeEmbed({ src, title }: YouTubeEmbedProps) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-black">
      <iframe
        src={src}
        title={title}
        className="h-full w-full"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}
