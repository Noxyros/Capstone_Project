// prisma/seed.ts
import { PrismaClient, Role, PowerUpType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    throw new Error('Refusing to clear database data. Set ALLOW_DESTRUCTIVE_SEED=true only for a disposable development database.')
  }

  // Clear old tables
  await prisma.userDailyQuizAttempt.deleteMany()
  await prisma.dailyQuizOption.deleteMany()
  await prisma.dailyQuiz.deleteMany()
  await prisma.userQuestProgress.deleteMany()
  await prisma.dailyQuest.deleteMany()
  await prisma.userPowerUp.deleteMany()
  await prisma.powerUp.deleteMany()
  await prisma.nodeProgress.deleteMany()
  await prisma.subjectEnrollment.deleteMany()
  await prisma.userProgress.deleteMany()
  await prisma.option.deleteMany()
  await prisma.question.deleteMany()
  await prisma.roadmapNode.deleteMany()
  await prisma.chapter.deleteMany()
  await prisma.subject.deleteMany()
  await prisma.grade.deleteMany()
  await prisma.user.deleteMany()

  // 1. Create Power-Ups
  const streakFreeze = await prisma.powerUp.create({
    data: {
      name: 'Streak Freeze',
      code: PowerUpType.STREAK_FREEZE,
      description: 'Protects your streak if you miss a day of practice.',
      costGems: 200,
      icon: 'snowflake',
    },
  })

  await prisma.powerUp.create({
    data: {
      name: 'Heart Refill',
      code: PowerUpType.HEART_REFILL,
      description: 'Instantly restores all lost hearts to 100%.',
      costGems: 250,
      icon: 'heart',
    },
  })

  await prisma.powerUp.create({
    data: {
      name: 'Double XP Boost',
      code: PowerUpType.DOUBLE_XP,
      description: 'Earn double XP on completed activities for 15 minutes.',
      costGems: 100,
      icon: 'zap',
    },
  })

  // 2. Create Users
  const student = await prisma.user.create({
    data: {
      email: 'student@example.com',
      name: 'Alex Developer',
      role: Role.STUDENT,
      streak: 12,
      totalXp: 450,
      hearts: 5,
      maxHearts: 5,
    },
  })

  await prisma.userPowerUp.create({
    data: {
      userId: student.id,
      powerUpId: streakFreeze.id,
      quantity: 1,
    },
  })

  // 3. Create Daily Quests
  await prisma.dailyQuest.createMany({
    data: [
      {
        title: 'Perfect Lesson',
        description: 'Score 100% in any lesson',
        targetCount: 1,
        xpReward: 20,
      },
      {
        title: 'Quick Thinker',
        description: 'Complete a lesson under 3 mins',
        targetCount: 1,
        xpReward: 40,
      },
    ],
  })

  // 4. Create Daily Quiz
  const todayDateStr = new Date().toISOString().split('T')[0]!
  await prisma.dailyQuiz.create({
    data: {
      date: todayDateStr,
      title: 'Are You Smarter Than a 7th Grader?',
      prompt: 'What is the chemical symbol for Gold?',
      xpReward: 100,
      options: {
        create: [
          { text: 'Ag (Silver)', isCorrect: false },
          { text: 'Au (Gold)', isCorrect: true },
          { text: 'Fe (Iron)', isCorrect: false },
        ],
      },
    },
  })

  console.log('Seeded app demo data successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })