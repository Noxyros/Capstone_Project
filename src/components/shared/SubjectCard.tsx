'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Calculator, FlaskConical, Languages, Globe, BookOpen, Shield, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/src/context/LanguageContext'

export type SubjectColor = 'blue' | 'green' | 'rose' | 'amber' | 'purple' | 'cyan'

interface SubjectCardProps {
  id: string
  name: string
  color: SubjectColor
  progress: number
  iconType?: string
}

const colorThemeMap: Record<SubjectColor, { bg: string; border: string; text: string; lightBg: string }> = {
  blue: { bg: 'bg-sky-400', border: 'border-sky-600', text: 'text-sky-600', lightBg: 'bg-sky-100' },
  green: { bg: 'bg-emerald-400', border: 'border-emerald-600', text: 'text-emerald-600', lightBg: 'bg-emerald-100' },
  rose: { bg: 'bg-rose-400', border: 'border-rose-600', text: 'text-rose-600', lightBg: 'bg-rose-100' },
  amber: { bg: 'bg-amber-400', border: 'border-amber-600', text: 'text-amber-600', lightBg: 'bg-amber-100' },
  purple: { bg: 'bg-purple-400', border: 'border-purple-600', text: 'text-purple-600', lightBg: 'bg-purple-100' },
  cyan: { bg: 'bg-cyan-400', border: 'border-cyan-600', text: 'text-cyan-600', lightBg: 'bg-cyan-100' },
}

export default function SubjectCard({ id, name, color, progress, iconType }: SubjectCardProps) {
  const { t } = useLanguage()
  const theme = colorThemeMap[color] || colorThemeMap.blue

  // Pick appropriate icon based on string or fallback
  const renderIcon = () => {
    const iconClass = `w-8 h-8 ${theme.text}`
    switch (iconType || color) {
      case 'calculator':
      case 'blue':
        return <Calculator className={iconClass} />
      case 'flask':
      case 'green':
        return <FlaskConical className={iconClass} />
      case 'languages':
      case 'rose':
        return <Languages className={iconClass} />
      case 'globe':
      case 'amber':
        return <Globe className={iconClass} />
      case 'book':
      case 'purple':
        return <BookOpen className={iconClass} />
      case 'shield':
      case 'cyan':
        return <Shield className={iconClass} />
      default:
        return <BookOpen className={iconClass} />
    }
  }

  // Dynamic Call-To-Action Message
  let actionText = t('Continue Path', 'Lanjut Belajar')
  if (progress === 0) {
    actionText = t('Start Path', 'Mulai Belajar')
  } else if (progress === 100) {
    actionText = t('Review', 'Ulangi Materi')
  }

  return (
    <Link href={`/subject/${id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        whileTap={{ y: 4, scale: 0.98 }}
        className="bg-white border-2 border-b-8 border-slate-200 hover:border-slate-300 rounded-3xl p-5 cursor-pointer transition-colors relative overflow-hidden group h-full flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-2xl ${theme.lightBg}`}>
              {renderIcon()}
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">
                {t('Progress', 'Progres')}
              </span>
              <div className="w-24 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className={`h-full ${theme.bg} rounded-full transition-all duration-300`} 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <h3 className="text-xl font-extrabold text-slate-700 group-hover:text-slate-800">
            {name}
          </h3>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className={`text-sm font-bold ${theme.text}`}>
            {actionText}
          </span>
          <div className={`p-1.5 rounded-xl text-white ${theme.bg} border-b-4 ${theme.border}`}>
            <ChevronRight className="w-5 h-5 stroke-2" />
          </div>
        </div>
      </motion.div>
    </Link>
  )
}