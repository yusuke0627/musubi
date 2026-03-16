"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface StatsChartProps {
  data: {
    date: string;
    impressions: number;
    clicks: number;
    earnings?: number;
  }[];
}

export default function StatsChart({ data }: StatsChartProps) {
  const hasEarnings = data.some(d => d.earnings !== undefined && d.earnings > 0);

  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Impressions',
        data: data.map(d => d.impressions),
        borderColor: '#2980b9',
        backgroundColor: 'rgba(41, 128, 185, 0.1)',
        fill: true,
        yAxisID: 'y',
      },
      {
        label: 'Clicks',
        data: data.map(d => d.clicks),
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        fill: true,
        yAxisID: 'y',
      },
      ...(hasEarnings ? [{
        label: 'Earnings (¥)',
        data: data.map(d => d.earnings || 0),
        borderColor: '#27ae60',
        backgroundColor: 'rgba(39, 174, 96, 0.1)',
        fill: true,
        yAxisID: 'y1',
      }] : [])
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear' as const,
        beginAtZero: true,
        display: true,
        position: 'left' as const,
        title: { display: true, text: 'Count' },
        grid: { drawOnChartArea: true }
      },
      ...(hasEarnings ? {
        y1: {
          type: 'linear' as const,
          beginAtZero: true,
          display: true,
          position: 'right' as const,
          title: { display: true, text: 'Earnings (¥)' },
          grid: { drawOnChartArea: false } // Only show grid for left axis
        }
      } : {})
    },
  };

  return (
    <div className="h-64 w-full">
      <Line data={chartData} options={options} />
    </div>
  );
}
