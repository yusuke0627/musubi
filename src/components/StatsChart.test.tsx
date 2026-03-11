import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatsChart from './StatsChart';

// Chart.js は複雑なのでモック化する
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-line-chart" />
}));

describe('StatsChart', () => {
  it('renders the chart container', () => {
    const mockData = [
      { date: '2026-03-11', impressions: 100, clicks: 5 }
    ];
    
    render(<StatsChart data={mockData} />);
    
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
  });
});
