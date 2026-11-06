import { execSync } from 'child_process';

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

console.log('🚀 Iniciando pipeline de automação (Build ➔ GitHub ➔ Firebase Hosting)...\n');

// 1. Build de Produção
run('npm run build', 'Build dos Arquivos de Produção');

// 2. Sincronização com o GitHub
const commitMsg = process.argv.slice(2).join(' ') || `chore: atualizacao e deploy automatico [${new Date().toLocaleString('pt-BR')}]`;
run('git add -A', 'Adicionando alterações ao Git');
try {
  run(`git commit -m "${commitMsg}"`, 'Commitando alterações');
} catch {
  console.log('ℹ️ Nenhuma alteração pendente de commit no Git.');
}
run('git push origin main', 'Enviando código para o GitHub');

// 3. Deploy no Firebase Hosting
run('npx -y firebase-tools deploy --only hosting', 'Publicando no Firebase Hosting');

console.log('\n🎉 Pipeline 100% concluído!');
console.log('🔗 GitHub: https://github.com/roogerio99-png/finan-as-pro-social-nretq0yri');
console.log('🌐 App Online: https://gestio-financas-app.web.app\n');
