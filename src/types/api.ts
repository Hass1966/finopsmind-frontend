export interface User {
  id: string;
  organization_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'editor' | 'viewer';
  active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  organization_name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CostSummary {
  total: number;
  previous_total: number;
  change_pct: number;
  currency: string;
  by_service: Record<string, number>;
  by_provider: Record<string, number>;
  period_start: string;
  period_end: string;
}

export interface CostTrend {
  date: string;
  amount: number;
  provider?: string;
  service?: string;
}

export interface CostBreakdown {
  dimension: string;
  value: string;
  amount: number;
  percentage: number;
}

export interface Budget {
  id: string;
  organization_id: string;
  name: string;
  amount: string;
  currency: string;
  period: string;
  filters: Record<string, unknown>;
  thresholds: number[];
  status: string;
  current_spend: string;
  forecasted_spend: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBudgetRequest {
  name: string;
  amount: number;
  currency: string;
  period: string;
  start_date: string;
  end_date: string;
  filters?: Record<string, unknown>;
  thresholds?: number[];
}

export interface Anomaly {
  id: string;
  organization_id: string;
  date: string;
  actual_amount: string;
  expected_amount: string;
  deviation: string;
  deviation_pct: string;
  score: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  provider: string | null;
  service: string | null;
  account_id: string | null;
  region: string | null;
  root_cause: string | null;
  notes: string | null;
  detected_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

export interface AnomalySummary {
  total: number;
  by_status: Record<string, number>;
  by_severity: Record<string, number>;
}

export interface Recommendation {
  id: string;
  organization_id: string;
  recommendation_type: string;
  provider: string;
  account_id: string | null;
  region: string | null;
  resource_id: string | null;
  resource_type: string | null;
  current_config: Record<string, unknown>;
  recommended_config: Record<string, unknown>;
  estimated_savings: string;
  estimated_savings_pct: string;
  currency: string;
  impact: string;
  effort: string;
  risk: string;
  status: string;
  details: Record<string, unknown>;
  notes: string | null;
  confidence: string | null;
  severity: string | null;
  resource_arn: string | null;
  created_at: string;
}

export interface RecommendationSummary {
  total: number;
  total_savings: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
}

export interface Forecast {
  id: string;
  organization_id: string;
  generated_at: string;
  model_version: string;
  granularity: string;
  predictions: ForecastPrediction[];
  total_forecasted: string;
  confidence_level: string;
  currency: string;
}

export interface ForecastPrediction {
  date: string;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
}

export interface CloudProvider {
  id: string;
  organization_id: string;
  provider_type: 'aws' | 'azure' | 'gcp';
  name: string;
  enabled: boolean;
  status: string;
  status_message: string | null;
  last_sync_at: string | null;
  created_at: string;
}

export interface CreateProviderRequest {
  provider_type: 'aws' | 'azure' | 'gcp';
  name: string;
  credentials: Record<string, string>;
}

export interface RemediationAction {
  id: string;
  organization_id: string;
  recommendation_id: string | null;
  action_type: string;
  status: string;
  provider: string;
  account_id: string | null;
  region: string | null;
  resource_id: string | null;
  resource_type: string | null;
  description: string;
  current_state: Record<string, unknown>;
  desired_state: Record<string, unknown>;
  estimated_savings: string;
  currency: string;
  risk: string;
  auto_approved: boolean;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  executed_at: string | null;
  completed_at: string | null;
  failure_reason: string | null;
  created_at: string;
}

export interface RemediationSummary {
  total: number;
  by_status: Record<string, number>;
  total_savings: number;
}

export interface Policy {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  policy_type: string;
  enforcement_mode: string;
  enabled: boolean;
  conditions: Record<string, unknown>;
  providers: string[];
  environments: string[];
  violation_count: number;
  last_evaluated_at: string | null;
  created_at: string;
}

export interface PolicyViolation {
  id: string;
  policy_id: string;
  policy_name: string;
  status: string;
  provider: string;
  account_id: string | null;
  region: string | null;
  resource_id: string | null;
  resource_type: string | null;
  description: string;
  severity: string;
  detected_at: string;
}

export interface ExecutiveSummary {
  total_cost: number;
  cost_change_pct: number;
  total_savings_identified: number;
  total_savings_realized: number;
  active_anomalies: number;
  budget_utilization: number;
  top_services: Array<{ service: string; amount: number }>;
  cost_by_provider: Record<string, number>;
}

export interface CostComparison {
  current_period: { start: string; end: string; total: number };
  previous_period: { start: string; end: string; total: number };
  change_amount: number;
  change_pct: number;
  by_service: Array<{
    service: string;
    current: number;
    previous: number;
    change_pct: number;
  }>;
}

export interface OrgSettings {
  id: string;
  name: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AutoApprovalRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    max_savings?: number;
    allowed_types?: string[];
    allowed_risks?: string[];
  };
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface WsMessage {
  type: string;
  org_id: string;
  data: unknown;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  intent: string;
  data?: unknown;
}
