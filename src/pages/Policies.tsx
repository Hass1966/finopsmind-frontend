import { useState, useEffect, type FormEvent } from 'react';
import { Shield, Plus, AlertTriangle, X, ChevronDown } from 'lucide-react';
import { getPolicies, createPolicy, getPolicyViolations, getPolicySummary } from '../lib/api';
import type { Policy, PolicyViolation } from '../types/api';
import { severityColor, statusColor, formatDate } from '../lib/utils';

interface PolicySummary {
  total: number;
  active: number;
  total_violations: number;
}

const POLICY_TYPES = [
  { value: 'cost_limit', label: 'Cost Limit' },
  { value: 'tagging', label: 'Tagging' },
  { value: 'region_restriction', label: 'Region Restriction' },
  { value: 'resource_type', label: 'Resource Type' },
];

const ENFORCEMENT_MODES = [
  { value: 'audit', label: 'Audit' },
  { value: 'enforce', label: 'Enforce' },
];

const PROVIDER_OPTIONS = ['aws', 'azure', 'gcp'];

export default function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [violations, setViolations] = useState<PolicyViolation[]>([]);
  const [summary, setSummary] = useState<PolicySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    policy_type: 'cost_limit',
    enforcement_mode: 'audit',
    enabled: true,
    providers: [] as string[],
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [policiesRes, violationsRes, summaryRes] = await Promise.all([
        getPolicies(),
        getPolicyViolations(),
        getPolicySummary(),
      ]);
      setPolicies(policiesRes.data);
      setViolations(violationsRes.data);
      setSummary(summaryRes.data as PolicySummary);
    } catch {
      setError('Failed to load policy data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePolicy = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await createPolicy({
        name: form.name,
        description: form.description || null,
        policy_type: form.policy_type,
        enforcement_mode: form.enforcement_mode,
        enabled: form.enabled,
        providers: form.providers,
      });
      setShowModal(false);
      setForm({
        name: '',
        description: '',
        policy_type: 'cost_limit',
        enforcement_mode: 'audit',
        enabled: true,
        providers: [],
      });
      await fetchData();
    } catch {
      setCreateError('Failed to create policy. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const toggleProvider = (provider: string) => {
    setForm((prev) => ({
      ...prev,
      providers: prev.providers.includes(provider)
        ? prev.providers.filter((p) => p !== provider)
        : [...prev.providers, provider],
    }));
  };

  const formatPolicyType = (type: string) => {
    return POLICY_TYPES.find((t) => t.value === type)?.label || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading policies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-sm text-slate-600">{error}</p>
          <button
            onClick={fetchData}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Policies</h1>
            <p className="text-sm text-slate-500">Manage governance policies and track violations</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Policy
        </button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-sm font-medium text-slate-500">Total Policies</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{summary.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-sm font-medium text-slate-500">Active Policies</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{summary.active}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-sm font-medium text-slate-500">Total Violations</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{summary.total_violations}</p>
          </div>
        </div>
      )}

      {/* Policies Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">All Policies</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Name</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Type</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Enforcement</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Enabled</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Violations</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Last Evaluated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {policies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    No policies found. Create your first policy to get started.
                  </td>
                </tr>
              ) : (
                policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{policy.name}</p>
                        {policy.description && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{policy.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {formatPolicyType(policy.policy_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        policy.enforcement_mode === 'enforce'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {policy.enforcement_mode === 'enforce' ? 'Enforce' : 'Audit'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        policy.enabled ? 'text-green-600' : 'text-slate-400'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${policy.enabled ? 'bg-green-500' : 'bg-slate-300'}`} />
                        {policy.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${
                        policy.violation_count > 0 ? 'text-red-600' : 'text-slate-500'
                      }`}>
                        {policy.violation_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {policy.last_evaluated_at ? formatDate(policy.last_evaluated_at) : 'Never'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Violations */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900">Recent Violations</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Policy</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Resource ID</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Provider</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Severity</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Detected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {violations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    No violations detected. Your resources are compliant.
                  </td>
                </tr>
              ) : (
                violations.map((violation) => (
                  <tr key={violation.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{violation.policy_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{violation.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700 font-mono text-xs">
                        {violation.resource_id || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 uppercase">
                        {violation.provider}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${severityColor(violation.severity)}`}>
                        {violation.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(violation.status)}`}>
                        {violation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(violation.detected_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Policy Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Create Policy</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="p-6 space-y-5">
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {createError}
                </div>
              )}

              {/* Name */}
              <div>
                <label htmlFor="policy-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Policy Name
                </label>
                <input
                  id="policy-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Production Cost Limit"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="policy-desc" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  id="policy-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this policy enforces..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none"
                />
              </div>

              {/* Policy Type */}
              <div>
                <label htmlFor="policy-type" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Policy Type
                </label>
                <div className="relative">
                  <select
                    id="policy-type"
                    value={form.policy_type}
                    onChange={(e) => setForm((prev) => ({ ...prev, policy_type: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow appearance-none bg-white"
                  >
                    {POLICY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Enforcement Mode */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Enforcement Mode
                </label>
                <div className="flex gap-3">
                  {ENFORCEMENT_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, enforcement_mode: mode.value }))}
                      className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        form.enforcement_mode === mode.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enabled Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Enabled</p>
                  <p className="text-xs text-slate-500">Activate this policy immediately</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    form.enabled ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      form.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Providers Multi-Select */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Cloud Providers
                </label>
                <div className="flex gap-3">
                  {PROVIDER_OPTIONS.map((provider) => (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => toggleProvider(provider)}
                      className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium uppercase transition-colors ${
                        form.providers.includes(provider)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {provider}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Policy
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
