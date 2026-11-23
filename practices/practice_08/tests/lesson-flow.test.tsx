import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '@/App'

async function checkChoice(user: ReturnType<typeof userEvent.setup>, option: string) {
  await user.click(screen.getByRole('button', { name: option }))
  await user.click(screen.getByRole('button', { name: 'Проверить' }))
  await user.click(screen.getByRole('button', { name: 'Продолжить →' }))
}
async function checkInput(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.type(screen.getByRole('textbox', { name: 'Перевод на русский язык' }), value)
  await user.click(screen.getByRole('button', { name: 'Проверить' }))
  await user.click(screen.getByRole('button', { name: 'Продолжить →' }))
}
async function finishAndReturn(user: ReturnType<typeof userEvent.setup>) {
  expect(await screen.findByRole('heading', { name: 'Урок завершён!' })).toBeInTheDocument()
  await waitFor(() => expect(screen.getByText('✓ Прогресс сохранён')).toBeInTheDocument())
  await user.click(screen.getByRole('button', { name: 'Вернуться к курсу' }))
}

describe('уроки и прогресс', () => {
  it('проходит три урока, сохраняет третий и не закрывает его после повторения', async () => {
    const user = userEvent.setup()
    const view = render(<App />)
    await screen.findByRole('heading', { name: 'Мой курс' })
    expect(screen.getByText('Пройдено 0 из 3 уроков')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Начать урок' }))
    await user.click(screen.getByRole('button', { name: 'Следующее слово' }))
    await user.click(screen.getByRole('button', { name: 'К правилу' }))
    expect(screen.getByRole('heading', { name: 'Множественное число' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Теперь попробуем →' }))
    await checkChoice(user, 'книга')
    await checkInput(user, 'тетрадь')
    await checkChoice(user, 'китаплар')
    await finishAndReturn(user)
    expect(screen.getByText('Пройдено 1 из 3 уроков')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Начать урок' }))
    await user.click(screen.getByRole('button', { name: 'К упражнениям' }))
    await checkChoice(user, 'школа')
    await checkInput(user, 'школа')
    await finishAndReturn(user)
    expect(screen.getByText('Пройдено 2 из 3 уроков')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Начать урок' }))
    await user.click(screen.getByRole('button', { name: 'Следующее слово' }))
    await user.click(screen.getByRole('button', { name: 'К упражнениям' }))
    await checkChoice(user, 'здравствуй')
    await checkInput(user, 'до свидания')
    await finishAndReturn(user)
    expect(screen.getByText('Пройдено 3 из 3 уроков')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Пройти ещё раз' })).toHaveLength(3)

    await user.click(within(screen.getByRole('navigation', { name: 'Главная навигация' })).getByRole('button', { name: 'Повторить' }))
    expect(screen.getByRole('heading', { name: 'На сегодня всё повторено' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Потренироваться' }))
    await checkChoice(user, 'книга')
    await checkInput(user, 'тетрадь')
    await checkChoice(user, 'китаплар')
    await checkInput(user, 'школа')
    await checkChoice(user, 'здравствуй')
    await checkInput(user, 'до свидания')
    expect(await screen.findByRole('heading', { name: 'Повторение завершено!' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('✓ Прогресс сохранён')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Вернуться к курсу' }))
    expect(screen.getByText('Пройдено 3 из 3 уроков')).toBeInTheDocument()

    view.unmount()
    render(<App />)
    expect(await screen.findByText('Пройдено 3 из 3 уроков')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Пройти ещё раз' })).toHaveLength(3)
  })
})
