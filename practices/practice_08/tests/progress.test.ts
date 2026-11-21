import { describe, expect, it } from 'vitest'
import { applyResult, dueCount, emptyProgress, selectReviewIds } from '@/storage/progress'
import type { SessionResult } from '@/domain/types'

const day = 24 * 60 * 60 * 1000
const now = 1_800_000_000_000
const lessonResult: SessionResult = { id: 'lesson-1', kind: 'lesson', lessonId: 'books', answers: [
  { questionId: 'book-choice', itemId: 'book', given: 'книга', correct: true, correctAnswer: 'книга' },
  { questionId: 'notebook-input', itemId: 'notebook', given: 'книга', correct: false, correctAnswer: 'тетрадь' },
  { questionId: 'plural-choice', itemId: 'plural', given: 'китаплар', correct: true, correctAnswer: 'китаплар' },
] }

describe('сохранённый прогресс', () => {
  it('добавляет материал без дубликатов и ставит ошибку на повторение сразу', () => {
    const first = applyResult(emptyProgress(), lessonResult, now)
    expect(first.completedLessonIds).toEqual(['books'])
    expect(dueCount(first, now)).toBe(1)
    expect(selectReviewIds(first, now)).toEqual(['notebook'])
    expect(first.review.book.dueAt).toBe(now + day)
    expect(applyResult(first, lessonResult, now)).toBe(first)
    const replay = applyResult(first, { ...lessonResult, id: 'lesson-replay' }, now + day)
    expect(replay.completedLessonIds).toEqual(['books'])
    expect(Object.keys(replay.review)).toHaveLength(3)
  })

  it('повторение не меняет список пройденных уроков', () => {
    const first = applyResult(emptyProgress(), lessonResult, now)
    const review = applyResult(first, { id: 'review-1', kind: 'review', answers: [
      { questionId: 'review-notebook', itemId: 'notebook', given: 'тетрадь', correct: true, correctAnswer: 'тетрадь' },
    ] }, now)
    expect(review.completedLessonIds).toEqual(['books'])
    expect(review.review.notebook.dueAt).toBe(now + day)
  })
})
