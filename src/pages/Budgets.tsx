import { useState, useEffect, type FormEvent } from 'react';
import { DollarSign, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../lib/api';
import type { Budget, CreateBudgetRequest } from '../types/api';
import { formatCurrency, statusColor, cn } from '../lib/utils';

const emptyForm: CreateBudgetRequest = {
  name: '',
  amount: 0,
  currency: 'USD',
  period: 'monthly',
  start_date: '',
  end_date: '',
};

function progressColor(pct: number): string {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

function progressTrackColor(pct: number): string {
  if (pct >= 90) return 'bg-red-100';
  if (pct >= 70) return 'bg-yellow-100';
  return 'bg-green-100';
}

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [form, setForm] = useState<CreateBudgetRequest>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBudgets = async () => {
    try {
      setError('');
      const res = await getBudgets();
      setBudgets(res.data);
    } catch {
      setError('Failed to load budgets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const openCreateModal = () => {
    setEditingBudget(null);
    setForm(emptyForm);
    setSubmitError('');
    setModalOpen(true);
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setForm({
      name: budget.name,
      amount: parseFloat(budget.amount),
      currency: budget.currency,
      period: budget.period,
      start_date: budget.start_date.split('T')[0],
      end_date: budget.end_date.split('T')[0],
    });
    setSubmitError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBudget(null);
    setForm(emptyForm);
    setSubmitError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, form);
      } else {
        await createBudget(form);
      }
      closeModal();
      await fetchBudgets();
    } catch {
      setSubmitError(
        editingBudget
          ? 'Failed to update budget. Please try again.'
          : 'Failed to create budget. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this budget? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteBudget(id);
      setBudgets((prev) => prev.filter((b) => b.id !== id));
    } catch {
      setError('Failed to delete budget. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const getSpendPercentage = (budget: Budget): number => {
    const spend = parseFloat(budget.current_spend) || 0;
    const amount = parseFloat(budget.amount) || 1;
    return Math.min((spend / amount) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading budgets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Budgets</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage your cloud spending budgets
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Budget
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Empty State */}
      {budgets.length === 0 && !error && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No budgets yet</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Create your first budget to start tracking cloud spending against defined limits.
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Budget
          </button>
        </div>
      )}

      {/* Budget Cards Grid */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {budgets.map((budget) => {
            const pct = getSpendPercentage(budget);
            const spend = parseFloat(budget.current_spend) || 0;
            const amount = parseFloat(budget.amount) || 0;

            return (
              <div
                key={budget.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{budget.name}</h3>
                      <span
                        className={cn(
                          'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border mt-1',
                          statusColor(budget.status)
                        )}
                      >
                        {budget.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(budget)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Edit budget"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      disabled={deletingId === budget.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete budget"
                    >
                      {deletingId === budget.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Amount & Spend */}
                <div className="mb-4">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(spend, budget.currency)}
                    </span>
                    <span className="text-sm text-gray-500">
                      of {formatCurrency(amount, budget.currency)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className={cn('w-full h-2.5 rounded-full', progressTrackColor(pct))}>
                    <div
                      className={cn('h-2.5 rounded-full transition-all duration-500', progressColor(pct))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-gray-500">{pct.toFixed(1)}% used</span>
                    <span className="text-xs text-gray-500">
                      {formatCurrency(Math.max(amount - spend, 0), budget.currency)} remaining
                    </span>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Period</p>
                    <p className="text-sm font-medium text-gray-700 capitalize mt-0.5">{budget.period}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Currency</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">{budget.currency}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Start</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">
                      {new Date(budget.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">End</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">
                      {new Date(budget.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Forecasted Spend */}
                {budget.forecasted_spend && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Forecasted</span>
                      <span className="text-sm font-medium text-gray-700">
                        {formatCurrency(budget.forecasted_spend, budget.currency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingBudget ? 'Edit Budget' : 'Create Budget'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {submitError}
                </div>
              )}

              {/* Name */}
              <div>
                <label htmlFor="budget-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Budget Name
                </label>
                <input
                  id="budget-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Q1 Infrastructure Budget"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow text-sm"
                />
              </div>

              {/* Amount & Currency (side by side) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="budget-amount" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Amount
                  </label>
                  <input
                    id="budget-amount"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.amount || ''}
                    onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="10000"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="budget-currency" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Currency
                  </label>
                  <select
                    id="budget-currency"
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow text-sm bg-white"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>
              </div>

              {/* Period */}
              <div>
                <label htmlFor="budget-period" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Period
                </label>
                <select
                  id="budget-period"
                  value={form.period}
                  onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow text-sm bg-white"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {/* Start & End Date (side by side) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="budget-start" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Start Date
                  </label>
                  <input
                    id="budget-start"
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="budget-end" className="block text-sm font-medium text-gray-700 mb-1.5">
                    End Date
                  </label>
                  <input
                    id="budget-end"
                    type="date"
                    required
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow text-sm"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {editingBudget ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingBudget ? 'Update Budget' : 'Create Budget'
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
