import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('shows the product name and purpose', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Taler' })).toBeInTheDocument();
    expect(screen.getByText('Трекер личных финансов')).toBeInTheDocument();
  });
});
