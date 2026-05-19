import { create } from 'zustand';

interface LogEntry {
  text: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  ts: number;
}

interface LogState {
  logs: LogEntry[];
  addLog: (text: string, level?: LogEntry['level']) => void;
  clearLogs: () => void;
}

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  addLog: (text, level = 'info') =>
    set((state) => ({
      logs: [...state.logs.slice(-199), { text, level, ts: Date.now() }],
    })),
  clearLogs: () => set({ logs: [] }),
}));
