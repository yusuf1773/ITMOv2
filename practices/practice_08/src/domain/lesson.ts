import type { Answer, Question } from './types'

export const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru')

export function validateAnswer(question: Question, value: string): string | null {
  if (!value.trim()) return question.type === 'input' ? 'Введите перевод, чтобы проверить ответ.' : 'Выберите вариант ответа.'
  if (question.type === 'input' && Array.from(value).length > 100) return 'Сократите перевод до 100 символов.'
  return null
}

export function checkAnswer(question: Question, value: string): Answer {
  return { questionId: question.id, itemId: question.itemId, given: value.trim(), correct: question.accepted.some(accepted => normalize(accepted) === normalize(value)), correctAnswer: question.accepted[0] }
}
