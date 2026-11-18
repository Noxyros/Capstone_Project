# Questly

Questly is a bilingual (English and Indonesian) curriculum-based learning app. Students follow published learning paths, practice questions, and track progress; teachers manage the curriculum and can use AI to draft learning roadmaps.

## Features

**Student learning**
- Browse published subjects, chapters, and submodules.
- Read lesson nodes and complete quizzes and other activities.
- View optional diagrams and images attached to quiz questions.
- Render lesson math and formulas with KaTeX.
- Track lesson and chapter progress.

**Practice and rewards**
- Review questions answered incorrectly in lessons.
- Start timed, randomized Question Bank challenges by subject and submodule; recent attempt history is saved on this device.
- Complete the three-question Daily Challenge and daily quests.
- Earn XP and gems, maintain streaks, and manage hearts.
- Opt in to daily reminders to help protect a learning streak.
- Compare weekly XP on the leaderboard and manage account details in profile and settings.

**Teacher Studio**
- Create and edit subjects, chapters, submodules, and lesson nodes.
- Create text, poster, PDF/image material, quiz, boss, and treasure nodes.
- Edit quiz questions and answer keys, attach images, and preview content as a learner.
- Upload lesson materials and save curriculum changes to the database.
- Generate AI roadmap drafts, review them, and publish curriculum for students.

**AI roadmap generation**
- Gemini is the primary provider (defaults to `gemini-3.6-flash`; override with `GEMINI_ROADMAP_MODEL`).
- Text fallback uses `GROQ_ROADMAP_MODEL` (defaults to `openai/gpt-oss-120b`).
- Image fallback uses `GROQ_VISION_MODEL` (defaults to `qwen/qwen3.8-27b`).

**AI tutor**
- Lesson-aware chat per node.
- Supports lesson text, extracted PDF text, and images.
- Text model uses `GROQ_MODEL` (defaults to `openai/gpt-oss-20b`).
- Image requests use `GROQ_VISION_MODEL` (defaults to `qwen/qwen3.8-27b`).

**Profile picture moderation**
- Sightengine screens student-uploaded profile pictures for nudity and gore before they are saved to Supabase Storage.

**Authentication** (Supabase Auth)
- Email/password sign up and sign in.
- Username or email sign in.
- Protected pages redirect signed-out users to `/login`.

## Tech stack

- Next.js 16 App Router, React, and TypeScript
- Tailwind CSS 4 and Framer Motion
- Prisma ORM with PostgreSQL; Supabase Auth and Storage
- Gemini and Groq for AI features; Sightengine for profile image moderation
- `pdfjs-dist` for PDF preview and text extraction
- React Markdown and KaTeX for lesson content and math rendering

## Project structure

```
src/app/                         # Next.js App Router pages and API routes
  /teacher                       # Teacher curriculum studio
  /subject/[id]                  # Student subject page
  /chapter/[id]                  # Chapter learning path
  /chapter/[id]/node/[nodeId]    # Lesson and activity page
  /practice                      # Practice, mistake review, and Question Bank
  /api/curriculum                # Curriculum load/save API
  /api/tutor                     # AI tutor API
  /api/moderate                  # Profile-picture moderation
src/lib/                         # Shared curriculum, practice, auth, and API logic
src/components/shared/           # Reusable UI and learning components
prisma/schema.prisma             # Database schema
```

## Curriculum flow

Teachers edit curriculum in the Teacher Studio; `PUT /api/curriculum` saves it to the database, and student pages load published curriculum through `GET /api/curriculum`. Curriculum updates are broadcast to open tabs and appear on reload.
