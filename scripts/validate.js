import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

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
logStep(1, 5, 'Verificação Estática de Tipos & Imports (TypeScript)');
runCheck('npx tsc --noEmit', 'Tipagem e Imports (Previne "useRef is not defined", etc.)');

// 2. Auditoria contra Colisões com Web APIs Nativas do DOM (Previne "Illegal constructor")
logStep(2, 5, 'Auditoria de Construtores JSX vs Web APIs Nativas');
const checkDomCollisions = () => {
  const reserved = ['Lock', 'Notification', 'Image', 'Option', 'History', 'Screen', 'Location', 'Range'];
  
  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        if (f !== 'node_modules' && f !== 'dist') scanDir(full);
      } else if (f.endsWith('.tsx')) {
        const content = fs.readFileSync(full, 'utf8');
        for (const res of reserved) {
          const jsxRegex = new RegExp(`<${res}(\\s|>|/)`);
          if (jsxRegex.test(content)) {
            const importRegex = new RegExp(`import[\\s\\S]*?{[^}]*?\\b${res}\\b[^}]*?}[\\s\\S]*?from`);
            if (!importRegex.test(content)) {
              console.error(`\n❌ [FALHA CRÍTICA] O arquivo ${full} usa <${res} />, mas ${res} colide com a Web API nativa 'window.${res}' e NÃO foi explicitamente importado!`);
              console.error(`Isso causa o erro de runtime 'Illegal constructor'. Adicione o import explícito.`);
              process.exit(1);
            }
          }
        }
      }
    }
  }
  scanDir(path.resolve('src'));
  console.log(`${colors.green}✅ [APROVADO] Sem colisões com Web APIs globais (Proteção "Illegal constructor" ativa)${colors.reset}`);
};
checkDomCollisions();

// 3. Análise Estática de Código (Linter)
logStep(3, 5, 'Análise de Sintaxe e Linter de Código');
runCheck('npm run lint', 'Análise de Sintaxe & Boas Práticas');

// 4. Suíte Completa de Testes de Integração
logStep(4, 5, 'Bateria de Testes Automatizados de Integração');
runCheck('npm test', 'Testes de Integração (CRUD, Copiloto IA, NLP, Plano de Contas)');

// 5. Compilação e Empacotamento de Produção (Vite Build)
logStep(5, 5, 'Build de Produção dos Módulos');
runCheck('npm run build', 'Build e Minificação dos Arquivos Finais');

console.log(`\n${colors.bold}================================================================${colors.reset}`);
console.log(`${colors.green}${colors.bold}🎉 TODAS AS VALIDAÇÕES AUTOMÁTICAS FORAM APROVADAS COM SUCESSO! ${colors.reset}`);
console.log(`${colors.bold}   O código está 100% íntegro e pronto para publicação estável.  ${colors.reset}`);
console.log(`${colors.bold}================================================================\n${colors.reset}`);
