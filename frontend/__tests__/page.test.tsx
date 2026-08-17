import { render, screen } from '@testing-library/react'
import Page from '../app/page'
import { AuthProvider } from '../lib/auth-context'

describe('Home page', () => {
  it('renders the landing heading', () => {
    render(
      <AuthProvider>
        <Page />
      </AuthProvider>,
    )
    expect(screen.getByRole('heading', { name: 'BigEstate' })).toBeInTheDocument()
  })
})