#!/usr/bin/env node
import { execSync } from 'node:child_process';
import process from 'node:process';

function run(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], ...options }).trim();
  } catch (error) {
    if (options.allowFailure) {
      return null;
    }
    throw error;
  }
}

console.log('🔍 [verify-subissue] Iniciando verificación de branch / PR...');

// 1. Verificar rama actual
let currentBranch = '';
try {
  currentBranch = run('git branch --show-current');
} catch {
  currentBranch = process.env.GITHUB_HEAD_REF || '';
}

console.log(`📌 Rama activa: ${currentBranch || '(desconocida)'}`);

if (currentBranch === 'master' || currentBranch === 'main') {
  console.log('✅ Trabajando directamente sobre master/main. Se permite el flujo directo sin bloqueo.');
  process.exit(0);
}

// 2. Extraer número de sub-issue
let subIssueNumber = process.argv[2];

if (!subIssueNumber) {
  // Intentar extraer de la rama (ej. feat/issue-25-..., fix/26-...)
  const branchMatch = currentBranch.match(/(?:issue[-_]|#)?(\d+)/i);
  if (branchMatch) {
    subIssueNumber = branchMatch[1];
  }
}

if (!subIssueNumber) {
  // Intentar extraer de los últimos commits
  const lastCommits = run('git log -n 5 --oneline', { allowFailure: true }) || '';
  const commitMatch = lastCommits.match(/(?:Refs|Closes|Fixes)?\s*#(\d+)/i);
  if (commitMatch) {
    subIssueNumber = commitMatch[1];
  }
}

if (!subIssueNumber && process.env.GITHUB_REF_NAME) {
  const ghMatch = process.env.GITHUB_REF_NAME.match(/(?:issue[-_]|#)?(\d+)/i);
  if (ghMatch) {
    subIssueNumber = ghMatch[1];
  }
}

if (!subIssueNumber) {
  console.warn('⚠️ No se detectó un número de sub-issue en el nombre de la rama ni en los últimos commits.');
  console.warn('💡 Para ramas de funcionalidad provenientes de sub-issues, incluye el número en la rama (ej: feat/issue-25) o en el commit (ej: Refs #25).');
} else {
  console.log(`📋 Verificando sub-issue #${subIssueNumber} mediante GitHub CLI...`);

  // Validar con GitHub CLI si está disponible
  try {
    const issueJson = run(`gh issue view ${subIssueNumber} --json number,title,state,body`);
    const issueData = JSON.parse(issueJson);
    console.log(`📑 Sub-issue encontrada: #${issueData.number} · ${issueData.title} [Estado: ${issueData.state}]`);

    // Verificar que no sea un issue padre docente protegido
    const parentIssues = ['7', '8', '16', '24'];
    if (parentIssues.includes(String(issueData.number))) {
      console.error(`❌ ERROR: El issue #${issueData.number} es un REQUISITO DOCENTE PADRE.`);
      console.error('🚫 Prohibido mergear o cerrar directamente el issue padre. Debe trabajarse sobre sus sub-issues atómicos.');
      process.exit(1);
    }
  } catch (err) {
    console.warn(`⚠️ No se pudo consultar la sub-issue #${subIssueNumber} con gh CLI: ${err.message}`);
    console.warn('Continuando con verificación local de pruebas...');
  }
}

// 3. Verificar que no existan menciones o atribuciones de IA en commits
console.log('🤖 Verificando ausencia de atribución de IA en el historial de la rama...');
const forbiddenStrings = ['Co-Authored-By', 'Generated with', 'Claude', 'ChatGPT', 'Antigravity AI'];
const recentCommitLogs = run('git log -n 10 --format="%B"', { allowFailure: true }) || '';

for (const forbidden of forbiddenStrings) {
  if (recentCommitLogs.toLowerCase().includes(forbidden.toLowerCase())) {
    console.error(`❌ ERROR DE POLÍTICA: Se detectó atribución de IA prohibida ("${forbidden}") en los commits recientes.`);
    console.error('Por favor remueve cualquier mención o Co-Authored-By de IA antes de pushear o solicitar PR.');
    process.exit(1);
  }
}

// 4. Ejecutar pruebas unitarias de backend y frontend (Vitest)
console.log('🧪 Ejecutando pruebas unitarias automatizadas (Vitest)...');
try {
  console.log('  -> Corriendo tests de Backend...');
  run('pnpm --filter backend test', { stdio: 'inherit' });
  console.log('  -> Corriendo tests de Frontend...');
  run('pnpm --filter frontend test', { stdio: 'inherit' });
  console.log('✅ Todas las pruebas unitarias pasaron satisfactoriamente.');
} catch {
  console.error('❌ ERROR: Las pruebas unitarias fallaron. No se puede proceder con el push o PR.');
  process.exit(1);
}

console.log('🎉 [verify-subissue] Verificación completada con éxito.');
process.exit(0);
