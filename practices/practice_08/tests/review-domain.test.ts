import { expect, it } from 'vitest'
import { applyResult, selectReviewIds } from '@/storage/progress'
import type { Progress, SessionResult } from '@/domain/types'

const day = 24 * 60 * 60 * 1000
const now = 1_800_000_000_000

it('сортирует наступившие задания по сроку, затем по числу ошибок и ограничивает сессию десятью', () => {
  const progress: Progress = { version: 1, completedLessonIds: ['books'], appliedSessionIds: [], review: {} }
  for (let index = 0; index < 12; index++) progress.review[`item-${index}`] = { dueAt: now - day, intervalIndex: 1, mistakes: index }
  progress.review.earliest = { dueAt: now - 2 * day, intervalIndex: 1, mistakes: 0 }
  progress.review.future = { dueAt: now + day, intervalIndex: 1, mistakes: 100 }
  const selected = selectReviewIds(progress, now)
  expect(selected).toHaveLength(10)
  expect(selected[0]).toBe('earliest')
  expect(selected[1]).toBe('item-11')
  expect(selected).not.toContain('future')
})

it('свободная правильная тренировка не переносит срок; ошибка назначает более раннее повторение', () => {
  const progress: Progress = { version: 1, completedLessonIds: ['books'], appliedSessionIds: [], review: { book: { dueAt: now + 7 * day, intervalIndex: 3, mistakes: 0 } } }
  const correct: SessionResult = { id: 'free-1', kind: 'free', answers: [{ questionId: 'review-book', itemId: 'book', given: 'книга', correct: true, correctAnswer: 'книга' }] }
  const afterCorrect = applyResult(progress, correct, now)
  expect(afterCorrect.review.book.dueAt).toBe(now + 7 * day)
  const wrong: SessionResult = { id: 'free-2', kind: 'free', answers: [{ questionId: 'review-book', itemId: 'book', given: 'школа', correct: false, correctAnswer: 'книга' }] }
  const afterWrong = applyResult(afterCorrect, wrong, now)
  expect(afterWrong.review.book.dueAt).toBe(now + day)
  expect(afterWrong.completedLessonIds).toEqual(['books'])
})
