interface TraceStep { type: string; content: string; timestamp: string }
const typeColor: Record<string, string> = {
  THOUGHT: 'text-blue-600', ACTION: 'text-yellow-600',
  OBSERVATION: 'text-green-600', FINAL: 'text-purple-600'
}
export default function AgentTrace({ trace }: { trace: TraceStep[] }) {
  return (
    <div className="font-mono text-xs bg-gray-50 rounded-lg p-3 max-h-52 overflow-y-auto space-y-1">
      {trace.map((step, i) => (
        <div key={i} className="flex gap-2 border-b border-gray-100 pb-1">
          <span className={`font-semibold min-w-[80px] ${typeColor[step.type] || ''}`}>
            {step.type}
          </span>
          <span className="text-gray-700">{step.content}</span>
        </div>
      ))}
    </div>
  )
}
