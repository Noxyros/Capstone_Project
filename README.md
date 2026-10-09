# Capstone_Project

## AI roadmap generation

The Teacher Studio uses a separate Google Gemini API key for generating curriculum drafts. Add a newly created key to the ignored `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Restart the Next.js development server after adding or changing the key. The roadmap generator defaults to `gemini-3.5-flash`; set `GEMINI_ROADMAP_MODEL` in `.env.local` if you need to choose another model available to your account. The existing Groq key and tutor model are independent and are not used for roadmap generation. Local development requests are not rate-limited; the prototype's in-memory limit applies in production only.

Teachers select a subject and grade, then provide text, a `.txt` file, PDF, or supported image. The server sends that material to Google Gemini to produce a chapter title, summary, lesson nodes, quiz questions, and answer keys in Indonesian. Generated content is only a draft: it is not added to the curriculum until the teacher accepts it, and it is not persisted until **Save changes** is selected. Uploaded and pasted material is transmitted to Google for processing; do not include private student information or material you do not have permission to share.

Google's data handling terms depend on the API plan. Content submitted on the Gemini API free tier may be used to improve Google products; review the current [Gemini API terms](https://ai.google.dev/gemini-api/terms) before uploading confidential material.

Uploads are limited to 12 MB. The API applies a small in-memory per-IP request limit; this is suitable for the prototype but is not a substitute for authenticated, distributed abuse protection before public deployment.

## Database and curriculum

Prisma uses one curriculum hierarchy: `Grade` → `Subject` → `Chapter` → `RoadmapNode` → `Question` → `Option`. A subject may be owned by a teacher account through `User.role` and `Subject.createdById`. The `SubjectEnrollment` model exists, but the current learner feed includes all published subjects rather than applying enrollment filtering. Learner completion is stored separately from shared curriculum in `NodeProgress` and `UserProgress`.

Apply checked-in schema changes with `npx prisma migrate deploy`. Do not run `prisma/seed.ts` against a database containing data you need: it clears and recreates prototype records. The seed now refuses to run unless `ALLOW_DESTRUCTIVE_SEED=true` is set explicitly; only use it with a disposable development database.

The Teacher Studio reads and saves curriculum through `/api/curriculum`; writes require a `TEACHER` or `ADMIN` profile and teachers can edit only subjects they own. Saving replaces that teacher's submitted subject collection, so removing a saved subject in the editor deletes it and its dependent curriculum. Learner pages read published curriculum through the same API. Completing an activity writes per-node progress and marks a chapter complete when all its published nodes are complete. The current database is not automatically seeded with additional subjects; choose and review the Indonesian curriculum content before adding bulk sample data.

### Learner economy and progress

Learner game state is stored on the app profile. The additive migration `20261010000000_persist_learner_economy` adds gem balances, Super Mode, idempotent reward records, server-validated quiz attempts/answers, and Jakarta-dated activity records. Review the SQL and take a database backup before applying migrations to a database with data. The migration has not been applied automatically.

First-time activity completion grants **20 XP and 20 gems**; a perfect quiz grants **10 additional XP**. Replaying a completed activity does not grant those rewards again. An active Double XP boost doubles activity XP, not gems. Current shop prices are **250 gems** for a Heart Refill, **100 gems** for 15 minutes of Double XP, and **200 gems** for a Streak Freeze (maximum two held). The optional heart trade grants seven minutes of Double XP for four hearts and cannot reduce hearts below one.

Wrong quiz answers remove one heart unless Super Mode is active. When at zero hearts, learners can turn on Super Mode to continue without losing hearts; they may also refill hearts instead. Streak activity days and leaderboard weeks use `Asia/Jakarta`, with the week resetting Monday at midnight. A Streak Freeze protects one missed day when the learner returns after exactly one inactive day.

The weekly leaderboard ranks student accounts by XP events earned since the current Jakarta Monday. Daily quiz/quest widgets are still prototype UI and do not currently award persisted rewards.

## Authentication and teacher approval

Email/password authentication uses Supabase Auth. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` using the project's URL and publishable key from the Supabase dashboard. Never use `SUPABASE_SERVICE_ROLE_KEY` in browser code. In Supabase Auth settings, allow the local callback `http://localhost:3000/auth/callback` and the deployed site's matching `/auth/callback` URL. Restart Next.js after changing environment variables.

### GitHub Codespaces

The checked-in dev container uses Node.js 22, runs `npm ci`, generates Prisma Client, and forwards port 3000. Add the project's secrets as Codespaces secrets before starting the app. Required for sign-in and data-backed features: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, and `DIRECT_URL`. For avatar uploads and moderation, also configure `SUPABASE_SERVICE_ROLE_KEY`, `SIGHTENGINE_API_USER`, and `SIGHTENGINE_API_SECRET`. The tutor and AI roadmap require `GROQ_API_KEY` and `GEMINI_API_KEY`, respectively. Keep these values in Codespaces secrets or an ignored local `.env.local`; never commit them. Start the app in the Codespaces terminal with `npm run dev`, then open the forwarded port 3000.

Learning pages and protected APIs require a valid Supabase session. Signed-out visitors are redirected to `/login`, and after sign-in are returned to the originally requested same-site path. Visiting `/login` while already signed in returns to the learning app. Sign-up collects email, username, and password. The email remains the Supabase identity and recovery address; learners can sign in using their username or email. Username sign-in resolves the handle server-side and only returns a Supabase session after the password succeeds. Usernames must be 3–24 lowercase letters, digits, or underscores.

For a local capstone demo, email confirmation may be disabled in Supabase Auth to avoid its built-in low-volume email sender. Keep this setting limited to the demo: without confirmation, Supabase does not verify that a student owns the email address, weakening account recovery and identity checks. Custom SMTP is required for reliable confirmation and recovery emails at broader usage.

The profile page uses the authenticated app profile and saves display name, username, and avatar URL through `/api/auth/profile`. Custom avatar uploads require a signed-in account and are moderated by Sightengine before storage; uploads are limited to JPEG, PNG, or WebP files up to 5 MB. The student avatar policy rejects nudity, exposed male chests, underwear, and swimwear classifications, as well as suggestive content. Moderation failures do not fall through to upload.

New accounts start with the `STUDENT` role. Teacher pages and curriculum APIs check the role in the app database on the server. To approve the first teacher, have the teacher sign up and sign in once so their app profile is created. Then, as the project owner, run this in the Supabase SQL Editor, replacing the email with the teacher's account:

```sql
UPDATE public."User"
SET "role" = 'TEACHER'::"Role"
WHERE email = lower('teacher@example.com');
```

Verify that exactly one row was updated. Do not expose role assignment as a sign-up option; an admin-only screen can replace this manual approval step.