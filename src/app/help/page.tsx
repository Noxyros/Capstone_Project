'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/src/context/LanguageContext'
import {
  LifeBuoy, Heart, Flame, ChevronLeft,
  Trophy, Gem, Target, Dumbbell, Sparkles, GraduationCap
} from 'lucide-react'

export default function HelpPage() {
  const router = useRouter()
  const { t } = useLanguage()

  const helpTopics = [
    {
      id: 'hearts',
      icon: Heart,
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-500 fill-rose-500',
      title: t('What are hearts?', 'Apa itu nyawa?'),
      desc: t(
        'Hearts are tries. Miss a question and you lose one. They refill over time, or you can spend Gems in the top bar to refill them instantly.',
        'Nyawa adalah kesempatan mencoba. Jika salah menjawab, nyawa berkurang. Nyawa akan terisi seiring waktu atau dapat diisi ulang menggunakan Permata di bar atas.'
      ),
    },
    {
      id: 'streak',
      icon: Flame,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-500 fill-orange-500',
      title: t('How do I keep a streak?', 'Bagaimana cara menjaga streak?'),
      desc: t(
        'Complete at least one lesson or quiz every day to keep your flame burning. Equip a Streak Freeze from the shop to protect your streak if you miss a day.',
        'Selesaikan minimal satu materi atau kuis setiap hari. Pasang Pembeku Streak untuk melindungi streak jika kamu terlewat satu hari.'
      ),
    },
    {
      id: 'leaderboard',
      icon: Trophy,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-500 fill-amber-500',
      title: t('How does the leaderboard work?', 'Bagaimana cara kerja papan peringkat?'),
      desc: t(
        'Earn XP by finishing lessons, quizzes, and practice drills. The leaderboard ranks learners based on weekly XP and automatically resets every Monday.',
        'Dapatkan XP dari pelajaran, kuis, dan latihan. Papan peringkat mengurutkan siswa berdasarkan XP mingguan dan direset otomatis setiap hari Senin.'
      ),
    },
    {
      id: 'gems',
      icon: Gem,
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      title: t('What are gems used for?', 'Untuk apa permata digunakan?'),
      desc: t(
        'Gems are the in-app reward currency. Use them to buy Streak Freezes, refill hearts, or activate Double XP boosts to accelerate your learning progress.',
        'Permata adalah mata uang hadiah di aplikasi. Gunakan untuk membeli Pembeku Streak, isi ulang nyawa, atau bonus XP Ganda.'
      ),
    },
    {
      id: 'quests',
      icon: Target,
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-500',
      title: t('What are daily quests & challenges?', 'Apa itu misi & tantangan harian?'),
      desc: t(
        'Check your right panel or mobile menu daily for micro-goals. Complete the 3-question Daily Challenge to earn substantial bonus XP and gems every day.',
        'Cek panel kanan atau menu mobile untuk misi harian. Selesaikan Tantangan Harian 3 soal untuk bonus besar XP dan permata setiap hari.'
      ),
    },
    {
      id: 'practice',
      icon: Dumbbell,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      title: t('How does the Practice Hub work?', 'Bagaimana cara kerja Pusat Latihan?'),
      desc: t(
        'Use Mistake Review to fix questions you answered incorrectly, Weak Skills to master topics with scores below 80%, or Rapid Sprint for fast timed drills.',
        'Gunakan Perbaikan Kesalahan untuk mengulang soal yang salah, Keahlian Lemah untuk topik dengan nilai di bawah 80%, atau Tantangan Cepat bertarget waktu.'
      ),
    },
    {
      id: 'tutor',
      icon: Sparkles,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      title: t('How do I use the AI Tutor?', 'Bagaimana cara memakai Tutor AI?'),
      desc: t(
        'Click the AI Tutor button during any lesson or quiz to ask questions, request hints, or get step-by-step explanations tailored to your grade level.',
        'Klik tombol Tutor AI saat belajar atau kuis untuk bertanya, meminta petunjuk, atau mendapatkan penjelasan langkah demi langkah sesuai jenjang kelasmu.'
      ),
    },
    {
      id: 'teacher',
      icon: GraduationCap,
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      title: t('What is Teacher Studio?', 'Apa itu Studio Guru?'),
      desc: t(
        'Teachers can create subjects for Grades 1–12, organize chapters and submodules, upload PDF lesson materials, and generate full curriculum roadmaps using AI.',
        'Guru dapat membuat mata pelajaran Kelas 1–12, menyusun bab dan modul, mengunggah materi PDF, serta membuat roadmap otomatis dengan bantuan AI.'
      ),
    },
  ]

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
      
      {/* Mobile Navigation Header */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center md:hidden pb-3 border-b border-slate-100">
        <button 
          onClick={() => router.back()} 
          className="justify-self-start text-sky-500 hover:text-sky-600 p-1 flex items-center gap-1 font-extrabold text-xs uppercase tracking-wide"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>{t('Back', 'Kembali')}</span>
        </button>
        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
          {t('Help Center', 'Pusat Bantuan')}
        </span>
        <div />
      </div>

      <div className="mb-8 hidden md:block">
        <h1 className="text-3xl font-extrabold text-slate-700 flex items-center gap-3">
          <LifeBuoy className="w-8 h-8 text-sky-500" />
          {t('Help & Guide', 'Bantuan & Panduan')}
        </h1>
        <p className="text-base font-semibold text-slate-500 mt-2">
          {t('Everything you need to know about playing and learning on Questly.', 'Semua yang perlu kamu ketahui tentang cara belajar dan bermain di Questly.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {helpTopics.map((topic) => {
          const Icon = topic.icon
          return (
            <div
              key={topic.id}
              className="bg-white border-2 border-b-4 border-slate-200 rounded-2xl p-5 sm:p-6 transition-all hover:border-slate-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${topic.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${topic.iconColor}`} />
                </div>
                <h2 className="text-lg font-extrabold text-slate-700">
                  {topic.title}
                </h2>
              </div>
              <p className="text-sm font-semibold text-slate-500 leading-relaxed sm:pl-13">
                {topic.desc}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}