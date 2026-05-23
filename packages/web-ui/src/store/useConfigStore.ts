import { create } from 'zustand';
import axios from 'axios';

interface ConfigState {
  content: string;
  isLoading: boolean;
  isSaving: boolean;
  fetchConfig: (url: string) => Promise<void>;
  saveConfig: (url: string, content: string) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  content: '',
  isLoading: false,
  isSaving: false,

  fetchConfig: async (url) => {
    set({ isLoading: true });
    try {
      const resp = await axios.get(`${url}/api/config`, {
        headers: { Authorization: `Bearer fzagent-dev-secret` }, // Futuro: pegar do .env ou login
      });
      set({ content: resp.data.content });
    } finally {
      set({ isLoading: false });
    }
  },

  saveConfig: async (url, content) => {
    set({ isSaving: true });
    try {
      await axios.put(
        `${url}/api/config`,
        { content },
        {
          headers: { Authorization: `Bearer fzagent-dev-secret` },
        },
      );
      set({ content });
    } finally {
      set({ isSaving: false });
    }
  },
}));
