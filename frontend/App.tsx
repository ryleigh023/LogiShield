import { useState } from 'react'
import { api, AnalysisResult, ShipmentRequest } from './api/client'
import RiskScore from './components/RiskScore'
import AgentTrace from './components/AgentTrace'

const DEMO_SHIPS: ShipmentRequest[] = [
  { vessel_name:'MAERSK SENTOSA', origin_port:'CNSHA', dest_port:'AEJEA',
    eta:'2024-03-15T08:00:00', cargo_type:'electronics' },
  { vessel_name:'MSC AURORA', origin_port:'DEHAM', dest_port:'SGSIN',
    eta:'2024-03-22T08:00:00', cargo_type:'machinery' },
  { vessel_name:'CMA TIARA', origin_port:'USLAX', dest_port:'JPYOK',
    eta:'2024-03-27T08:00:00', cargo_type:'automotive' },
]

const actionColor: Record<string, string> = {
  REROUTE:'border-blue-400 bg-blue-50',
  EXPEDITE:'border-yellow-400 bg-yellow-50',
  NOTIFY:'border-gray-300 bg-gray-50',
  MONITOR:'border-gray-200 bg-gray-50',
}

export default function App() {
  const [selected, setSelected] = useState<ShipmentRequest>(DEMO_SHIPS[0])
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)

  const analyze = async (ship: ShipmentRequest) => {
    setSelected(ship); setLoading(true); setResult(null)
    try { setResult(await api.analyze(ship)) }
    catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-3 h-3 rounded-full bg-red-500"/>
          <h1 className="text-xl font-medium">FreightSentinel</h1>
          <span className="ml-auto text-sm text-gray-500">14 shipments tracked</span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {DEMO_SHIPS.map(s => (
            <button key={s.vessel_name} onClick={() => analyze(s)}
              className={`text-left p-4 rounded-xl border bg-white hover:border-blue-300 transition-all ${selected.vessel_name===s.vessel_name ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}>
              <div className="font-medium text-sm">{s.vessel_name}</div>
              <div className="text-xs text-gray-500 mt-1">{s.origin_port} → {s.dest_port}</div>
              <div className="text-xs text-gray-400">{s.cargo_type}</div>
            </button>
          ))}
        </div>

        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            Agent analyzing... collecting signals from weather, port, news, and history tools
          </div>
        )}

        {result && !loading && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Risk assessment</div>
              <RiskScore score={result.risk_score} prob={result.delay_probability}/>
              <div className="mt-4 space-y-2">
                {result.shap_factors.map(f => (
                  <div key={f.factor} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-28 truncate capitalize">{f.factor.replace('_',' ')}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full rounded-full bg-blue-500" style={{width: `${f.contribution}%`}}/>
                    </div>
                    <span className="text-xs font-medium w-8 text-right">+{f.contribution}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Agent reasoning</div>
                <AgentTrace trace={result.agent_trace}/>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Recommendations</div>
                {result.recommendations.slice(0,3).map(r => (
                  <div key={r.action} className={`border-l-2 p-3 rounded mb-2 ${actionColor[r.action]}`}>
                    <div className="text-xs font-semibold">{r.action} — {r.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{r.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
            Click a vessel above to run risk analysis
          </div>
        )}
      </div>
    </div>
  )
}
