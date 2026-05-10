import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  // dts.compilerOptions deve usar tsconfig.build.json (sem composite)
  // porque o builder de declaracoes do tsup nao lida bem com referencias
  // de projeto composto.
  dts: { resolve: true, entry: 'src/index.ts', tsconfig: './tsconfig.build.json' },
  sourcemap: true,
  clean: true,
  target: 'es2022',
  splitting: false,
  treeshake: true,
  tsconfig: './tsconfig.build.json',
});
