import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, Shield, BookOpen, X } from 'lucide-react';

export default function DemoSwitcherModal({ isOpen, onClose }) {
  const { demoUsers, login, user: currentUser } = useAuth();

  if (!isOpen) return null;

  const handleSelectUser = async (email, password = 'author123') => {
    try {
      if (email === 'admin@bookleaf.pub') {
        await login(email, 'admin123');
      } else {
        await login(email, 'author123');
      }
      onClose();
    } catch (err) {
      alert(`Login failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>⚡</span> Fast Demo Account Switcher
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any account below to instantly evaluate author and admin perspectives.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Admin Account */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              BookLeaf Operations (Admin View)
            </div>
            <div
              onClick={() => handleSelectUser('admin@bookleaf.pub')}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                currentUser?.email === 'admin@bookleaf.pub'
                  ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    Aditi Verma (Support Lead)
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                      ADMIN
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">admin@bookleaf.pub • Full Queue & AI Management</div>
                </div>
              </div>
              <button className="text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-indigo-50">
                Switch to Admin →
              </button>
            </div>
          </div>

          {/* Authors List */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Sample Authors (Pre-seeded Dataset)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {demoUsers
                .filter((u) => u.role !== 'admin')
                .map((author) => {
                  const isCurrent = currentUser?.email === author.email;
                  return (
                    <div
                      key={author.author_id}
                      onClick={() => handleSelectUser(author.email)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {author.name.charAt(0)}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-800 truncate flex items-center gap-1.5">
                            {author.name}
                            {isCurrent && (
                              <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1 rounded font-bold">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{author.email}</div>
                          <div className="text-[10px] text-slate-400">
                            {author.author_id} • {author.city}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0 font-medium ml-2">Login →</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>All author demo passwords: <code className="bg-slate-200 px-1 rounded font-mono">author123</code></span>
          <span>Admin password: <code className="bg-slate-200 px-1 rounded font-mono">admin123</code></span>
        </div>
      </div>
    </div>
  );
}
