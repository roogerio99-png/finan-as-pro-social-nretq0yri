import { execSync } from 'child_process';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function logStep(step, total, title) {
  console.log(`\n${colors.cyan}${colors.bold}🔍 [PASSO ${step}/${total}] ${title}...${colors.reset}`);
}

function runCheck(command, title) {
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`${colors.green}✅ [APROVADO] ${title}${colors.reset}`);
    return true;
  } catch (err) {
    console.error(`\n${colors.red}${colors.bold}❌ [FALHA CRÍTICA] ${title}${colors.reset}`);
    console.error(`${colors.yellow}O comando '${command}' falhou. A atualização foi interrompida para proteger a estabilidade do sistema.${colors.reset}\n`);
    process.exit(1);
  }
}

console.log(`${colors.bold}================================================================${colors.reset}`);
console.log(`${colors.bold}🛡️  INICIANDO AUDITORIA AUTOMÁTICA DE QUALIDADE & INTEGRIDADE   ${colors.reset}`);
console.log(`${colors.bold}================================================================${colors.reset}`);

// 1. Checagem Estática de Tipos e Imports (TypeScript)
logStep(1, 4, 'Verificação Estática de Tipos & Imports (TypeScript)');
runCheck('npx tsc --noEmit', 'Tipagem e Imports (Previne "useRef is not defined", etc.)');

// 2. Análise Estática de Código (Linter)
logStep(2, 4, 'Análise de Sintaxe e Linter de Código');
runCheck('npm run lint', 'Análise de Sintaxe & Boas Práticas');

// 3. Suíte Completa de Testes de Integração
logStep(3, 4, 'Bateria de Testes Automatizados de Integração');
runCheck('npm test', 'Testes de Integração (CRUD, Copiloto IA, NLP, Plano de Contas)');

// 4. Compilação e Empacotamento de Produção (Vite Build)
logStep(4, 4, 'Build de Produção dos Módulos');
runCheck('npm run build', 'Build e Minificação dos Arquivos Finais');

console.log(`\n${colors.bold}================================================================${colors.reset}`);
console.log(`${colors.green}${colors.bold}🎉 TODAS AS VALIDAÇÕES AUTOMÁTICAS FORAM APROVADAS COM SUCESSO! ${colors.reset}`);
console.log(`${colors.bold}   O código está 100% íntegro e pronto para publicação estável.  ${colors.reset}`);
console.log(`${colors.bold}================================================================\n${colors.reset}`);
