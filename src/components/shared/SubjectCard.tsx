'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Calculator,
  FlaskConical,
  Languages,
  Globe,
  BookOpen,
  Shield,
  ChevronRight,
  Atom,
  Dna,
  Landmark,
  TrendingUp,
  Laptop,
  Palette,
  Activity,
  Music,
  Sparkles,
  Users,
  Leaf,
} from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/src/context/LanguageContext'
import type { SubjectColor } from '@/src/lib/teacherContent'

export type { SubjectColor }

interface SubjectCardProps {
  id: string
  name: string
  color: SubjectColor
  progress: number
  iconType?: string
}

const colorThemeMap: Record<SubjectColor, { bg: string; border: string; text: string }> = {
  blue: { bg: 'bg-sky-400', border: 'border-sky-600', text: 'text-sky-600 dark:text-sky-400' },
  green: { bg: 'bg-emerald-400', border: 'border-emerald-600', text: 'text-emerald-600 dark:text-emerald-400' },
  rose: { bg: 'bg-rose-400', border: 'border-rose-600', text: 'text-rose-600 dark:text-rose-400' },
  amber: { bg: 'bg-amber-400', border: 'border-amber-600', text: 'text-amber-600 dark:text-amber-400' },
  purple: { bg: 'bg-purple-400', border: 'border-purple-600', text: 'text-purple-600 dark:text-purple-400' },
  cyan: { bg: 'bg-cyan-400', border: 'border-cyan-600', text: 'text-cyan-600 dark:text-cyan-400' },
  orange: { bg: 'bg-orange-400', border: 'border-orange-600', text: 'text-orange-600 dark:text-orange-400' },
  indigo: { bg: 'bg-indigo-500', border: 'border-indigo-700', text: 'text-indigo-600 dark:text-indigo-400' },
  teal: { bg: 'bg-teal-400', border: 'border-teal-600', text: 'text-teal-600 dark:text-teal-400' },
  red: { bg: 'bg-red-500', border: 'border-red-700', text: 'text-red-600 dark:text-red-400' },
  lime: { bg: 'bg-lime-400', border: 'border-lime-600', text: 'text-lime-700 dark:text-lime-400' },
  pink: { bg: 'bg-pink-400', border: 'border-pink-600', text: 'text-pink-600 dark:text-pink-400' },
}

export default function SubjectCard({ id, name, color, progress, iconType }: SubjectCardProps) {
  const { t } = useLanguage()
  const theme = colorThemeMap[color] || colorThemeMap.blue

  // Pick appropriate icon based on string or fallback
  const renderIcon = () => {
    const iconClass = 'w-7 h-7 text-white stroke-[2.25] drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]'
    switch (iconType || color) {
      case 'calculator':
      case 'math':
        return <Calculator className={iconClass} />
      case 'flask':
      case 'chemistry':
      case 'science':
        return <FlaskConical className={iconClass} />
      case 'atom':
      case 'physics':
        return <Atom className={iconClass} />
      case 'dna':
      case 'biology':
        return <Dna className={iconClass} />
      case 'languages':
      case 'english':
        return <Languages className={iconClass} />
      case 'globe':
      case 'geography':
      case 'social':
        return <Globe className={iconClass} />
      case 'landmark':
      case 'history':
        return <Landmark className={iconClass} />
      case 'trending_up':
      case 'economics':
      case 'finance':
        return <TrendingUp className={iconClass} />
      case 'shield':
      case 'civics':
      case 'pancasila':
        return <Shield className={iconClass} />
      case 'laptop':
      case 'informatics':
      case 'computer':
        return <Laptop className={iconClass} />
      case 'palette':
      case 'art':
      case 'sbdp':
        return <Palette className={iconClass} />
      case 'music':
        return <Music className={iconClass} />
      case 'activity':
      case 'sports':
      case 'pjok':
        return <Activity className={iconClass} />
      case 'users':
      case 'sociology':
        return <Users className={iconClass} />
      case 'leaf':
      case 'nature':
      case 'environment':
        return <Leaf className={iconClass} />
      case 'sparkles':
      case 'religion':
      case 'character':
        return <Sparkles className={iconClass} />
      case 'book':
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
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${theme.bg} border-b-4 ${theme.border} shadow-sm shrink-0`}>
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