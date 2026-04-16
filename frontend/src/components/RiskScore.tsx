interface Props { score: number; prob: number }

const label = (s: number) =>
  s >= 85 ? 'CRITICAL' : s >= 70 ? 'HIGH' : s >= 45 ? 'MEDIUM' : 'LOW'
const color = (s: number) =>
  s >= 85 ? '#E24B4A' : s >= 70 ? '#EF9F27' : s >= 45 ? '#378ADD' : '#639922'

export default function RiskScore({ score, prob }: Props) {
  const c = color(score)
  const circ = 2 * Math.PI * 32
  const dash = (score / 100) * circ
  return (
    <div className="flex items-center gap-4">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="32" fill="none" stroke="#e5e7eb" strokeWidth="7"/>
        <circle cx="40" cy="40" r="32" fill="none" stroke={c} strokeWidth="7"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ * 0.25} strokeLinecap="round"/>
        <text x="40" y="37" textAnchor="middle" fontSize="18" fontWeight="500" fill={c}>{score}</text>
        <text x="40" y="52" textAnchor="middle" fontSize="10" fill="#6b7280">{label(score)}</text>
      </svg>
      <div>
        <div className="text-2xl font-medium">{Math.round(prob * 100)}%</div>
        <div className="text-sm text-gray-500">delay probability</div>
      </div>
    </div>
  )
}
