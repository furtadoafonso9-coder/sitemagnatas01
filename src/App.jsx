import React, { useState } from 'react';
import { Shield, Users, Trophy, DollarSign, Crosshair, AlertTriangle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-red-900/40 bg-neutral-900/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-black tracking-wider text-red-600 uppercase">MAGNATAS 01!</h1>
        </div>
        <div className="flex items-center space-x-2 bg-red-950/40 border border-red-900/50 px-3 py-1.5 rounded-full">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-neutral-300">SISTEMA ONLINE</span>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 border-r border-neutral-800 bg-neutral-900/40 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition ${activeTab === 'dashboard' ? 'bg-red-600 text-white' : 'hover:bg-neutral-800 text-neutral-400'}`}>
            <Crosshair className="w-5 h-5" />
            <span>Painel Principal</span>
          </button>
          <button 
            onClick={() => setActiveTab('members')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition ${activeTab === 'members' ? 'bg-red-600 text-white' : 'hover:bg-neutral-800 text-neutral-400'}`}>
            <Users className="w-5 h-5" />
            <span>Membros</span>
          </button>
          <button 
            onClick={() => setActiveTab('finances')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition ${activeTab === 'finances' ? 'bg-red-600 text-white' : 'hover:bg-neutral-800 text-neutral-400'}`}>
            <DollarSign className="w-5 h-5" />
            <span>Cofre / Finanças</span>
          </button>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-8 space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400 font-medium">Membros Ativos</p>
                <p className="text-3xl font-extrabold text-white mt-1">24</p>
              </div>
              <Users className="w-10 h-10 text-red-600/50" />
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400 font-medium">Fundo da Gang</p>
                <p className="text-3xl font-extrabold text-emerald-500 mt-1">$ 1,250,000</p>
              </div>
              <DollarSign className="w-10 h-10 text-emerald-500/50" />
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400 font-medium">Nível de Ameaça</p>
                <p className="text-3xl font-extrabold text-red-600 mt-1">EXTREMO</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-600/50" />
            </div>
          </div>

          {/* Status Box */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Bem-vindo à Central da Magnatas 01!</span>
            </h2>
            <p className="text-neutral-400 leading-relaxed">
              Base operacional sincronizada com sucesso no Vercel. Garante que todos os membros mantêm o registo atualizado.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
