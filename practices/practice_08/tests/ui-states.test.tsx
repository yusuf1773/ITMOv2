import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import App from '@/App'

it('показывает пустое повторение до первого урока', async () => {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('heading', { name: 'Мой курс' })
  await user.click(within(screen.getByRole('navigation', { name: 'Главная навигация' })).getByRole('button', { name: 'Повторить' }))
  expect(screen.getByRole('heading', { name: 'Пока нечего повторять' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'К курсу' }))
  expect(screen.getByText('Пройдено 0 из 3 уроков')).toBeInTheDocument()
})

it('показывает ошибку чтения прогресса и восстанавливается после повторной попытки', async () => {
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('storage unavailable') })
  const user = userEvent.setup()
  render(<App />)
  expect(await screen.findByRole('heading', { name: 'Не удалось загрузить прогресс' })).toBeInTheDocument()
  read.mockRestore()
  await user.click(screen.getByRole('button', { name: 'Попробовать снова' }))
  expect(await screen.findByRole('heading', { name: 'Мой курс' })).toBeInTheDocument()
})
