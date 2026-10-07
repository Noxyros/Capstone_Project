'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Bot, MessageCircle, Send, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import { useLanguage } from '@/src/context/LanguageContext'

type TutorContext =
  | {
    kind: 'quiz'
    title: string
    question: string
    choices: string[]
    answerStatus: 'unanswered' | 'checked'
    selectedAnswers: string[]
    correctAnswers: string[]
  }
  | {
    kind: 'lesson'
    title: string
    content: string
    mediaNote: string
  }

type TutorMessage = {
  role: 'user' | 'assistant'
  text: string
}

// Fenced code blocks are split out (odd indexes) so math conversion never touches them.
const CODE_FENCE = /(```[\s\S]*?```)/g

/**
 * Converts the LaTeX delimiters models like to emit (\[ \] and \( \)) into the
 * $$ / $ delimiters remark-math understands.
 *
 * Important: this must never guess at "bare" equations line by line. Doing so
 * wrapped lines that were already inside a $$ block and stripped their list
 * indentation, which flipped the $$ open/close fences and made KaTeX try to
 * parse normal text (the red "*Example:* $...$" lines). If the model forgets
 * delimiters, fix it in the system prompt instead.
 */
function normalizeTutorMath(markdown: string): string {
  return markdown
    .split(CODE_FENCE)
    .map((chunk, i) => (i % 2 === 1 ? chunk : normalizeChunk(chunk)))
    .join('')
}

function normalizeChunk(text: string): string {
  return text
    // \[ ... \] starting a line -> real $$ block; every line keeps the opening line's indentation
    .replace(/^([ \t]*)\\\[((?:(?!\\\])[\s\S])+)\\\][ \t]*$/gm, (_, indent: string, math: string) => {
      const body = math.trim().split('\n').map((line) => `${indent}${line.trim()}`).join('\n')
      return `${indent}$$\n${body}\n${indent}$$`
    })
    // \[ ... \] in the middle of a sentence
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, math: string) => `$$${math.trim()}$$`)
    // \( ... \) -> $ ... $
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, math: string) => `$${math.trim()}$`)
    // a line that is only "$$ ... $$" -> fenced block (single-line $$ is parsed as inline math)
    .replace(/^([ \t]*)\$\$([^$\n]+?)\$\$[ \t]*$/gm, (_, indent: string, math: string) =>
      `${indent}$$\n${indent}${math.trim()}\n${indent}$$`)
    // clean up "* *bold* *" and "_ _bold_ _"
    .replace(/\*\s+\*([^*\n]+?)\s+\*\s+\*/g, (_, phrase: string) => `**${phrase.trim()}**`)
    .replace(/_\s+_([^_\n]+?)\s+_\s+_/g, (_, phrase: string) => `**${phrase.trim()}**`)
    .replace(/\*\*\s+([^*\n]+?)\s+\*\*/g, '**$1**')
    .replace(/__\s+([^_\n]+?)\s+__/g, '**$1**')
}

