import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  ArcElement,
  Legend,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  ArcElement,
  Legend
)

/* ------------------------------------------------------------------ */
/*  Sparkline — línea fina con relleno degradado y glow               */
/* ------------------------------------------------------------------ */
export function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = {
    labels: data.map((_, i) => i.toString()),
    datasets: [
      {
        data,
        borderColor: color,
        backgroundColor: (ctx: any) => {
          const { chart } = ctx
          const { ctx: c, chartArea } = chart
          if (!chartArea) return `${color}18`
          const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          gradient.addColorStop(0, `${color}40`)
          gradient.addColorStop(1, `${color}00`)
          return gradient
        },
        borderWidth: 1.6,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: true,
        tension: 0.42,
      },
    ],
  }

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false, grid: { display: false } },
      y: { display: false, grid: { display: false }, grace: '25%' },
    },
    elements: { line: { borderCapStyle: 'round' } },
  }

  return (
    <div
      className="w-full h-full"
      style={{ filter: `drop-shadow(0 0 4px ${color}55)` }}
    >
      <Line options={options} data={chartData as any} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Dona — anillo grueso tipo HUD                                     */
/* ------------------------------------------------------------------ */
export function DonutChart({
  data,
  labels,
  colors,
}: {
  data: number[]
  labels: string[]
  colors: string[]
}) {
  const total = data.reduce((a, b) => a + b, 0)

  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors,
        hoverBackgroundColor: colors,
        borderColor: 'rgba(10, 20, 30, 0.9)',
        borderWidth: 1.5,
        borderRadius: 5,
        spacing: 2,
        cutout: '72%',
      },
    ],
  }

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutoutPercentage: 70,
    animation: { duration: 500 },
    layout: { padding: 2 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const value = ctx.parsed
            const pct = total > 0 ? Math.round((value / total) * 100) : 0
            return ` ${ctx.label}: ${value} (${pct}%)`
          },
        },
        backgroundColor: 'rgba(10, 20, 30, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.25)',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        padding: 8,
        cornerRadius: 8,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
      },
    },
  }

  return (
    <div className="w-full h-full">
      <Doughnut options={options} data={chartData as any} />
    </div>
  )
}
