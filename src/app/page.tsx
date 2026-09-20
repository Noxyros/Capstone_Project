'use client'

import DailyQuizWidget from '@/src/components/widgets/DailyQuizWidget'
import DailyQuestCard from '@/src/components/widgets/DailyQuestCard'
import SubjectCard from '@/src/components/shared/SubjectCard'
import { Target } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'

export default function HomePage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-8">
      <DailyQuizWidget
        quizId="quiz-1"
        title={t("Are You Smarter Than a 7th Grader?", "Apakah Kamu Lebih Pintar dari Anak Kelas 7?")}
        prompt={t("What is the chemical symbol for Gold?", "Apa simbol kimia untuk Emas?")}
        options={[
          { id: '1', text: t('Ag (Silver)', 'Ag (Perak)'), isCorrect: false },
          { id: '2', text: t('Au (Gold)', 'Au (Emas)'), isCorrect: true },
          { id: '3', text: t('Fe (Iron)', 'Fe (Besi)'), isCorrect: false },
        ]}
        alreadyAttempted={false}
        xpReward={100}
      />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-slate-700 flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-500" /> {t('Daily Quests', 'Misi Harian')}
          </h2>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            {t('Resets in 14h', 'Reset dalam 14j')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DailyQuestCard
            title={t("Perfect Lesson", "Pelajaran Sempurna")}
            description={t("Score 100% in any lesson", "Dapatkan skor 100% di pelajaran apa pun")}
            xpReward={20}
            current={1}
            target={1}
          />
          <DailyQuestCard
            title={t("Quick Thinker", "Pemikir Cepat")}
            description={t("Complete a lesson under 3 mins", "Selesaikan pelajaran di bawah 3 menit")}
            xpReward={40}
            current={0}
            target={1}
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-extrabold text-slate-700 mb-4">{t('Your Subjects', 'Mata Pelajaranmu')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SubjectCard
            id="math-1"
            name={t("Mathematics", "Matematika")}
            color="blue"
            progress={35}
          />
          <SubjectCard
            id="science-1"
            name={t("Science", "Sains")}
            color="green"
            progress={12}
          />
        </div>
      </section>
    </div>
  )
}