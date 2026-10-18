import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  ArcElement,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, ArcElement)

export function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = {
    labels: data.map((_, i) => i.toString()),
    datasets: [
      {
        data,
        borderColor: 'rgba(255, 255, 255, 0.45)',
        backgroundColor: color + '30',
        borderWidth: 1.5,
        pointRadius: 0,
        fill: true,
        tension: 0.4,
      },
    ],
  }

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugin: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false, grid: { display: false } },
      y: { display: false, grid: { display: false } },
    },
    animation: { duration: 0 },
    parsed: false,
  }

  return (
    <div className="w-full h-5 opacity-50">
      <Line options={options} data={chartData} />
    </div>
  )
}

export function DonutChart({
  data,
  labels,
  colors,
}: {
  data: number[]
  labels: string[]
  colors: string[]
}) {
  const chartData = {
    labels,
    datasets: [
      {
        data: data,
        backgroundColor: colors,
        borderColor: 'rgba(9, 13, 21, 0.82)',
        borderWidth: 2,
        cutout: '65%',
      },
    ],
  }

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugin: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#667287',
          font: { size: 10 },
          padding: 12,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${ctx.parsed} eventos`,
        },
        backgroundColor: 'rgba(9, 13, 21, 0.9)',
          borderColor: 'rgba(255, 255, 255, 0.06)',
          titleColor: '#e9eef8',
          bodyColor: '#8b97aa',
        padding: 8,
        cornerRadius: 8,
        displayColors: false,
      },
    },
    animation: { duration: 0 },
  }

  return (
    <div className="w-full h-40">
      <Doughnut options={options} data={chartData} />
    </div>
  )
}
