import { create } from 'zustand';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { useLogStore } from './useLogStore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

interface ChatState {
  messages: Message[];
  isConnected: boolean;
  socket: Socket | null;
  selectedModel: string;
  connect: (url: string) => void;
  sendMessage: (text: string) => void;
  setSelectedModel: (model: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isConnected: false,
  socket: null,
  selectedModel: '',

  connect: (url) => {
    if (get().socket) return;

    const socket = io(url);

    socket.on('connect', () => {
      set({ isConnected: true });
      useLogStore.getState().addLog('Conectado ao servidor', 'info');
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
      useLogStore.getState().addLog('Desconectado do servidor', 'error');
    });

    socket.on('agent-event', (event: any) => {
      const addLog = useLogStore.getState().addLog;
      switch (event.type) {
        case 'thinking':
          addLog('Agente pensando...', 'debug');
          break;
        case 'tool-call':
          addLog(`→ Executando: ${event.call.name}`, 'info');
          break;
        case 'tool-result':
          addLog(
            `← Resultado: ${event.call.name} (${event.ok ? 'OK' : 'ERRO'})`,
            event.ok ? 'info' : 'warn',
          );
          break;
        case 'iteration-error':
          addLog(`Erro na iteração: ${event.error}`, 'error');
          break;
      }
    });

    socket.on('system-event', (data: any) => {
      useLogStore.getState().addLog(`[SYSTEM] ${data.event}`, 'debug');
    });

    socket.on('chat-response', (data: { text: string }) => {
      set((state) => ({
        messages: [...state.messages, { role: 'assistant', content: data.text, ts: Date.now() }],
      }));
    });

    set({ socket });
  },

  setSelectedModel: (model) => {
    set({ selectedModel: model });
  },

  sendMessage: (text) => {
    const { socket, selectedModel } = get();
    if (!socket) return;

    set((state) => ({
      messages: [...state.messages, { role: 'user', content: text, ts: Date.now() }],
    }));

    socket.emit('chat-message', { text, model: selectedModel });
  },
}));
