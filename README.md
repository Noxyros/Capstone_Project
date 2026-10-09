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

## Authentication and teacher approval

Email/password authentication uses Supabase Auth. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` using the project's URL and publishable key from the Supabase dashboard. Never use `SUPABASE_SERVICE_ROLE_KEY` in browser code. In Supabase Auth settings, allow the local callback `http://localhost:3000/auth/callback` and the deployed site's matching `/auth/callback` URL. Restart Next.js after changing environment variables.

Learning pages and APIs require a valid Supabase session. Signed-out visitors are redirected to `/login`, and after sign-in are returned to the originally requested same-site path. Visiting `/login` while already signed in returns to the learning app. Sign-up creates an account; when email confirmation is enabled, the learner must confirm by email before signing in.

New accounts start with the `STUDENT` role. Teacher pages and curriculum APIs check the role in the app database on the server. To approve the first teacher, have the teacher sign up, confirm their email, and sign in once so their app profile is created. Then, as the project owner, run this in the Supabase SQL Editor, replacing the email with the verified account:

```sql
UPDATE public."User"
SET "role" = 'TEACHER'::"Role"
WHERE email = lower('teacher@example.com');
```

Verify that exactly one row was updated. Do not expose role assignment as a sign-up option; an admin-only screen can replace this manual approval step.