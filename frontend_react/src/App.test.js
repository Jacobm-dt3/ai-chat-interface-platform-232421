import { render, screen } from '@testing-library/react';
import App from './App';

test('renders sessions sidebar header', () => {
  render(<App />);
  expect(screen.getByText(/Sessions/i)).toBeInTheDocument();
});
