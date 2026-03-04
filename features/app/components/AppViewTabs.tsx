import React from 'react';

interface AppViewTabsProps {
  activeView: 'dashboard' | 'operation';
  onChangeView: (view: 'dashboard' | 'operation') => void;
}

const AppViewTabs: React.FC<AppViewTabsProps> = ({ activeView, onChangeView }) => {
  return (
    <div className="mb-6 inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
      <button
        onClick={() => onChangeView('operation')}
        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${activeView === 'operation' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
      >
        Operación
      </button>
      <button
        onClick={() => onChangeView('dashboard')}
        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${activeView === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
      >
        Dashboard
      </button>
    </div>
  );
};

export default AppViewTabs;
