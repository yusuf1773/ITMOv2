import { lessons } from '@/data/lessons'
import type { Progress, SessionResult, ReviewState } from '@/domain/types'

const key = 'tatarcha-progress-v1'
const day = 24 * 60 * 60 * 1000
const intervals = [0, 1, 3, 7, 14, 30]
export const emptyProgress = (): Progress => ({ version: 1, completedLessonIds: [], review: {}, appliedSessionIds: [] })

export function loadProgress(): Progress {
  const raw = window.localStorage.getItem(key)
  if (!raw) return emptyProgress()
  const data = JSON.parse(raw) as Partial<Progress>
  if (data.version !== 1 || !Array.isArray(data.completedLessonIds) || !data.review || !Array.isArray(data.appliedSessionIds)) throw new Error('Некорректные данные прогресса')
  return data as Progress
}

export function dueCount(progress: Progress, now = Date.now()): number {
  return Object.values(progress.review).filter(item => item.dueAt <= now).length
}

export function selectReviewIds(progress: Progress, now = Date.now()): string[] {
  return Object.entries(progress.review).filter(([, state]) => state.dueAt <= now).sort((a, b) => a[1].dueAt - b[1].dueAt || b[1].mistakes - a[1].mistakes).slice(0, 10).map(([id]) => id)
}

export function selectFreeIds(progress: Progress): string[] {
  return Object.keys(progress.review).slice(0, 10)
}

function nextReviewState(previous: ReviewState, wrong: boolean, free: boolean, now: number): ReviewState {
  if (wrong) return { dueAt: free ? Math.min(previous.dueAt, now + day) : now + day, intervalIndex: 1, mistakes: previous.mistakes + 1 }
  if (free) return previous
  const intervalIndex = Math.min(previous.intervalIndex + 1, intervals.length - 1)
  return { ...previous, intervalIndex, dueAt: now + intervals[intervalIndex] * day }
}

export function applyResult(progress: Progress, result: SessionResult, now = Date.now()): Progress {
  if (progress.appliedSessionIds.includes(result.id)) return progress
  const next: Progress = { version: 1, completedLessonIds: [...progress.completedLessonIds], review: { ...progress.review }, appliedSessionIds: [...progress.appliedSessionIds, result.id] }
  if (result.kind === 'lesson') {
    const lesson = lessons.find(item => item.id === result.lessonId)
    if (!lesson) throw new Error('Урок не найден')
    if (!next.completedLessonIds.includes(lesson.id)) next.completedLessonIds.push(lesson.id)
    const itemIds = [...lesson.words.map(word => word.id), ...(lesson.rule ? [lesson.rule.id] : [])]
    for (const id of itemIds) {
      if (next.review[id]) continue
      const wrong = result.answers.some(answer => answer.itemId === id && !answer.correct)
      next.review[id] = { dueAt: wrong ? now : now + day, intervalIndex: wrong ? 0 : 1, mistakes: wrong ? 1 : 0 }
    }
  } else {
    const itemIds = [...new Set(result.answers.map(answer => answer.itemId))]
    for (const id of itemIds) {
      const previous = next.review[id]
      if (!previous) continue
      const wrong = result.answers.some(answer => answer.itemId === id && !answer.correct)
      next.review[id] = nextReviewState(previous, wrong, result.kind === 'free', now)
    }
  }
  return next
}

export async function saveResult(result: SessionResult): Promise<Progress> {
  const current = loadProgress()
  const next = applyResult(current, result)
  window.localStorage.setItem(key, JSON.stringify(next))
  return next
}
