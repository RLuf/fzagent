import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { resolve: true, entry: 'src/index.ts', tsconfig: './tsconfig.build.json' },
  sourcemap: true,
  clean: true,
  target: 'es2022',
  splitting: false,
  treeshake: true,
  tsconfig: './tsconfig.build.json',
  external: ['@fzagent/core', '@fzagent/agent', 'react', 'ink', 'ink-text-input', 'picocolors'],
});
