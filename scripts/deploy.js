import { execSync } from 'child_process';
import fs from 'fs';

function run(command, description) {
  console.log(`\n⏳ [${description}] Executando: ${command}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ [${description}] Concluído com sucesso!`);
  } catch (err) {
    console.error(`❌ [${description}] Falha ao executar:`, err.message);
    process.exit(1);
  }
}

console.log('🚀 Iniciando pipeline de automação (Versão ➔ Validação ➔ GitHub ➔ Firebase Hosting)...\n');

// 1. Atualiza timestamp de versão para acionar auto-update seguro nos navegadores dos usuários
const now = new Date();
const versionPayload = {
  version: "0.0.60",
  buildTimestamp: now.getTime(),
  releaseDate: now.toISOString(),
  description: "Atualização com suporte nativo a extratos e faturas em PDF, Excel XLSX, OFX e CSV multi-banco."
};
fs.writeFileSync('public/version.json', JSON.stringify(versionPayload, null, 2), 'utf8');
console.log(`📦 [Versão do App] Novo buildTimestamp gerado: ${versionPayload.buildTimestamp} (${versionPayload.releaseDate})`);

// 2. Auditoria e Validação Automática Obrigatória (Qualquer erro aborta imediatamente o deploy)
run('node scripts/validate.js', 'Auditoria e Validação Automática (Tipos, Testes, Lint e Build)');

// 3. Sincronização com o GitHub
const commitMsg = process.argv.slice(2).join(' ') || `chore: atualizacao e auto-update de versao [${now.toLocaleString('pt-BR')}]`;
run('git add -A', 'Adicionando alterações ao Git');
try {
  run(`git commit -m "${commitMsg}"`, 'Commitando alterações');
} catch {
  console.log('ℹ️ Nenhuma alteração pendente de commit no Git.');
}
run('git push origin main', 'Enviando código para o GitHub');

// 4. Deploy no Firebase Hosting
run('npx -y firebase-tools deploy --only hosting', 'Publicando no Firebase Hosting');

console.log('\n🎉 Pipeline 100% concluído!');
console.log('🔗 GitHub: https://github.com/roogerio99-png/finan-as-pro-social-nretq0yri');
console.log('🌐 App Online: https://gestio-financas-app.web.app\n');
