import axios from 'axios';
import type {
  AuthResponse, LoginRequest, SignupRequest,
  CostSummary, CostBreakdown,
  Budget, CreateBudgetRequest,
  Anomaly, AnomalySummary,
  Recommendation, RecommendationSummary,
  Forecast,
  CloudProvider, CreateProviderRequest,
  RemediationAction, RemediationSummary, AutoApprovalRule,
  Policy, PolicyViolation,
  ExecutiveSummary, CostComparison,
  OrgSettings, ChatResponse, ChatMessage, PaginatedResponse, User,
  AiCostSummary, CarbonReport,
} from '../types/api';

const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Backend paginated response shape: { data: T[], pagination: { page, page_size, total } }
// Backend cost trend shape: { start_date, end_date, granularity, data_points, total_cost, avg_daily_cost }
// Backend cost breakdown shape: { dimension, items, total, currency }

// Auth
export const login = (data: LoginRequest) => api.post<AuthResponse>('/auth/login', data);
export const signup = (data: SignupRequest) => api.post<AuthResponse>('/auth/signup', data);
export const getMe = () => api.get<User>('/auth/me');

// Costs — backend returns objects, not arrays
export const getCostSummary = (params?: Record<string, string>) => api.get<CostSummary>('/costs/summary', { params });
export const getCostTrend = (params?: Record<string, string>) => api.get('/costs/trend', { params }).then(res => ({
  ...res,
  data: res.data.data_points as Array<{ date: string; amount: number; provider?: string; service?: string }>,
}));
export const getCostBreakdown = (params?: Record<string, string>) => api.get('/costs/breakdown', { params }).then(res => ({
  ...res,
  data: res.data.items as CostBreakdown[],
}));
export const getAiCosts = (params?: Record<string, string>) => api.get<AiCostSummary>('/costs/ai', { params });
export const exportCosts = (params?: Record<string, string>) => api.get('/costs/export', { params, responseType: 'blob' });

// Budgets — returns plain array
export const getBudgets = (params?: Record<string, string>) => api.get<Budget[]>('/budgets', { params });
export const getBudget = (id: string) => api.get<Budget>(`/budgets/${id}`);
export const createBudget = (data: CreateBudgetRequest) => api.post<Budget>('/budgets', data);
export const updateBudget = (id: string, data: Partial<CreateBudgetRequest>) => api.put<Budget>(`/budgets/${id}`, data);
export const deleteBudget = (id: string) => api.delete(`/budgets/${id}`);

// Anomalies — paginated
export const getAnomalies = (params?: Record<string, string>) => api.get('/anomalies', { params }).then(res => ({
  ...res,
  data: (res.data.data ?? res.data) as Anomaly[],
}));
export const getAnomalySummary = () => api.get<AnomalySummary>('/anomalies/summary');
export const acknowledgeAnomaly = (id: string) => api.post(`/anomalies/${id}/acknowledge`);
export const resolveAnomaly = (id: string) => api.post(`/anomalies/${id}/resolve`);

// Recommendations — paginated
export const getRecommendations = (params?: Record<string, string>) => api.get('/recommendations', { params }).then(res => ({
  ...res,
  data: (res.data.data ?? res.data) as Recommendation[],
}));
export const getRecommendation = (id: string) => api.get<Recommendation>(`/recommendations/${id}`);
export const getRecommendationSummary = () => api.get<RecommendationSummary>('/recommendations/summary');
export const generateRecommendations = () => api.post('/recommendations/generate');
export const updateRecommendationStatus = (id: string, data: { status: string; notes?: string }) =>
  api.put(`/recommendations/${id}/status`, data);
export const dismissRecommendation = (id: string, data: { notes?: string }) =>
  api.post(`/recommendations/${id}/dismiss`, data);

// Forecasts — paginated for list, direct for latest
export const getForecasts = (params?: Record<string, string>) => api.get('/forecasts', { params }).then(res => ({
  ...res,
  data: (res.data.data ?? res.data) as Forecast[],
}));
export const getLatestForecast = () => api.get<Forecast>('/forecasts/latest');

// Cloud Providers — plain array
export const getProviders = () => api.get<CloudProvider[]>('/providers');
export const createProvider = (data: CreateProviderRequest) => api.post<CloudProvider>('/providers', data);
export const updateProvider = (id: string, data: Partial<CreateProviderRequest>) => api.put<CloudProvider>(`/providers/${id}`, data);
export const deleteProvider = (id: string) => api.delete(`/providers/${id}`);
export const testProvider = (id: string) => api.post(`/providers/${id}/test`);
export const syncProvider = (id: string) => api.post(`/providers/${id}/sync`);