export function LearningTutor({ context }: { context: TutorContext }) {
  const { language, t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const isSendingRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isWaitingForFirstToken = isSending && messages[messages.length - 1]?.role !== 'assistant'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: isSending ? 'auto' : 'smooth', block: 'nearest' })
  }, [messages, error, isSending])

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || isSendingRef.current) return

    isSendingRef.current = true
    const userMessage: TutorMessage = { role: 'user', text }
    const nextMessages = [...messages, userMessage].slice(-12)
    setMessages(nextMessages)
    setInput('')
    setError('')
    setIsSending(true)
    const fallbackError = t(
      'Could not connect to the AI tutor. Check your connection and try again.',
      'Tidak dapat terhubung ke tutor AI. Periksa koneksi lalu coba lagi.'
    )

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, context, messages: nextMessages }),
      })
      if (!response.ok) {
        let result: unknown
        try {
          result = await response.json()
        } catch {
          throw new Error(fallbackError)
        }
        const code = typeof result === 'object'
          && result !== null
          && 'code' in result
          && typeof result.code === 'string'
          ? result.code
          : ''
        const message = code === 'not_configured'
          ? t(
            'The AI tutor is not configured yet. Add GROQ_API_KEY to .env.local and restart the server.',
            'Tutor AI belum dikonfigurasi. Tambahkan GROQ_API_KEY ke .env.local lalu mulai ulang server.'
          )
          : code === 'invalid_api_key'
            ? t(
              'Groq rejected the API key. Check GROQ_API_KEY in .env.local and restart the server.',
              'Groq menolak kunci API. Periksa GROQ_API_KEY di .env.local lalu mulai ulang server.'
            )
            : code === 'model_unavailable'
              ? t(
                'The configured Groq model is unavailable. Check GROQ_MODEL in .env.local.',
                'Model Groq yang dipilih tidak tersedia. Periksa GROQ_MODEL di .env.local.'
              )
              : response.status === 429
                ? t(
                  'Groq is at its request limit. Wait a little and try again.',
                  'Groq sedang mencapai batas permintaan. Tunggu sebentar lalu coba lagi.'
                )
                : response.status === 400
                  ? t(
                    'That message is invalid or too long. Please shorten it and try again.',
                    'Pesan tidak valid atau terlalu panjang. Persingkat lalu coba lagi.'
                  )
                  : response.status === 504
                    ? t(
                      'The AI tutor took too long to respond. Please try again.',
                      'Tutor AI terlalu lama merespons. Silakan coba lagi.'
                    )
                    : t(
                      'Groq could not answer right now. Check your connection and try again.',
                      'Groq belum bisa menjawab. Periksa koneksi lalu coba lagi.'
                    )
        throw new Error(message)
      }
      if (!response.body) {
        throw new Error(t('The AI tutor could not start a response stream.', 'Tutor AI tidak dapat memulai jawaban.'))
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      let buffer = ''
      let eventData: string[] = []
      let streamedText = ''
      let streamError = ''
      let sawDone = false

      // Give the browser a chance to paint each streamed update.
      const nextPaint = () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve())
        })

      const handleEvent = async () => {
        const data = eventData.join('\n').trim()
        eventData = []

        if (!data) return

        if (data === '[DONE]') {
          sawDone = true
          return
        }

        let event: unknown

        try {
          event = JSON.parse(data)
        } catch {
          return
        }

        if (
          typeof event !== 'object'
          || event === null
        ) {
          return
        }

        if (
          'error' in event
          && typeof event.error === 'string'
        ) {
          streamError = event.error
          return
        }

        if (
          'delta' in event
          && typeof event.delta === 'string'
          && event.delta
        ) {
          streamedText += event.delta

          const assistantMessage: TutorMessage = {
            role: 'assistant',
            text: streamedText,
          }

          setMessages(
            [...nextMessages, assistantMessage].slice(-12)
          )

          await nextPaint()
        }
      }

      const handleLine = async (rawLine: string) => {
        const line = rawLine.endsWith('\r')
          ? rawLine.slice(0, -1)
          : rawLine

        if (!line) {
          await handleEvent()
        } else if (line.startsWith('data:')) {
          eventData.push(line.slice(5).trimStart())
        }
      }

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          buffer += decoder.decode(value, {
            stream: true,
          })

          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            await handleLine(line)

            if (streamError || sawDone) {
              break
            }
          }

          if (streamError || sawDone) {
            break
          }
        }

        buffer += decoder.decode()

        if (buffer) {
          await handleLine(buffer)
        }

        if (eventData.length) {
          await handleEvent()
        }
      } finally {
        reader.releaseLock()
      }

      if (streamError) {
        throw new Error(streamError)
      }

      if (!streamedText.trim()) {
        throw new Error(
          t(
            'The AI tutor returned an empty response.',
            'Tutor AI memberikan jawaban kosong.',
          ),
        )
      }
    } catch (caught) {
      setMessages(messages)
      setInput(text)
      setError(caught instanceof Error && !(caught instanceof TypeError)
        ? caught.message
        : fallbackError)
    } finally {
      isSendingRef.current = false
      setIsSending(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border-2 border-indigo-100 bg-white shadow-sm">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-indigo-50 sm:p-5"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Bot className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-extrabold text-slate-800">
            {t('Ask your AI tutor', 'Tanya tutor AI')}
            <Sparkles className="h-4 w-4 text-amber-500" />
          </span>
          <span className="mt-0.5 block text-sm font-semibold text-slate-500">
            {context.kind === 'quiz'
              ? t('Get a hint or ask about this question', 'Minta petunjuk atau tanyakan soal ini')
              : t('Ask about this lesson', 'Tanyakan tentang materi ini')}
          </span>
        </span>
        <MessageCircle className="h-5 w-5 shrink-0 text-indigo-500" />
      </button>

      {isOpen && (
        <div className="border-t-2 border-indigo-100">
          <div
            aria-live="polite"
            className="max-h-72 space-y-3 overflow-y-auto p-4 sm:p-5"
          >
            {messages.length === 0 && (
              <div className="flex items-start gap-2.5">
                <Bot className="mt-1 h-5 w-5 shrink-0 text-indigo-500" />
                <p className="rounded-2xl rounded-tl-md bg-indigo-50 px-3.5 py-2.5 text-sm font-semibold leading-relaxed text-indigo-800">
                  {context.kind === 'quiz'
                    ? t('I can give you a hint without giving away an unchecked answer. What would you like help with?', 'Aku bisa memberi petunjuk tanpa membocorkan jawaban yang belum diperiksa. Bagian mana yang ingin kamu tanyakan?')
                    : t('What would you like to understand better? I can explain the lesson step by step.', 'Bagian mana yang ingin kamu pahami lebih baik? Aku bisa menjelaskan materi ini langkah demi langkah.')}
                </p>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'user' ? (
                  <p className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold leading-relaxed text-white">
                    {message.text}
                  </p>
                ) : (
                  <div className="tutor-message-reveal tutor-markdown max-w-[95%] rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-2.5 text-sm font-semibold leading-relaxed text-slate-700 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        h1: ({ children }) => <h1 className="mb-2 mt-3 text-base font-extrabold first:mt-0">{children}</h1>,
                        h2: ({ children }) => <h2 className="mb-2 mt-3 text-[15px] font-extrabold first:mt-0">{children}</h2>,
                        h3: ({ children }) => <h3 className="mb-1 mt-2 font-extrabold first:mt-0">{children}</h3>,
                        p: ({ children }) => <p className="my-2 whitespace-pre-wrap first:mt-0 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
                        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
                        li: ({ children }) => <li className="pl-0.5">{children}</li>,
                        strong: ({ children }) => <strong className="font-extrabold">{children}</strong>,
                        blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-indigo-300 pl-3 italic">{children}</blockquote>,
                        code: ({ children }) => <code className="rounded bg-slate-200 px-1 py-0.5 font-mono text-[0.9em]">{children}</code>,
                        pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-xl bg-slate-200 p-3 text-xs">{children}</pre>,
                        a: ({ children, href }) => <a className="font-bold text-indigo-600 underline underline-offset-2" href={href} target="_blank" rel="noreferrer">{children}</a>,
                        hr: () => <hr className="my-3 border-slate-300" />,
                      }}
                    >
                      {normalizeTutorMath(message.text)}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
            {isWaitingForFirstToken && (
              <div
                aria-label={t('Tutor is typing', 'Tutor sedang mengetik')}
                className="flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500"
              >
                <span className="sr-only">{t('Tutor is typing', 'Tutor sedang mengetik')}</span>
                <span className="tutor-typing-dot" />
                <span className="tutor-typing-dot [animation-delay:140ms]" />
                <span className="tutor-typing-dot [animation-delay:280ms]" />
              </div>
            )}
            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {error}
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-slate-100 p-3 sm:p-4">
            <label className="sr-only" htmlFor="learning-tutor-message">
              {t('Your message', 'Pesanmu')}
            </label>
            <textarea
              id="learning-tutor-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
              maxLength={2000}
              rows={1}
              placeholder={t('Ask a question…', 'Tulis pertanyaan…')}
              className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              aria-label={t('Send message', 'Kirim pesan')}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="space-y-1 px-4 pb-3 text-xs font-medium leading-relaxed text-slate-400 sm:px-5">
            <span className="block">
              {t(
                'Messages and lesson text are sent to Groq. Don’t share personal information.',
                'Pesan dan teks materi dikirim ke Groq. Jangan bagikan informasi pribadi.'
              )}
            </span>
            <span className="block">
              {t('AI can make mistakes. Check important information.', 'AI bisa membuat kesalahan. Periksa kembali informasi penting.')}
              {context.kind === 'lesson' && context.mediaNote && ` ${context.mediaNote}`}
            </span>
          </p>
        </div>
      )}
    </section>
  )
}