import { useState } from 'react';
import { Bot, Send, ChevronDown, ChevronRight, Copy, Check, CheckCircle, XCircle, Clock, Sparkles } from 'lucide-react';
import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface ReasoningTrace {
  observation: string;
  hypothesis: string;
  evidence: string;
  confidence: number;
  risk: string;
  recommendation: string;
}

interface AgentRecommendation {
  resource_id: string;
  action: string;
  terraform: string | null;
  estimated_savings_gbp: number;
  tier: string;
  confidence: number;
}

interface AnalysisResult {
  id: string;
  summary: string;
  reasoning_trace: ReasoningTrace;
  recommendations: AgentRecommendation[];
  risk_score: number;
  estimated_savings_gbp: number;
  requires_approval: boolean;
  iterations: number;
  created_at: string;
}

interface AnalysisResponse {
  analysis: AnalysisResult;
  decision: { type: string; id?: string };
}

const suggestedPrompts = [
  'Why did my costs spike this month?',
  'What can be auto-fixed right now?',
  'Show me my biggest waste areas',
  'What needs my approval before we act?',
];

export default function AgentAnalysis() {
  const [query, setQuery] = useState('');
  const [accountId, setAccountId] = useState('default');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState('');
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (q?: string) => {
    const actualQuery = q || query;
    if (!actualQuery.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const resp = await api.post('/analyse', {
        account_id: accountId,
        query: actualQuery,
      });
      setResult(resp.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: string) => {
    try {
      await api.post(`/approvals/${approvalId}/approve`, { reason: 'Approved via UI' });
      setResult((prev) => prev ? { ...prev, decision: { type: 'AutoExecuted' } } : null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Approval failed');
    }
  };

  const handleReject = async (approvalId: string) => {
    try {
      await api.post(`/approvals/${approvalId}/reject`, { reason: 'Rejected via UI' });
      setResult((prev) => prev ? { ...prev, decision: { type: 'Rejected' } } : null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Rejection failed');
    }
  };

  const copyTerraform = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      auto_executable: 'bg-green-100 text-green-800',
      approval_required: 'bg-amber-100 text-amber-800',
      high_risk: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[tier] || 'bg-gray-100 text-gray-800'}`}>
        {tier.replace(/_/g, ' ')}
      </span>
    );
  };

  const decisionBadge = (decision: { type: string; id?: string }) => {
    if (decision.type === 'AutoExecuted') {
      return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium"><CheckCircle className="w-4 h-4" /> Auto-executed</span>;
    }
    if (decision.type === 'PendingApproval') {
      return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-medium"><Clock className="w-4 h-4" /> Pending Approval</span>;
    }
    if (decision.type === 'Rejected') {
      return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-medium"><XCircle className="w-4 h-4" /> Rejected</span>;
    }
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
          <Bot className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agent</h1>
          <p className="text-sm text-gray-500">Agentic cost intelligence — powered by Claude</p>
        </div>
      </div>

      {/* Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Ask about your AWS costs..."
            className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={loading}
          />
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Account ID"
            className="w-32 px-3 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !query.trim()}
            className="px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Suggested prompts */}
        <div className="flex flex-wrap gap-2 mt-3">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => { setQuery(prompt); handleSubmit(prompt); }}
              disabled={loading}
              className="px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full text-gray-600 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="font-medium text-gray-900">Analysing your infrastructure...</p>
              <p className="text-sm text-gray-500 mt-1">The AI agent is calling tools and reasoning about your costs</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Summary & Decision */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">Analysis Result</h2>
                <span className="text-xs text-gray-400">({result.analysis.iterations} iterations)</span>
              </div>
              {decisionBadge(result.decision)}
            </div>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{result.analysis.summary}</p>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">
                  £{result.analysis.estimated_savings_gbp.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">Est. savings/month</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${result.analysis.risk_score > 70 ? 'text-red-600' : result.analysis.risk_score > 40 ? 'text-amber-600' : 'text-green-600'}`}>
                  {result.analysis.risk_score}
                </p>
                <p className="text-xs text-gray-500">Risk score</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-700">
                  {(result.analysis.reasoning_trace.confidence * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500">Confidence</p>
              </div>
            </div>
          </div>

          {/* Reasoning Trace */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setReasoningOpen(!reasoningOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium text-gray-900 flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary-600" />
                AI Reasoning Trace
              </span>
              {reasoningOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {reasoningOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                {[
                  { label: 'Observation', value: result.analysis.reasoning_trace.observation, color: 'blue' },
                  { label: 'Hypothesis', value: result.analysis.reasoning_trace.hypothesis, color: 'purple' },
                  { label: 'Evidence', value: result.analysis.reasoning_trace.evidence, color: 'indigo' },
                  { label: 'Risk Assessment', value: result.analysis.reasoning_trace.risk, color: 'amber' },
                  { label: 'Recommendation', value: result.analysis.reasoning_trace.recommendation, color: 'green' },
                ].map(({ label, value, color }) => value ? (
                  <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-lg p-3`}>
                    <p className={`text-xs font-semibold text-${color}-700 mb-1`}>{label}</p>
                    <p className="text-sm text-gray-700">{value}</p>
                  </div>
                ) : null)}
              </div>
            )}
          </div>

          {/* Recommendations */}
          {result.analysis.recommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Recommendations</h3>
              <div className="space-y-3">
                {result.analysis.recommendations.map((rec, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{rec.resource_id}</span>
                        {tierBadge(rec.tier)}
                      </div>
                      <span className="text-sm font-bold text-primary-600">
                        £{rec.estimated_savings_gbp.toLocaleString('en-GB', { minimumFractionDigits: 2 })}/mo
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{rec.action}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Confidence: {(rec.confidence * 100).toFixed(0)}%</span>
                    </div>

                    {/* Terraform block */}
                    {rec.terraform && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-500">Terraform</span>
                          <button
                            onClick={() => copyTerraform(rec.terraform!)}
                            className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1"
                          >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <pre className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs overflow-x-auto font-mono">
                          {rec.terraform}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval buttons */}
          {result.decision.type === 'PendingApproval' && result.decision.id && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-amber-900">This analysis requires your approval</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Risk score is {result.analysis.risk_score} or savings exceed threshold
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(result.decision.id!)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => handleReject(result.decision.id!)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-1 transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
