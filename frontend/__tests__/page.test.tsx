import { render, screen } from '@testing-library/react'
import Page from '../app/page'

describe('Home page', () => {
  it('renders the page heading', () => {
    render(<Page />)
    expect(
      screen.getByRole('heading', { name: /to get started/i }),
    ).toBeInTheDocument()
  })
})