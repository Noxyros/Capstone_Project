# Security Review Summary

## Scope

This follow-up addresses the two MEDIUM findings from the static review of the
Question Bank and Daily Challenge learner APIs. RLS was explicitly deferred
and is not covered here. No authenticated live-endpoint or deployed-database
testing was performed.

## Findings

| # | Severity | Finding | Status and resolution |
|---|----------|---------|-----------------------|
| 1 | 🟡 MEDIUM | Question Bank submissions were not bound to a challenge returned by the server. Empty or fabricated submissions could reveal correct option IDs and claim fixed rewards. | Fixed. The server now records the user, submodule, question set, expiry, and completion state for each attempt. Submissions must match that set and can be accepted only once. Unanswered questions do not reveal their correct options and do not earn rewards. Existing fixed rewards remain participation rewards for fully answered challenges; correctness is not a reward requirement. |
| 2 | 🟡 MEDIUM | Learner queries did not consistently require the subject and other ancestors to be published, allowing access to unpublished curriculum content. | Fixed. Bank listing, chapter/submodule navigation, challenge GET/POST, and Daily Challenge source/fallback queries now check publication through the relevant ancestors. |

## Validation and deployment

- `npx prisma validate` passed.
- `git diff --check` passed.
- TypeScript verification is pending: Prisma Client generation was blocked by
  `EPERM` while replacing
  `node_modules/.prisma/client/query_engine-windows.dll.node` in the sandbox.
- Apply the new
  `prisma/migrations/20261114150000_add_practice_bank_attempts/migration.sql`
  migration before deploying the Question Bank attempt changes.
- This was a static code review and fix; it does not certify the deployed
  database, runtime configuration, or RLS policies.
