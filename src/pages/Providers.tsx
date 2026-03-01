import { useState, useEffect, type FormEvent } from 'react';
import { Cloud, Plus, RefreshCw, Trash2, CheckCircle, XCircle, Plug } from 'lucide-react';
import { getProviders, createProvider, deleteProvider, testProvider, syncProvider } from '../lib/api';
import type { CloudProvider, CreateProviderRequest } from '../types/api';
import { cn, formatDate } from '../lib/utils';

const providerMeta: Record<string, { label: string; emoji: string; color: string; border: string; bg: string }> = {
  aws: { label: 'AWS', emoji: '\uD83D\uDFE0', color: 'text-orange-600', border: 'border-orange-200', bg: 'bg-orange-50' },
  azure: { label: 'Azure', emoji: '\uD83D\uDD35', color: 'text-blue-600', border: 'border-blue-200', bg: 'bg-blue-50' },
  gcp: { label: 'GCP', emoji: '\uD83D\uDD34', color: 'text-red-600', border: 'border-red-200', bg: 'bg-red-50' },
};

const statusBadge: Record<string, { text: string; classes: string }> = {
  connected: { text: 'Connected', classes: 'bg-green-50 text-green-700 border-green-200' },
  pending: { text: 'Pending', classes: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  failed: { text: 'Failed', classes: 'bg-red-50 text-red-700 border-red-200' },
};

const credentialFields: Record<string, { key: string; label: string; type?: string }[]> = {
  aws: [
    { key: 'access_key_id', label: 'Access Key ID' },
    { key: 'secret_access_key', label: 'Secret Access Key', type: 'password' },
    { key: 'region', label: 'Region' },
  ],
  azure: [
    { key: 'tenant_id', label: 'Tenant ID' },
    { key: 'client_id', label: 'Client ID' },
    { key: 'client_secret', label: 'Client Secret', type: 'password' },
    { key: 'subscription_id', label: 'Subscription ID' },
  ],
  gcp: [
    { key: 'project_id', label: 'Project ID' },
    { key: 'service_account_json', label: 'Service Account JSON', type: 'textarea' },
  ],
};

export default function Providers() {
  const [providers, setProviders] = useState<CloudProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});

  // Add provider form state
  const [formType, setFormType] = useState<'aws' | 'azure' | 'gcp'>('aws');
  const [formName, setFormName] = useState('');
  const [formCreds, setFormCreds] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchProviders = async () => {
    try {
      const res = await getProviders();
      setProviders(res.data);
    } catch {
      setError('Failed to load cloud providers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const resetForm = () => {
    setFormType('aws');
    setFormName('');
    setFormCreds({});
    setFormError('');
    setFormLoading(false);
  };

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    const fields = credentialFields[formType];
    for (const f of fields) {
      if (!formCreds[f.key]?.trim()) {
        setFormError(`${f.label} is required.`);
        return;
      }
    }

    setFormLoading(true);
    try {
      const payload: CreateProviderRequest = {
        provider_type: formType,
        name: formName.trim(),
        credentials: { ...formCreds },
      };
      await createProvider(payload);
      closeModal();
      await fetchProviders();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setFormError(axiosErr.response?.data?.error || 'Failed to create provider.');
      } else {
        setFormError('Failed to create provider.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'test' | 'sync' | 'delete') => {
    setActionLoading((prev) => ({ ...prev, [id]: action }));
    try {
      if (action === 'test') {
        await testProvider(id);
      } else if (action === 'sync') {
        await syncProvider(id);
      } else if (action === 'delete') {
        if (!window.confirm('Are you sure you want to delete this provider? This action cannot be undone.')) {
          setActionLoading((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
          return;
        }
        await deleteProvider(id);
      }
      await fetchProviders();
    } catch {
      // Refresh to show latest status even on failure
      await fetchProviders();
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const badge = statusBadge[status] || { text: status, classes: 'bg-gray-50 text-gray-700 border-gray-200' };
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border', badge.classes)}>
        {status === 'connected' && <CheckCircle className="w-3.5 h-3.5" />}
        {status === 'failed' && <XCircle className="w-3.5 h-3.5" />}
        {status === 'pending' && <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />}
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading cloud providers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cloud Providers</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your connected cloud accounts and credentials</p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Provider
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Provider Cards */}
      {providers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Cloud className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No providers configured</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Connect your cloud accounts to start tracking costs, detecting anomalies, and optimizing your infrastructure.
          </p>
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Your First Provider
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {providers.map((provider) => {
            const meta = providerMeta[provider.provider_type] || { label: provider.provider_type, emoji: '\u2601\uFE0F', color: 'text-gray-600', border: 'border-gray-200', bg: 'bg-gray-50' };
            const isActioning = actionLoading[provider.id];

            return (
              <div
                key={provider.id}
                className={cn(
                  'bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow'
                )}
              >
                {/* Card Header */}
                <div className={cn('px-5 py-4 border-b', meta.border, meta.bg)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" role="img" aria-label={meta.label}>
                        {meta.emoji}
                      </span>
                      <div>
                        <h3 className="font-semibold text-slate-900">{provider.name}</h3>
                        <span className={cn('text-xs font-medium uppercase tracking-wider', meta.color)}>
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(provider.status)}
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Last Synced</span>
                    <span className="text-slate-900 font-medium">
                      {provider.last_sync_at ? formatDate(provider.last_sync_at) : 'Never'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Status</span>
                    <span className="text-slate-900 font-medium capitalize">
                      {provider.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {provider.status_message && (
                    <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                      {provider.status_message}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="px-5 py-3 bg-slate-50 border-t border-gray-100 flex items-center gap-2">
                  <button
                    onClick={() => handleAction(provider.id, 'test')}
                    disabled={!!isActioning}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isActioning === 'test' ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    ) : (
                      <Plug className="w-3.5 h-3.5" />
                    )}
                    Test
                  </button>
                  <button
                    onClick={() => handleAction(provider.id, 'sync')}
                    disabled={!!isActioning}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isActioning === 'sync' ? (
                      <div className="w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Sync Now
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => handleAction(provider.id, 'delete')}
                    disabled={!!isActioning}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isActioning === 'delete' ? (
                      <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Provider Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Cloud className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Add Cloud Provider</h3>
                  <p className="text-xs text-slate-500">Connect a new cloud account</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-5">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {formError}
                </div>
              )}

              {/* Provider Type Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Provider Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['aws', 'azure', 'gcp'] as const).map((type) => {
                    const meta = providerMeta[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setFormType(type);
                          setFormCreds({});
                        }}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                          formType === type
                            ? cn('border-blue-500 bg-blue-50 ring-2 ring-blue-200')
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        <span className="text-2xl">{meta.emoji}</span>
                        <span className={cn('text-sm font-semibold', formType === type ? 'text-blue-700' : 'text-slate-700')}>
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name Field */}
              <div>
                <label htmlFor="provider-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Display Name
                </label>
                <input
                  id="provider-name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={`e.g., Production ${providerMeta[formType].label}`}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-sm"
                />
              </div>

              {/* Dynamic Credential Fields */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Credentials</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {credentialFields[formType].map((field) => (
                  <div key={field.key}>
                    <label htmlFor={`cred-${field.key}`} className="block text-sm font-medium text-slate-700 mb-1.5">
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={`cred-${field.key}`}
                        rows={4}
                        value={formCreds[field.key] || ''}
                        onChange={(e) => setFormCreds({ ...formCreds, [field.key]: e.target.value })}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-sm font-mono resize-none"
                      />
                    ) : (
                      <input
                        id={`cred-${field.key}`}
                        type={field.type || 'text'}
                        value={formCreds[field.key] || ''}
                        onChange={(e) => setFormCreds({ ...formCreds, [field.key]: e.target.value })}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {formLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {formLoading ? 'Connecting...' : 'Add Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
