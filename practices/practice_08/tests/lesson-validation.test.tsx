import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import App from '@/App'

it('не принимает пустой и длинный перевод и блокирует ответ после проверки', async () => {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('heading', { name: 'Мой курс' })
  await user.click(screen.getByRole('button', { name: 'Начать урок' }))
  await user.click(screen.getByRole('button', { name: 'Следующее слово' }))
  await user.click(screen.getByRole('button', { name: 'К правилу' }))
  await user.click(screen.getByRole('button', { name: 'Теперь попробуем →' }))
  await user.click(screen.getByRole('button', { name: 'Проверить' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Выберите вариант ответа.')
  await user.click(screen.getByRole('button', { name: 'книга' }))
  await user.click(screen.getByRole('button', { name: 'Проверить' }))
  expect(screen.getByRole('button', { name: 'книга' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Продолжить →' }))
  const input = screen.getByRole('textbox', { name: 'Перевод на русский язык' })
  await user.click(screen.getByRole('button', { name: 'Проверить' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Введите перевод')
  await user.type(input, 'а'.repeat(101))
  await user.click(screen.getByRole('button', { name: 'Проверить' }))
  expect(screen.getByRole('alert')).toHaveTextContent('100 символов')
  await user.clear(input)
  await user.type(input, '  ТЕТРАДЬ  ')
  await user.keyboard('{Enter}')
  expect(within(screen.getByRole('status')).getByText('Верно!')).toBeInTheDocument()
  expect(input).toBeDisabled()
})
