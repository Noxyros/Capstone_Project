# Capstone_Project

A curriculum and roadmap learning platform with a teacher content studio and student-facing learning pages.

## Features

**Teacher Studio** (`/teacher`)
- Create and edit subjects, chapters, submodules, and lesson nodes.
- Lesson types: text, poster, material (PDF/image), quiz, boss, treasure.
- Edit quiz questions and answer keys.
- Save changes to persist curriculum to the database.

**Student pages**
- Browse subjects and chapters (`/subject/[id]`, `/chapter/[id]`).
- Read lesson nodes and take quizzes (`/chapter/[id]/node/[nodeId]`).
- Track per-node and chapter progress.

**AI tutor** (`/api/tutor`)
- Lesson-aware chat per node.
- Supports lesson text, extracted PDF text, and images.
- Image support requires `GROQ_VISION_MODEL` in `.env.local`.

**Authentication** (Supabase Auth)
- Email/password sign up and sign in.
- Username or email sign in.
- Protected pages redirect signed-out users to `/login`.

## Tech stack

- Next.js 16 (App Router)
- Prisma ORM + PostgreSQL (Supabase)
- Tailwind CSS
- `pdfjs-dist` (PDF preview and text extraction)
- Groq (AI tutor)

## Project structure

```
src/app/               # Next.js App Router pages and API routes
  /teacher             # Teacher curriculum studio
  /chapter/[id]        # Student chapter page
  /chapter/[id]/node/[nodeId]  # Student node/activity page
  /subject/[id]        # Student subject page
  /api/curriculum      # Curriculum save/load API
  /api/tutor           # AI tutor streaming API
src/lib/               # Shared logic (curriculum client, tutor context, auth)
src/components/shared/ # Reusable components (roadmap, tutor chat, PDF preview)
prisma/schema.prisma   # Database schema
.env.local             # Environment variables (create this yourself)
```

## Curriculum flow

Teacher edits in `/teacher` → `PUT /api/curriculum` persists to the database → student pages load from `GET /api/curriculum`. Teacher edits broadcast to open tabs and appear on reload, so students see the latest saved content.
