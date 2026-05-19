import { useState, useEffect } from 'react';
import { Server, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getInventory, getInventorySummary } from '../lib/api';
import { cn } from '../lib/utils';

interface Resource {
  resource_id: string;
  resource_type: string;
  provider: string;
  region: string;
  account_id: string;
  name: string | null;
  status: string | null;
  configuration: Record<string, unknown>;
  tags: Record<string, string>;
  monthly_cost_estimate: number | null;
  last_seen_at: string;
}

interface InventorySummary {
  total_resources: number;
  by_type: Array<{ type: string; count: number }>;
  by_provider: Array<{ provider: string; count: number }>;
  by_region: Array<{ region: string; count: number }>;
}

const providerColors: Record<string, string> = {
  aws: 'bg-orange-100 text-orange-700',
  azure: 'bg-blue-100 text-blue-700',
  gcp: 'bg-red-100 text-red-700',
};

export default function ResourceInventory() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  useEffect(() => {
    fetchData();
  }, [page, filterType, filterProvider, search]);

  useEffect(() => {
    getInventorySummary().then(res => setSummary(res.data)).catch(() => {});
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: '25' };
      if (filterType) params.resource_type = filterType;
      if (filterProvider) params.provider = filterProvider;
      if (search) params.search = search;
      const res = await getInventory(params);
      setResources(res.data.data);
      setTotalPages(res.data.pagination.total_pages);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-100 rounded-xl">
          <Server className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resource Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Explore all cloud resources across providers
          </p>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-500">Total Resources</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{summary.total_resources}</p>
          </div>
          {summary.by_provider.map(p => (
            <div key={p.provider} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-medium text-gray-500 capitalize">{p.provider}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{p.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or resource ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={filterProvider}
          onChange={(e) => { setFilterProvider(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
        >
          <option value="">All Providers</option>
          <option value="aws">AWS</option>
          <option value="azure">Azure</option>
          <option value="gcp">GCP</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
        >
          <option value="">All Types</option>
          {summary?.by_type.map(t => (
            <option key={t.type} value={t.type}>{t.type} ({t.count})</option>
          ))}
        </select>
      </div>

      {/* Resources table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : resources.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
            No resources found. Connect a cloud provider and run a sync to populate inventory.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name / ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Provider</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Region</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Est. Cost/mo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resources.map((r) => (
                  <tr
                    key={r.resource_id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedResource(r)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                        {r.name || r.resource_id}
                      </p>
                      {r.name && (
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{r.resource_id}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.resource_type}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full uppercase', providerColors[r.provider] || 'bg-gray-100 text-gray-700')}>
                        {r.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.region}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        r.status === 'running' ? 'bg-green-100 text-green-700' :
                        r.status === 'stopped' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      )}>
                        {r.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {r.monthly_cost_estimate != null ? `$${r.monthly_cost_estimate.toFixed(2)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resource Detail Modal */}
      {selectedResource && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelectedResource(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedResource.name || selectedResource.resource_id}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{selectedResource.resource_type}</p>
              </div>
              <button onClick={() => setSelectedResource(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Provider</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5 uppercase">{selectedResource.provider}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Region</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedResource.region}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Status</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedResource.status || 'unknown'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Monthly Cost</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedResource.monthly_cost_estimate != null ? `$${selectedResource.monthly_cost_estimate.toFixed(2)}` : 'N/A'}
                  </p>
                </div>
              </div>
              {Object.keys(selectedResource.tags).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(selectedResource.tags).map(([k, v]) => (
                      <span key={k} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        {k}={v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Configuration</p>
                <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto text-gray-700 max-h-64">
                  {JSON.stringify(selectedResource.configuration, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
