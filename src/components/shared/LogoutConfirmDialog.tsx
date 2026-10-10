'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LogOut } from 'lucide-react'

interface LogoutConfirmDialogProps {
  open: boolean
  t: (english: string, indonesian: string) => string
  onClose: () => void
  onConfirm: () => Promise<void>
}

export default function LogoutConfirmDialog({
  open,
  t,
  onClose,
  onConfirm,
}: LogoutConfirmDialogProps) {
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSubmitting, onClose, open])

  if (!open || typeof document === 'undefined') return null

  const confirmLogout = async () => {
    setError('')
    setIsSubmitting(true)
    try {
      await onConfirm()
    } catch (confirmError) {
      setError(confirmError instanceof Error
        ? confirmError.message
        : t('Could not sign out. Please try again.', 'Gagal keluar. Silakan coba lagi.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <LogOut aria-hidden="true" className="h-5 w-5 shrink-0 text-rose-600" />
            <h2 id="logout-dialog-title" className="text-xl font-black text-slate-800">
              {t('Log out?', 'Keluar dari akun?')}
            </h2>
          </div>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
            {t('You will be signed out of this account on this device.', 'Kamu akan keluar dari akun ini di perangkat ini.')}
          </p>
        </div>
        {error && <p role="alert" className="text-sm font-bold text-rose-600">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            autoFocus
            disabled={isSubmitting}
            onClick={onClose}
            className="flex-1 rounded-2xl bg-slate-100 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('Cancel', 'Batal')}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void confirmLogout()}
            className="flex-1 rounded-2xl bg-rose-600 py-3 text-sm font-extrabold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? t('Logging out…', 'Sedang keluar…') : t('Log out', 'Keluar')}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
