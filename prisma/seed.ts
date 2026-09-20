// prisma/seed.ts
import { PrismaClient, Role, PowerUpType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear old tables
  await prisma.userDailyQuizAttempt.deleteMany()
  await prisma.dailyQuizOption.deleteMany()
  await prisma.dailyQuiz.deleteMany()
  await prisma.userQuestProgress.deleteMany()
  await prisma.dailyQuest.deleteMany()
  await prisma.userPowerUp.deleteMany()
  await prisma.powerUp.deleteMany()
  await prisma.userProgress.deleteMany()
  await prisma.option.deleteMany()
  await prisma.question.deleteMany()
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
      costXp: 100,
      icon: 'snowflake',
    },
  })

  await prisma.powerUp.create({
    data: {
      name: 'Heart Refill',
      code: PowerUpType.HEART_REFILL,
      description: 'Instantly restores all lost hearts to 100%.',
      costXp: 50,
      icon: 'heart',
    },
  })

  await prisma.powerUp.create({
    data: {
      name: 'Double XP Boost',
      code: PowerUpType.DOUBLE_XP,
      description: 'Earn double XP on all completed lessons for 30 minutes.',
      costXp: 150,
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

  // 5. Create Grade 7 & Full Middle School Subjects
  const grade7 = await prisma.grade.create({
    data: { name: 'Class 7', level: 7 },
  })

  const math = await prisma.subject.create({
    data: { name: 'Mathematics', icon: 'calculator', gradeId: grade7.id },
  })

  const science = await prisma.subject.create({
    data: { name: 'Science & Biology', icon: 'flask', gradeId: grade7.id },
  })

  const english = await prisma.subject.create({
    data: { name: 'English Language', icon: 'languages', gradeId: grade7.id },
  })

  const social = await prisma.subject.create({
    data: { name: 'Social Studies', icon: 'globe', gradeId: grade7.id },
  })

  const indonesian = await prisma.subject.create({
    data: { name: 'Bahasa Indonesia', icon: 'book', gradeId: grade7.id },
  })

  const civics = await prisma.subject.create({
    data: { name: 'Civics (Pancasila)', icon: 'shield', gradeId: grade7.id },
  })

  // 6. Create Chapters / Smaller Modules
  // Mathematics Modules
  const expChapter = await prisma.chapter.create({
    data: {
      title: 'Exponents & Powers',
      order: 1,
      subjectId: math.id,
      summaryText: 'Learn rules of exponents: $a^m \\times a^n = a^{m+n}$.',
      questions: {
        create: [
          {
            prompt: 'What is $2^3$?',
            options: {
              create: [
                { text: '8', isCorrect: true },
                { text: '6', isCorrect: false },
                { text: '9', isCorrect: false },
              ],
            },
          },
        ],
      },
    },
  })

  const logChapter = await prisma.chapter.create({
    data: {
      title: 'Introduction to Logarithms',
      order: 2,
      subjectId: math.id,
      summaryText: 'Logarithms are the inverse operation of exponentiation.',
      questions: {
        create: [
          {
            prompt: 'What is $\\log_{10}(100)$?',
            options: {
              create: [
                { text: '2', isCorrect: true },
                { text: '10', isCorrect: false },
              ],
            },
          },
        ],
      },
    },
  })

  await prisma.chapter.create({
    data: {
      title: 'Linear Equations in One Variable',
      order: 3,
      subjectId: math.id,
      summaryText: 'Solve equations of the form $ax + b = c$.',
    },
  })

  // Science Modules
  const photoChapter = await prisma.chapter.create({
    data: {
      title: 'Photosynthesis & Plant Energy',
      order: 1,
      subjectId: science.id,
      summaryText: 'How plants turn sunlight into glucose and oxygen.',
    },
  })

  await prisma.chapter.create({
    data: {
      title: 'Atoms, Elements & Compounds',
      order: 2,
      subjectId: science.id,
      summaryText: 'Understanding the periodic table and basic chemistry.',
    },
  })

  // 7. Seed User Progress (Math is partly done, Science started)
  await prisma.userProgress.createMany({
    data: [
      { userId: student.id, chapterId: expChapter.id, completed: true },
      { userId: student.id, chapterId: logChapter.id, completed: false },
      { userId: student.id, chapterId: photoChapter.id, completed: true },
    ],
  })

  console.log('Seeded Grade 7 subjects and chapters successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })