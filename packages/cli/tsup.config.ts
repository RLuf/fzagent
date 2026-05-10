import { defineConfig } from 'tsup';

// CLI tem dois entries: index (lib) e cli (binario com shebang).
export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  dts: {
    resolve: true,
    entry: { index: 'src/index.ts', cli: 'src/cli.ts' },
    tsconfig: './tsconfig.build.json',
  },
  sourcemap: true,
  clean: true,
  target: 'es2022',
  splitting: false,
  treeshake: true,
  tsconfig: './tsconfig.build.json',
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: [
    '@fzagent/core',
    '@fzagent/providers',
    '@fzagent/memory',
    '@fzagent/skills',
    '@fzagent/agent',
    'commander',
    'picocolors',
    'better-sqlite3',
  ],
});
