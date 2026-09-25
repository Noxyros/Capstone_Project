'use client'

import React from 'react'
import { Check, FileText, Gamepad2, Sparkles, Swords, Gift } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'

export type NodeType = 'lesson' | 'quiz' | 'summary' | 'exam' | 'chest' | 'material' | 'boss' | 'ai-checkpoint'

export type RoadmapNode = {
  id: string
  title: string
  status: 'locked' | 'current' | 'completed'
  type: NodeType
}

interface RoadmapProps {
  nodes?: RoadmapNode[]
}

const defaultNodes: RoadmapNode[] = [
  { id: '1', title: 'Base and Exponents', status: 'completed', type: 'lesson' },
  { id: '2', title: 'Exponent Rules Quiz', status: 'completed', type: 'quiz' },
  { id: '3', title: 'Logarithm Practice Quiz', status: 'completed', type: 'quiz' },
  { id: '4', title: 'Chapter 1 Summary', status: 'completed', type: 'summary' },
  { id: '5', title: 'Chapter 1 Final Challenge', status: 'current', type: 'exam' },
  { id: '6', title: 'Victory Treasure Chest', status: 'locked', type: 'chest' }
]

export default function Roadmap({ nodes = defaultNodes }: RoadmapProps) {
  const { t } = useLanguage()

  const nodeConfig: Record<string, any> = {
    lesson: { label: t('LESSON', 'PELAJARAN'), icon: FileText, bg: 'bg-[#0095FF]', text: 'text-[#0095FF]' },
    quiz: { label: t('QUIZ', 'KUIS'), icon: Gamepad2, bg: 'bg-[#A359FF]', text: 'text-[#A359FF]' },
    summary: { label: t('SUMMARY', 'RINGKASAN'), icon: Sparkles, bg: 'bg-[#0EA5E9]', text: 'text-[#0EA5E9]' },
    exam: { label: t('FINAL CHALLENGE', 'TANTANGAN AKHIR'), icon: Swords, bg: 'bg-[#FF4B55]', text: 'text-[#FF4B55]' },
    chest: { label: t('REWARD', 'HADIAH'), icon: Gift, bg: 'bg-[#F59E0B]', text: 'text-[#F59E0B]' },
    material: { label: t('LESSON', 'PELAJARAN'), icon: FileText, bg: 'bg-[#0095FF]', text: 'text-[#0095FF]' },
    boss: { label: t('FINAL CHALLENGE', 'TANTANGAN AKHIR'), icon: Swords, bg: 'bg-[#FF4B55]', text: 'text-[#FF4B55]' },
    'ai-checkpoint': { label: t('QUIZ', 'KUIS'), icon: Gamepad2, bg: 'bg-[#A359FF]', text: 'text-[#A359FF]' }
  }

  return (
    <div className="py-6 sm:py-12 flex flex-col items-center w-full max-w-md mx-auto px-2 sm:px-4">
      {nodes.map((node, index) => {
        const isLeft = index % 2 === 0
        const hasNext = index < nodes.length - 1
        const isCompleted = node.status === 'completed'
        const isLocked = node.status === 'locked'
        
        const config = nodeConfig[node.type] || nodeConfig.lesson
        const NodeIcon = config.icon

        // SVG stroke uses text class mapped by global.css in dark mode
        const strokeColorClass = isCompleted ? 'text-[#38BDF8]' : 'text-slate-200'
        
        const shiftClass = isLeft 
          ? '-translate-x-6 sm:-translate-x-8' 
          : 'translate-x-6 sm:translate-x-8'

        return (
          <React.Fragment key={node.id}>
            
            {/* CARD CONTAINER */}
            <div className="flex flex-col items-center w-full relative z-10">
              <div className={`w-[260px] sm:w-[320px] relative transition-transform duration-300 ${shiftClass}`}>
                
                {/* 
                  Opaque background container (bg-white). 
                  global.css automatically transforms bg-white to #162329 in dark mode without transparency.
                */}
                <div className={`w-full p-3 sm:p-4 rounded-2xl border-[3px] transition-all duration-200 bg-white ${
                  isLocked 
                    ? 'border-slate-200' 
                    : 'border-slate-100 shadow-sm hover:shadow-md'
                }`}>
                  
                  {/* Inner wrapper applies dimming and grayscale to icons/text only */}
                  <div className={`flex items-center gap-3 sm:gap-4 text-left w-full ${isLocked ? 'opacity-50 grayscale' : ''}`}>
                    <div className="relative shrink-0">
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white ${config.bg}`}>
                        <NodeIcon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2} />
                      </div>

                      {isCompleted && (
                        <div className="absolute -bottom-1 -right-1 bg-[#6366f1] text-white rounded-full p-0.5 border-[3px] border-white z-20">
                          <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={4} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center h-12 sm:h-14">
                      <div className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wide ${config.text}`}>
                        {config.label}
                      </div>
                      <h3 className="font-bold text-[13px] sm:text-[15px] leading-tight text-slate-800 mt-0.5 truncate">
                        {node.title}
                      </h3>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* CONNECTORS */}
            {hasNext && (
              <div className="relative w-full h-16 sm:h-20 -my-1 z-0 pointer-events-none flex justify-center">
                {/* Mobile SVG */}
                <svg width="200" height="64" viewBox="0 0 200 64" className={`overflow-visible sm:hidden block ${strokeColorClass}`}>
                  <path
                    d={isLeft ? 'M 76 0 V 16 Q 76 32 86 32 H 114 Q 124 32 124 48 V 64' : 'M 124 0 V 16 Q 124 32 114 32 H 86 Q 76 32 76 48 V 64'}
                    fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" 
                  />
                </svg>

                {/* Desktop SVG */}
                <svg width="320" height="80" viewBox="0 0 320 80" className={`overflow-visible hidden sm:block ${strokeColorClass}`}>
                  <path
                    d={isLeft ? 'M 128 0 V 20 Q 128 40 148 40 H 172 Q 192 40 192 60 V 80' : 'M 192 0 V 20 Q 192 40 172 40 H 148 Q 128 40 128 60 V 80'}
                    fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" 
                  />
                </svg>
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}