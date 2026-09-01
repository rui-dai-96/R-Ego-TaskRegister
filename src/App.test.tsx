import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import App from './App'
import { AuthProvider } from './features/auth/AuthProvider'

describe('application shell', () => {
  it('opens the protected demo workspace when backend variables are absent', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <AuthProvider><App /></AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '候选任务列表' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /任务审核\s*3/ })).toBeInTheDocument()
  })
})
