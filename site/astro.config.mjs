import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';

// Site fzagent — replica da navegacao do build-your-own-openclaw.
export default defineConfig({
  site: 'https://fzagent.local',
  integrations: [mdx(), tailwind({ applyBaseStyles: false })],
  build: {
    format: 'directory',
  },
});