// Remediations — paginated
export const getRemediations = (params?: Record<string, string>) => api.get('/remediations', { params }).then(res => ({
  ...res,
  data: (res.data.data ?? res.data) as RemediationAction[],
}));
export const getRemediation = (id: string) => api.get<RemediationAction>(`/remediations/${id}`);
export const createRemediation = (data: Record<string, unknown>) => api.post<RemediationAction>('/remediations', data);
export const approveRemediation = (id: string) => api.post(`/remediations/${id}/approve`);
export const rejectRemediation = (id: string, data: { reason: string }) => api.post(`/remediations/${id}/reject`, data);
export const cancelRemediation = (id: string) => api.post(`/remediations/${id}/cancel`);
export const rollbackRemediation = (id: string) => api.post(`/remediations/${id}/rollback`);
export const getRemediationSummary = () => api.get<RemediationSummary>('/remediations/summary');
export const getAutoApprovalRules = () => api.get<AutoApprovalRule[]>('/remediations/rules');
export const createAutoApprovalRule = (data: Record<string, unknown>) => api.post<AutoApprovalRule>('/remediations/rules', data);
export const deleteAutoApprovalRule = (id: string) => api.delete(`/remediations/rules/${id}`);

// Policies — paginated
export const getPolicies = (params?: Record<string, string>) => api.get('/policies', { params }).then(res => ({
  ...res,
  data: (res.data.data ?? res.data) as Policy[],
}));
export const getPolicy = (id: string) => api.get<Policy>(`/policies/${id}`);
export const createPolicy = (data: Record<string, unknown>) => api.post<Policy>('/policies', data);
export const getPolicySummary = () => api.get('/policies/summary');
export const getPolicyViolations = (params?: Record<string, string>) => api.get('/policies/violations', { params }).then(res => ({
  ...res,
  data: (res.data.data ?? res.data) as PolicyViolation[],
}));

// Reports
export const getExecutiveSummary = (params?: Record<string, string>) => api.get<ExecutiveSummary>('/reports/executive-summary', { params });
export const getCostComparison = (params?: Record<string, string>) => api.get<CostComparison>('/reports/comparison', { params });
export const exportReportCsv = (params?: Record<string, string>) => api.get('/reports/export/csv', { params, responseType: 'blob' });
export const exportReportJson = (params?: Record<string, string>) => api.get('/reports/export/json', { params, responseType: 'blob' });
export const getCarbonReport = (params?: Record<string, string>) => api.get<CarbonReport>('/reports/carbon', { params });

// Chat
export const sendChat = (message: string) => api.post<ChatResponse>('/chat', { message });
export const getChatHistory = (params?: { page?: number; page_size?: number }) =>
  api.get<PaginatedResponse<ChatMessage & { id: string; intent?: string; created_at: string }>>('/chat/history', { params });
export const clearChatHistory = () => api.delete('/chat/history');

/** Open an SSE stream for chat. Returns an AbortController to cancel. */
export function streamChat(
  message: string,
  onChunk: (text: string) => void,
  onDone: (response: string, intent: string) => void,
  onError: (err: string) => void,
): AbortController {
  const controller = new AbortController();
  const token = localStorage.getItem('token');

  fetch('/api/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, stream: true }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        onError(`Request failed: ${res.status}`);
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          const lines = buf.split('\n');
          buf = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const json = line.slice(5).trim();
            if (!json) continue;
            try {
              const evt = JSON.parse(json);
              if (evt.type === 'chunk') onChunk(evt.text);
              else if (evt.type === 'done') onDone(evt.response, evt.intent);
              else if (evt.type === 'error') onError(evt.message);
            } catch { /* skip malformed */ }
          }
        }
      } else {
        // Non-streaming JSON fallback
        const data = await res.json();
        onDone(data.response, data.intent);
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError(err.message);
    });

  return controller;
}

// Settings
export const getSettings = () => api.get<OrgSettings>('/settings');
export const updateSettings = (data: Record<string, unknown>) => api.put<OrgSettings>('/settings', data);

// Allocations
export const getAllocations = (params?: Record<string, string>) => api.get('/allocations', { params });
export const getUntaggedResources = () => api.get('/allocations/untagged');

export default api;
