#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';

const cwd = process.cwd();

console.log(pc.bold(pc.cyan('\n🚀 fzagent Bootstrap & Setup\n')));

function checkStep(name: string, fn: () => void | boolean) {
  process.stdout.write(`  ${pc.dim('→')} ${name}... `);
  try {
    const res = fn();
    if (res === false) {
      console.log(pc.yellow('AVISO'));
    } else {
      console.log(pc.green('OK'));
    }
  } catch (err) {
    console.log(pc.red('FALHA'));
    console.error(pc.red(`    Erro: ${err instanceof Error ? err.message : String(err)}`));
    process.exit(1);
  }
}

// 1. Check Node.js
checkStep('Verificando Node.js', () => {
  const version = process.version;
  if (!version.startsWith('v22') && !version.startsWith('v20') && !version.startsWith('v18')) {
    throw new Error(`Node.js ${version} nao suportado. Use 18, 20 ou 22.`);
  }
});

// 2. Setup .env
checkStep('Configurando .env', () => {
  if (!existsSync(join(cwd, '.env'))) {
    if (existsSync(join(cwd, '.env.example'))) {
      const content = readFileSync(join(cwd, '.env.example'), 'utf8');
      writeFileSync(join(cwd, '.env'), content);
      return true;
    }
    throw new Error('.env.example nao encontrado.');
  }
  return true;
});

// 3. Setup fzagent.conf
checkStep('Configurando fzagent.conf', () => {
  if (!existsSync(join(cwd, 'fzagent.conf'))) {
    if (existsSync(join(cwd, 'fzagent.conf.example'))) {
      const content = readFileSync(join(cwd, 'fzagent.conf.example'), 'utf8');
      writeFileSync(join(cwd, 'fzagent.conf'), content);
      return true;
    }
    throw new Error('fzagent.conf.example nao encontrado.');
  }
  return true;
});

// 4. Build
checkStep('Compilando pacotes (npm run build)', () => {
  execSync('npm run build', { stdio: 'ignore' });
});

// 5. Check Qdrant
checkStep('Verificando Qdrant (opcional)', () => {
  try {
    execSync('curl -s --connect-timeout 2 http://localhost:6333/health', { stdio: 'ignore' });
    return true;
  } catch {
    console.log(pc.yellow('\n    [!] Qdrant nao detectado em localhost:6333.'));
    console.log(pc.dim('        Funcionalidades vetoriais (RAG) estarao limitadas.'));
    return false;
  }
});

// 6. Check Gemini CLI
checkStep('Verificando Gemini CLI', () => {
  try {
    execSync('npx @google/gemini-cli --version', { stdio: 'ignore' });
  } catch {
    throw new Error('Gemini CLI (@google/gemini-cli) nao encontrado no node_modules.');
  }
});

console.log(pc.bold(pc.green('\n✅ Setup concluido com sucesso!\n')));

console.log(pc.cyan('Como usar:'));
console.log(pc.white('  npx fzagent --cli           ') + pc.dim('# Inicia o modo interativo'));
console.log(pc.white('  npx fzagent agent loop "oi" ') + pc.dim('# Testa o loop agentico'));
console.log(pc.white('  npx fzagent --help          ') + pc.dim('# Lista todos os comandos'));

console.log(pc.dim('\nDocumentacao detalhada em HOW_TO_USE.md\n'));
