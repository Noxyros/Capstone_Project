import assert from 'node:assert/strict'
import { test } from 'node:test'
import { settleStreakForMissedDays } from '@/src/lib/gameEconomy'

test('a freeze is spent for each fully missed day', () => {
  assert.deepEqual(
    settleStreakForMissedDays(4, '2026-11-15', '2026-11-17', 2),
    { streak: 4, lastActivityDate: '2026-11-16', freezesToConsume: 1 },
  )
  assert.deepEqual(
    settleStreakForMissedDays(4, '2026-11-15', '2026-11-18', 2),
    { streak: 4, lastActivityDate: '2026-11-17', freezesToConsume: 2 },
  )
})

test('the streak resets when missed days exceed the available freezes', () => {
  assert.deepEqual(
    settleStreakForMissedDays(4, '2026-11-15', '2026-11-18', 1),
    { streak: 0, lastActivityDate: '2026-11-16', freezesToConsume: 1 },
  )
})

test('the current day is not charged before it has passed', () => {
  assert.deepEqual(
    settleStreakForMissedDays(4, '2026-11-15', '2026-11-16', 2),
    { streak: 4, lastActivityDate: '2026-11-15', freezesToConsume: 0 },
  )
})
