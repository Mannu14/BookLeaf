import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import {
  Layers,
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
  TrendingUp,
  ArrowRight,
  Shield,
  LifeBuoy,
  BarChart3,
  Sparkles,
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Loading operations analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
              <Shield className="w-3.5 h-3.5" /> BookLeaf Operations Control Room
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Support Queue & AI Operations Overview
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Monitor author inquiries, SLA resolution deadlines, AI classification accuracy, and team workload in real time.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/tickets?sortBy=urgency"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition"
            >
              <Layers className="w-4 h-4" />
              Open Ticket Queue →
            </Link>
            <Link
              to="/admin/authors"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 transition"
            >
              <Users className="w-4 h-4" />
              Authors Directory
            </Link>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Tickets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Inquiries</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats?.totalTickets || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Across all 10 registered authors</p>
        </div>

        {/* Open Tickets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Open Tickets</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 mt-2">{stats?.openTickets || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting admin review & action</p>
        </div>

        {/* In Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">In Progress</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{stats?.inProgressTickets || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Under active team correspondence</p>
        </div>

        {/* Critical Priority */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Critical Priority</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600 mt-2">{stats?.criticalTickets || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Urgent payment or ISBN errors</p>
        </div>

        {/* SLA Breach Risk */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">SLA Alert (&gt;48h)</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 mt-2">{stats?.slaRiskCount || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Open tickets near resolution target</p>
        </div>
      </div>

      {/* Categories Breakdown & Quick Operations Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Volume Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Inquiries by Operational Category</h3>
              <p className="text-[11px] text-slate-500">Distribution mapped automatically by AI engine</p>
            </div>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3 pt-2">
            {stats?.categoriesBreakdown?.map((item) => {
              const total = stats.totalTickets || 1;
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={item._id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{item._id}</span>
                    <span className="text-slate-500 font-mono">
                      {item.count} tickets ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SLA & BookLeaf Policy Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>🛡️</span> Operations SLA Targets (BookLeaf Standard)
          </h3>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start gap-3">
              <span className="font-bold text-indigo-700 text-sm">48h</span>
              <div>
                <strong className="text-slate-800">ISBN & Metadata Correction:</strong> Escalate directly to production; full metadata resolution expected within 48 hours.
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start gap-3">
              <span className="font-bold text-emerald-700 text-sm">24-48h</span>
              <div>
                <strong className="text-slate-800">Distribution Stock Sync:</strong> Trigger automated inventory feed refresh for books showing unavailable on Amazon.
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start gap-3">
              <span className="font-bold text-amber-700 text-sm">5-7d</span>
              <div>
                <strong className="text-slate-800">Defect Reprint Dispatch:</strong> Free replacement run dispatched within 5-7 business days upon photo verification.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
