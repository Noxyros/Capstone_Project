'use client'

import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import Roadmap, { RoadmapNode } from '@/src/components/shared/Roadmap'
import { useLanguage } from '@/src/context/LanguageContext'

export default function ChapterRoadmapPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const chapterId = params.id

  const MOCK_ROADMAP_DATA: Record<string, { title: string, color: 'blue' | 'green' | 'rose' | 'amber' | 'purple' | 'cyan', nodes: RoadmapNode[] }> = {
    'ch-1': {
      title: t('Exponents & Powers', 'Eksponen & Pangkat'),
      color: 'blue',
      nodes: [
        { id: 'node-1', title: t('Base and Exponents', 'Basis dan Eksponen'), status: 'completed', type: 'lesson' },
        { id: 'node-2', title: t('Exponent Rules Quiz', 'Kuis Aturan Eksponen'), status: 'completed', type: 'quiz' },
        { id: 'node-3', title: t('Logarithm Practice Quiz', 'Kuis Latihan Logaritma'), status: 'completed', type: 'quiz' },
        { id: 'node-4', title: t('Chapter 1 Summary', 'Ringkasan Bab 1'), status: 'completed', type: 'summary' },
        { id: 'node-5', title: t('Chapter 1 Final Challenge', 'Tantangan Akhir Bab 1'), status: 'current', type: 'exam' },
        { id: 'node-6', title: t('Victory Treasure Chest', 'Peti Harta Kemenangan'), status: 'locked', type: 'chest' },
      ]
    },
    'ch-2': {
      title: t('Introduction to Logarithms', 'Pengenalan Logaritma'),
      color: 'blue',
      nodes: [
        { id: 'node-1', title: t('What is a Logarithm?', 'Apa itu Logaritma?'), status: 'completed', type: 'lesson' },
        { id: 'node-2', title: t('Logarithmic Form', 'Bentuk Logaritma'), status: 'current', type: 'lesson' },
        { id: 'node-3', title: t('AI Review Checkpoint', 'Ulasan AI'), status: 'locked', type: 'ai-checkpoint' },
        { id: 'node-4', title: t('Basic Properties', 'Sifat Dasar'), status: 'locked', type: 'lesson' },
        { id: 'node-5', title: t('Chapter 2 Boss Exam', 'Ujian Bab 2'), status: 'locked', type: 'exam' },
      ]
    },
    'ch-4': {
      title: t('Photosynthesis & Plant Energy', 'Fotosintesis & Energi Tumbuhan'),
      color: 'green',
      nodes: [
        { id: 'node-1', title: t('Chloroplasts', 'Kloroplas'), status: 'completed', type: 'lesson' },
        { id: 'node-2', title: t('Light Reactions', 'Reaksi Terang'), status: 'current', type: 'lesson' },
        { id: 'node-3', title: t('AI Concept Check', 'Cek Konsep AI'), status: 'locked', type: 'ai-checkpoint' },
      ]
    }
  }

  const chapterData = MOCK_ROADMAP_DATA[chapterId] || {
    title: t('Unknown Chapter', 'Bab Tidak Dikenal'),
    color: 'blue' as const,
    nodes: []
  }

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Sticky Header: bg-white/90 will naturally map via your CSS */}
      <div className="sticky top-4 z-30 flex items-center gap-4 mb-8 bg-white/90 backdrop-blur-md shadow-sm p-4 rounded-3xl border-2 border-slate-200">
        <button
          onClick={() => {
            if (window.history.length > 2) {
              router.back()
            } else {
              router.push('/dashboard')
            }
          }}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
        >
          <ArrowLeft className="w-6 h-6 stroke-[3]" />
        </button>
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">
            {t('Chapter Roadmap', 'Peta Belajar Bab')}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-700">
            {chapterData.title}
          </h1>
        </div>
      </div>

      {/* Background container: bg-slate-50 maps to your dark mode CSS automatically */}
      <div className="bg-slate-50 rounded-3xl p-4 sm:p-8 overflow-hidden relative border-2 border-slate-200">
        {chapterData.nodes.length > 0 ? (
          <Roadmap nodes={chapterData.nodes} />
        ) : (
          <div className="text-center text-slate-400 font-bold py-10">
            {t('No lessons available for this chapter yet.', 'Belum ada pelajaran untuk bab ini.')}
          </div>
        )}
      </div>
    </div>
  )
}