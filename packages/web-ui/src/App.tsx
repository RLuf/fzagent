import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  Settings,
  Terminal,
  Database,
  Menu,
  X,
  Cpu,
  Send,
  Save,
  Loader2,
} from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { useChatStore } from './store/useChatStore';
import { useConfigStore } from './store/useConfigStore';
import { useLogStore } from './store/useLogStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_URL = window.location.protocol + '//' + window.location.hostname + ':7331';

const App: React.FC = () => {
  const { activeTab, setActiveTab, isSidebarOpen, toggleSidebar } = useAppStore();
  const { messages, isConnected, connect, sendMessage, selectedModel, setSelectedModel } =
    useChatStore();
  const { content: configContent, fetchConfig, saveConfig, isSaving } = useConfigStore();
  const { logs, clearLogs } = useLogStore();

  const [inputText, setInputText] = useState('');
  const [localConfig, setLocalConfig] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => {
    connect(API_URL);
    fetchConfig(API_URL);
  }, []);

  useEffect(() => {
    if (configContent) {
      setLocalConfig(configContent);
      // Parse de modelos do fzagent.conf (formato KEY=val1,val2)
      const models: string[] = [];
      const lines = configContent.split('\n');
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('MODELS_') && trimmed.includes('=')) {
          const [_, valPart] = trimmed.split('=');
          if (valPart) {
            // Remove colchetes se existirem (flexibilidade) e divide por virgula
            const cleaned = valPart.replace(/[[\]'"]/g, '');
            const m = cleaned
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            models.push(...m);
          }
        }
      });
      const uniqueModels = Array.from(new Set(models));
      setAvailableModels(uniqueModels);
      if (uniqueModels.length > 0 && !selectedModel) {
        setSelectedModel(uniqueModels[0]);
      }
    }
  }, [configContent, setSelectedModel, selectedModel]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText('');
  };

  const menuItems = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'config', label: 'Configuração', icon: Settings },
    { id: 'logs', label: 'Logs', icon: Terminal },
    { id: 'assets', label: 'Ativos DC', icon: Database, disabled: true },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside
        className={cn(
          'bg-slate-900 border-r border-slate-800 transition-all flex flex-col',
          isSidebarOpen ? 'w-64' : 'w-20',
        )}
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Cpu size={24} />
          </div>
          {isSidebarOpen && <span className="font-bold">fzagent Central</span>}
        </div>
        <nav className="flex-1 py-4 px-3 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => !item.disabled && setActiveTab(item.id as any)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                activeTab === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800',
                item.disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <button onClick={toggleSidebar} className="p-4 text-slate-500 hover:text-slate-300">
          {isSidebarOpen ? (
            <X size={20} className="mx-auto" />
          ) : (
            <Menu size={20} className="mx-auto" />
          )}
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold capitalize">{activeTab}</h2>
            {activeTab === 'chat' && availableModels.length > 0 && (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-xs text-blue-400 focus:outline-none"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1 rounded-full border text-xs',
              isConnected ? 'text-green-500 border-green-500/20' : 'text-red-500 border-red-500/20',
            )}
          >
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500',
              )}
            />
            {isConnected ? 'ONLINE' : 'OFFLINE'}
          </div>
        </header>

        <section className="flex-1 p-6 overflow-auto">
          {activeTab === 'chat' && (
            <div className="h-full flex flex-col gap-4 max-w-4xl mx-auto">
              <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-6 overflow-auto flex flex-col gap-3 font-mono text-sm">
                {messages.length === 0 && (
                  <div className="text-slate-600 italic">
                    Terminal pronto. Aguardando comandos...
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'whitespace-pre-wrap',
                      msg.role === 'user' ? 'text-blue-400' : 'text-slate-300',
                    )}
                  >
                    <span className="text-slate-600 mr-2">
                      [{new Date(msg.ts).toLocaleTimeString()}]
                    </span>
                    {msg.role === 'user' ? '$ ' : '> '}
                    {msg.content}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Comando..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleSend}
                  className="bg-blue-600 hover:bg-blue-500 px-6 rounded-lg font-bold"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="h-full flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">Editor fzagent.conf</h3>
                <button
                  onClick={() => saveConfig(API_URL, localConfig)}
                  disabled={isSaving}
                  className="bg-green-600 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{' '}
                  Salvar
                </button>
              </div>
              <textarea
                value={localConfig}
                onChange={(e) => setLocalConfig(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-sm focus:outline-none"
              />
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="h-full bg-slate-950 rounded-xl border border-slate-800 flex flex-col">
              <div className="p-3 border-b border-slate-800 flex justify-between">
                <span className="text-xs text-slate-500">SYSTEM LOGS</span>
                <button onClick={clearLogs} className="text-xs text-blue-500">
                  Clear
                </button>
              </div>
              <div className="flex-1 p-4 font-mono text-xs overflow-auto space-y-1">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={log.level === 'error' ? 'text-red-400' : 'text-emerald-500'}
                  >
                    [{new Date(log.ts).toLocaleTimeString()}] {log.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
