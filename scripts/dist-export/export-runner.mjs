import fs from "fs";
import path from "path";
//#region src/lib/storage/indexedDbStore.ts
/**
* Repositório Local Durável baseado em IndexedDB
* Substitui o armazenamento em nuvem e localStorage para todos os dados financeiros.
* Opera de forma 100% autônoma no dispositivo do usuário (PWA Offline-First).
*/
var DB_NAME = "GestioFinancas_DB_v1";
var DB_VERSION = 1;
var STORES = [
	"accounts",
	"categories",
	"transactions",
	"budgets",
	"debts",
	"dreams",
	"depara_rules",
	"invoices",
	"payments",
	"vault_meta"
];
var LocalIndexedDbStore = class {
	dbPromise = null;
	memoryFallback = /* @__PURE__ */ new Map();
	isPersistedStorage = false;
	constructor() {
		for (const name of STORES) this.memoryFallback.set(name, /* @__PURE__ */ new Map());
	}
	/**
	* Abre a conexão com o banco IndexedDB ou retorna fallback caso indisponível
	*/
	async getDb() {
		if (typeof window === "undefined" || typeof indexedDB === "undefined") return null;
		if (this.dbPromise) return this.dbPromise;
		this.dbPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);
			request.onupgradeneeded = (event) => {
				const db = event.target.result;
				for (const storeName of STORES) if (!db.objectStoreNames.contains(storeName)) {
					const store = db.createObjectStore(storeName, { keyPath: "id" });
					if (storeName === "transactions") {
						store.createIndex("user_id", "user_id", { unique: false });
						store.createIndex("date", "date", { unique: false });
						store.createIndex("account_id", "account_id", { unique: false });
						store.createIndex("category_id", "category_id", { unique: false });
						store.createIndex("competence_month", "competence_month", { unique: false });
						store.createIndex("cash_month", "cash_month", { unique: false });
					} else if (storeName === "categories") {
						store.createIndex("user_id", "user_id", { unique: false });
						store.createIndex("type", "type", { unique: false });
						store.createIndex("group_code", "group_code", { unique: false });
					} else if (storeName === "accounts") {
						store.createIndex("user_id", "user_id", { unique: false });
						store.createIndex("status", "status", { unique: false });
					} else if (storeName === "budgets") {
						store.createIndex("user_id", "user_id", { unique: false });
						store.createIndex("month", "month", { unique: false });
					} else if (storeName !== "vault_meta") store.createIndex("user_id", "user_id", { unique: false });
				}
			};
			request.onsuccess = async () => {
				const db = request.result;
				this.requestPersistence();
				resolve(db);
			};
			request.onerror = () => {
				console.warn("[IndexedDB] Erro ao abrir banco local, usando fallback seguro em memória:", request.error);
				resolve(null);
			};
			request.onblocked = () => {
				console.warn("[IndexedDB] Conexão bloqueada por outra aba aberta com versão antiga.");
			};
		});
		return this.dbPromise;
	}
	/**
	* Solicita que o navegador proteja a base contra remoção automática por falta de espaço
	*/
	async requestPersistence() {
		if (typeof window !== "undefined" && navigator.storage && navigator.storage.persist) try {
			const isPersisted = await navigator.storage.persist();
			this.isPersistedStorage = isPersisted;
			return isPersisted;
		} catch {}
		return false;
	}
	/**
	* Recupera todos os registros de uma coleção com transação de leitura
	*/
	async getAll(storeName) {
		const db = await this.getDb();
		if (!db) {
			const map = this.memoryFallback.get(storeName);
			return map ? Array.from(map.values()) : [];
		}
		return new Promise((resolve, reject) => {
			try {
				const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
				request.onsuccess = () => resolve(request.result || []);
				request.onerror = () => reject(request.error);
			} catch (err) {
				reject(err);
			}
		});
	}
	/**
	* Grava ou atualiza um registro com garantia de transação concluída (ACID)
	*/
	async put(storeName, record) {
		const db = await this.getDb();
		if (!db) {
			this.memoryFallback.get(storeName)?.set(record.id, record);
			return record;
		}
		return new Promise((resolve, reject) => {
			try {
				const tx = db.transaction(storeName, "readwrite");
				tx.objectStore(storeName).put(record);
				tx.oncomplete = () => resolve(record);
				tx.onerror = () => {
					console.error(`[IndexedDB] Falha ao persistir em ${storeName}:`, tx.error);
					reject(/* @__PURE__ */ new Error(`Falha ao gravar no armazenamento local (${tx.error?.message || "Erro desconhecido"}).`));
				};
				tx.onabort = () => {
					reject(/* @__PURE__ */ new Error("A gravação dos dados foi cancelada pelo navegador (possível falta de espaço no disco)."));
				};
			} catch (err) {
				reject(err);
			}
		});
	}
	/**
	* Exclui um registro da coleção de forma durável
	*/
	async delete(storeName, id) {
		const db = await this.getDb();
		if (!db) {
			this.memoryFallback.get(storeName)?.delete(id);
			return true;
		}
		return new Promise((resolve, reject) => {
			try {
				const tx = db.transaction(storeName, "readwrite");
				tx.objectStore(storeName).delete(id);
				tx.oncomplete = () => resolve(true);
				tx.onerror = () => reject(tx.error);
				tx.onabort = () => reject(/* @__PURE__ */ new Error("Exclusão abortada pelo navegador."));
			} catch (err) {
				reject(err);
			}
		});
	}
	/**
	* Limpa uma coleção inteira
	*/
	async clear(storeName) {
		const db = await this.getDb();
		if (!db) {
			this.memoryFallback.get(storeName)?.clear();
			return;
		}
		return new Promise((resolve, reject) => {
			try {
				const tx = db.transaction(storeName, "readwrite");
				tx.objectStore(storeName).clear();
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			} catch (err) {
				reject(err);
			}
		});
	}
	/**
	* Exporta todas as coleções locais para criação de Backup
	*/
	async exportFullDatabase() {
		const dump = {};
		for (const storeName of STORES) dump[storeName] = await this.getAll(storeName);
		return dump;
	}
	/**
	* Restaura o banco de dados completo a partir de um backup com substituição atômica
	*/
	async restoreFullDatabase(data) {
		const db = await this.getDb();
		if (!db) {
			for (const storeName of STORES) {
				const map = this.memoryFallback.get(storeName);
				if (map) {
					map.clear();
					const items = data[storeName] || [];
					for (const item of items) if (item && item.id) map.set(item.id, item);
				}
			}
			return;
		}
		const targetStores = STORES.filter((s) => s !== "vault_meta");
		return new Promise((resolve, reject) => {
			try {
				const tx = db.transaction(targetStores, "readwrite");
				for (const storeName of targetStores) {
					const store = tx.objectStore(storeName);
					store.clear();
					const items = data[storeName] || [];
					for (const item of items) if (item && item.id) store.put(item);
				}
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(/* @__PURE__ */ new Error(`Falha na restauração do backup: ${tx.error?.message}`));
				tx.onabort = () => reject(/* @__PURE__ */ new Error("A restauração foi cancelada para preservar a integridade da base."));
			} catch (err) {
				reject(err);
			}
		});
	}
	/**
	* Exclusão local explícita de todos os dados pelo usuário ("Apagar Meus Dados")
	*/
	async purgeAllData() {
		const db = await this.getDb();
		if (!db) {
			for (const map of this.memoryFallback.values()) map.clear();
			return;
		}
		return new Promise((resolve, reject) => {
			try {
				const tx = db.transaction(STORES, "readwrite");
				for (const storeName of STORES) tx.objectStore(storeName).clear();
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			} catch (err) {
				reject(err);
			}
		});
	}
};
var indexedDbStore = new LocalIndexedDbStore();
//#endregion
//#region src/lib/pocketbase/mockStore.ts
var STORAGE_PREFIX = "gestio_financas_pb_";
function getStored(key, defaultValue) {
	try {
		const raw = localStorage.getItem(STORAGE_PREFIX + key);
		if (raw) return JSON.parse(raw);
	} catch {}
	return defaultValue;
}
function createInitialData() {
	const nowIso = (/* @__PURE__ */ new Date()).toISOString();
	nowIso.slice(0, 7);
	const defaultUser = {
		id: "usr_local",
		email: "usuario@local.app",
		name: "Minhas Finanças",
		verified: true,
		created: nowIso,
		updated: nowIso
	};
	const defaultFamily = {
		id: "fam_local",
		name: "Meu Cofre Financeiro",
		created_by: defaultUser.id,
		members: [defaultUser.id],
		created: nowIso,
		updated: nowIso
	};
	const seededAccounts = [{
		id: "acc_corrente_padrao",
		user_id: defaultUser.id,
		name: "Conta Corrente Principal",
		type: "checking",
		initial_balance: 0,
		current_balance: 0,
		color: "#059669",
		status: "active",
		created: nowIso,
		updated: nowIso
	}, {
		id: "acc_cartao_padrao",
		user_id: defaultUser.id,
		name: "Cartão de Crédito",
		type: "credit_card",
		initial_balance: 0,
		current_balance: 0,
		credit_limit: 5e3,
		closing_day: 25,
		due_day: 5,
		color: "#7C3AED",
		status: "active",
		created: nowIso,
		updated: nowIso
	}];
	const seededCategories = [
		{
			id: "cat_grp_0",
			user_id: defaultUser.id,
			name: "Receitas",
			type: "income",
			group_level1: "Receitas",
			group_level2: "",
			group_code: "0.0",
			code: "",
			description: "Entradas financeiras, salários, remunerações e rendimentos.",
			color: "#059669",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_0_1",
			user_id: defaultUser.id,
			name: "Salários e Remunerações",
			type: "income",
			group_level1: "Receitas",
			group_level2: "Salários e Remunerações",
			group_code: "0.0",
			code: "0.1",
			description: "Salários, pró-labore, adiantamentos e bonificações líquidas creditadas em conta.",
			icon: "Briefcase",
			color: "#16A34A",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_0_2",
			user_id: defaultUser.id,
			name: "Outras Entradas",
			type: "income",
			group_level1: "Receitas",
			group_level2: "Outras Entradas",
			group_code: "0.0",
			code: "0.2",
			description: "Rendimentos de aplicações, aluguéis recebidos, restituição de IR e vendas de bens.",
			icon: "TrendingUp",
			color: "#059669",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_grp_1",
			user_id: defaultUser.id,
			name: "Habitação e Moradia",
			type: "expense",
			group_level1: "Habitação e Moradia",
			group_level2: "",
			group_code: "1.0",
			code: "",
			description: "Custos estruturais de moradia, contas de utilidades e manutenção residencial.",
			color: "#0284C7",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_1_1",
			user_id: defaultUser.id,
			name: "Estrutural Habitacional",
			type: "expense",
			group_level1: "Habitação e Moradia",
			group_level2: "Estrutural Habitacional",
			group_code: "1.0",
			code: "1.1",
			description: "Custos de ocupação: condomínio residencial, taxa de associação de bairro ou aluguel.",
			icon: "Home",
			color: "#2563EB",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_1_2",
			user_id: defaultUser.id,
			name: "Financiamento Imobiliário",
			type: "expense",
			group_level1: "Habitação e Moradia",
			group_level2: "Financiamento Imobiliário",
			group_code: "1.0",
			code: "1.2",
			description: "Parcelas de amortização, juros e seguros atrelados ao crédito do imóvel.",
			icon: "Building",
			color: "#1D4ED8",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_1_3",
			user_id: defaultUser.id,
			name: "Concessionárias e Utilidades",
			type: "expense",
			group_level1: "Habitação e Moradia",
			group_level2: "Concessionárias e Utilidades",
			group_code: "1.0",
			code: "1.3",
			description: "Contas de energia elétrica, abastecimento de água/esgoto e gás (canalizado ou botijão).",
			icon: "Zap",
			color: "#3B82F6",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_1_4",
			user_id: defaultUser.id,
			name: "Telecomunicação Residencial",
			type: "expense",
			group_level1: "Habitação e Moradia",
			group_level2: "Telecomunicação Residencial",
			group_code: "1.0",
			code: "1.4",
			description: "Conexão de internet banda larga fixa, TV por assinatura e taxas municipais de lixo.",
			icon: "Wifi",
			color: "#06B6D4",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_1_5",
			user_id: defaultUser.id,
			name: "Manutenção Rotineira",
			type: "expense",
			group_level1: "Habitação e Moradia",
			group_level2: "Manutenção Rotineira",
			group_code: "1.0",
			code: "1.5",
			description: "Reparos elétricos/hidráulicos pontuais, lâmpadas, dedetização, jardim e limpeza pesada.",
			icon: "Wrench",
			color: "#0284C7",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_1_6",
			user_id: defaultUser.id,
			name: "Tributos e Proteção",
			type: "expense",
			group_level1: "Habitação e Moradia",
			group_level2: "Tributos e Proteção",
			group_code: "1.0",
			code: "1.6",
			description: "Imposto predial e territorial urbano (IPTU) e apólice de seguro residencial.",
			icon: "Shield",
			color: "#0369A1",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_grp_2",
			user_id: defaultUser.id,
			name: "Alimentação e Despensa",
			type: "expense",
			group_level1: "Alimentação e Despensa",
			group_level2: "",
			group_code: "2.0",
			code: "",
			description: "Supermercado, perecíveis, açougue, hortifrúti e refeições em trânsito no trabalho.",
			color: "#0284C7",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_2_1",
			user_id: defaultUser.id,
			name: "Mercado Principal",
			type: "expense",
			group_level1: "Alimentação e Despensa",
			group_level2: "Mercado Principal",
			group_code: "2.0",
			code: "2.1",
			description: "Compras de base mensal/quinzenal: grãos, secos, higiene doméstica e descartáveis.",
			icon: "ShoppingCart",
			color: "#0284C7",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_2_2",
			user_id: defaultUser.id,
			name: "Açougue, Feira e Perecíveis",
			type: "expense",
			group_level1: "Alimentação e Despensa",
			group_level2: "Açougue, Feira e Perecíveis",
			group_code: "2.0",
			code: "2.2",
			description: "Proteínas, carnes, hortifrúti, verduras, laticínios frescos e itens de padaria.",
			icon: "Apple",
			color: "#059669",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_2_3",
			user_id: defaultUser.id,
			name: "Refeições em Trânsito",
			type: "expense",
			group_level1: "Alimentação e Despensa",
			group_level2: "Refeições em Trânsito",
			group_code: "2.0",
			code: "2.3",
			description: "Almoços executivos da rotina de trabalho, cafés matinais e lanches de expediente.",
			icon: "Utensils",
			color: "#F59E0B",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_grp_3",
			user_id: defaultUser.id,
			name: "Transporte e Mobilidade",
			type: "expense",
			group_level1: "Transporte e Mobilidade",
			group_level2: "",
			group_code: "3.0",
			code: "",
			description: "Deslocamentos, combustível, manutenção de veículos e aplicativos de transporte.",
			color: "#0284C7",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_3_1",
			user_id: defaultUser.id,
			name: "Consumo dos Veículos",
			type: "expense",
			group_level1: "Transporte e Mobilidade",
			group_level2: "Consumo dos Veículos",
			group_code: "3.0",
			code: "3.1",
			description: "Abastecimento de combustível (etanol, gasolina ou diesel), lavagens e estacionamentos.",
			icon: "Fuel",
			color: "#B45309",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_3_2",
			user_id: defaultUser.id,
			name: "Manutenção Automotiva",
			type: "expense",
			group_level1: "Transporte e Mobilidade",
			group_level2: "Manutenção Automotiva",
			group_code: "3.0",
			code: "3.2",
			description: "Trocas de óleo, filtros, velas, pneus, pastilhas de freio, alinhamento e balanceamento.",
			icon: "Wrench",
			color: "#78716C",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_3_3",
			user_id: defaultUser.id,
			name: "Obrigações e Provisões",
			type: "expense",
			group_level1: "Transporte e Mobilidade",
			group_level2: "Obrigações e Provisões",
			group_code: "3.0",
			code: "3.3",
			description: "IPVA, seguro total do automóvel, taxa de licenciamento anual e DPVAT/SPVAT.",
			icon: "FileText",
			color: "#475569",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_3_4",
			user_id: defaultUser.id,
			name: "Deslocamento Alternativo",
			type: "expense",
			group_level1: "Transporte e Mobilidade",
			group_level2: "Deslocamento Alternativo",
			group_code: "3.0",
			code: "3.4",
			description: "Corridas em aplicativos (Uber/99), tarifas de pedágio e transporte interurbano.",
			icon: "Car",
			color: "#EAB308",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_grp_4",
			user_id: defaultUser.id,
			name: "Saúde e Prevenção",
			type: "expense",
			group_level1: "Saúde e Prevenção",
			group_level2: "",
			group_code: "4.0",
			code: "",
			description: "Assistência médica, consultas, farmácia, exames e autocuidado físico.",
			color: "#0284C7",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_4_1",
			user_id: defaultUser.id,
			name: "Planos de Saúde",
			type: "expense",
			group_level1: "Saúde e Prevenção",
			group_level2: "Planos de Saúde",
			group_code: "4.0",
			code: "4.1",
			description: "Mensalidades de planos de assistência médica e odontológica para a família.",
			icon: "HeartPulse",
			color: "#0EA5E9",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_4_2",
			user_id: defaultUser.id,
			name: "Medicamentos e Farmácia",
			type: "expense",
			group_level1: "Saúde e Prevenção",
			group_level2: "Medicamentos e Farmácia",
			group_code: "4.0",
			code: "4.2",
			description: "Remédios de uso contínuo, receitas pontuais, analgésicos e suplementação vitamínica.",
			icon: "Pill",
			color: "#EF4444",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_4_3",
			user_id: defaultUser.id,
			name: "Consultas e Procedimentos",
			type: "expense",
			group_level1: "Saúde e Prevenção",
			group_level2: "Consultas e Procedimentos",
			group_code: "4.0",
			code: "4.3",
			description: "Coparticipações de plano, consultas médicas particulares, exames e psicoterapias.",
			icon: "Stethoscope",
			color: "#8B5CF6",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_4_4",
			user_id: defaultUser.id,
			name: "Autocuidado Físico",
			type: "expense",
			group_level1: "Saúde e Prevenção",
			group_level2: "Autocuidado Físico",
			group_code: "4.0",
			code: "4.4",
			description: "Mensalidade de academia, estúdios de pilates, natação e assessorias esportivas.",
			icon: "Dumbbell",
			color: "#10B981",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_grp_5",
			user_id: defaultUser.id,
			name: "Educação e Filhos",
			type: "expense",
			group_level1: "Educação e Filhos",
			group_level2: "",
			group_code: "5.0",
			code: "",
			description: "Escolaridade, cursos extracurriculares, materiais didáticos e logística escolar.",
			color: "#0284C7",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_5_1",
			user_id: defaultUser.id,
			name: "Escolaridade Básica",
			type: "expense",
			group_level1: "Educação e Filhos",
			group_level2: "Escolaridade Básica",
			group_code: "5.0",
			code: "5.1",
			description: "Mensalidades de creche, educação infantil, ensino fundamental ou médio.",
			icon: "GraduationCap",
			color: "#3B82F6",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_5_2",
			user_id: defaultUser.id,
			name: "Atividades Extracurriculares",
			type: "expense",
			group_level1: "Educação e Filhos",
			group_level2: "Atividades Extracurriculares",
			group_code: "5.0",
			code: "5.2",
			description: "Cursos de idiomas, reforço escolar, modalidades esportivas infantis ou artes.",
			icon: "BookOpen",
			color: "#6366F1",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_5_3",
			user_id: defaultUser.id,
			name: "Materiais e Uniformes",
			type: "expense",
			group_level1: "Educação e Filhos",
			group_level2: "Materiais e Uniformes",
			group_code: "5.0",
			code: "5.3",
			description: "Provisão para listas de material didático anual, mochilas, livros e peças de uniforme.",
			icon: "Backpack",
			color: "#8B5CF6",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_5_4",
			user_id: defaultUser.id,
			name: "Logística Escolar",
			type: "expense",
			group_level1: "Educação e Filhos",
			group_level2: "Logística Escolar",
			group_code: "5.0",
			code: "5.4",
			description: "Mensalidade de transporte escolar contratado (van) e verba de cantina/lanche.",
			icon: "Bus",
			color: "#F59E0B",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_grp_6",
			user_id: defaultUser.id,
			name: "Gastos Pessoais",
			type: "expense",
			group_level1: "Gastos Pessoais",
			group_level2: "",
			group_code: "6.0",
			code: "",
			description: "Cuidados estéticos, cosméticos, higiene, vestuário e verba livre individual.",
			color: "#0284C7",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_6_1",
			user_id: defaultUser.id,
			name: "Cuidados e Estética",
			type: "expense",
			group_level1: "Gastos Pessoais",
			group_level2: "Cuidados e Estética",
			group_code: "6.0",
			code: "6.1",
			description: "Cabeleireiro, barbearia, manicure, podologia e tratamentos estéticos.",
			icon: "Scissors",
			color: "#EC4899",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_6_2",
			user_id: defaultUser.id,
			name: "Cosméticos e Higiene",
			type: "expense",
			group_level1: "Gastos Pessoais",
			group_level2: "Cosméticos e Higiene",
			group_code: "6.0",
			code: "6.2",
			description: "Perfumaria, protetor solar, dermocosméticos e cuidados individuais diários.",
			icon: "Sparkles",
			color: "#F43F5E",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_6_3",
			user_id: defaultUser.id,
			name: "Vestuário e Calçados",
			type: "expense",
			group_level1: "Gastos Pessoais",
			group_level2: "Vestuário e Calçados",
			group_code: "6.0",
			code: "6.3",
			description: "Aquisição periódica de roupas, calçados e peças básicas para adultos e crianças.",
			icon: "ShoppingBag",
			color: "#EA580C",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_6_4",
			user_id: defaultUser.id,
			name: "Verba Livre Individual",
			type: "expense",
			group_level1: "Gastos Pessoais",
			group_level2: "Verba Livre Individual",
			group_code: "6.0",
			code: "6.4",
			description: "Cota mensal de livre disposição para cada cônjuge e dependentes (sem prestação de contas).",
			icon: "Wallet",
			color: "#64748B",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_grp_7",
			user_id: defaultUser.id,
			name: "Lazer e Convivência",
			type: "expense",
			group_level1: "Lazer e Convivência",
			group_level2: "",
			group_code: "7.0",
			code: "",
			description: "Gastronomia social, passeios, assinaturas digitais e fundo de viagens.",
			color: "#0284C7",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_7_1",
			user_id: defaultUser.id,
			name: "Gastronomia Social",
			type: "expense",
			group_level1: "Lazer e Convivência",
			group_level2: "Gastronomia Social",
			group_code: "7.0",
			code: "7.1",
			description: "Jantares, almoços de lazer em família, cafés especiais e pedidos de delivery (iFood).",
			icon: "Utensils",
			color: "#E11D48",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_7_2",
			user_id: defaultUser.id,
			name: "Assinaturas e Digitais",
			type: "expense",
			group_level1: "Lazer e Convivência",
			group_level2: "Assinaturas e Digitais",
			group_code: "7.0",
			code: "7.2",
			description: "Streaming de vídeo/música, armazenamento em nuvem, apps e telefonia celular móvel.",
			icon: "Tv",
			color: "#D97706",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_7_3",
			user_id: defaultUser.id,
			name: "Passeios e Cultura",
			type: "expense",
			group_level1: "Lazer e Convivência",
			group_level2: "Passeios e Cultura",
			group_code: "7.0",
			code: "7.3",
			description: "Ingressos de cinema, shows, teatro, exposições e lazer de final de semana.",
			icon: "Ticket",
			color: "#9333EA",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_7_4",
			user_id: defaultUser.id,
			name: "Fundo de Viagens",
			type: "expense",
			group_level1: "Lazer e Convivência",
			group_level2: "Fundo de Viagens",
			group_code: "7.0",
			code: "7.4",
			description: "Poupança mensal destinada a passagens, hospedagem e despesas em viagens de férias.",
			icon: "Plane",
			color: "#7C3AED",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_grp_8",
			user_id: defaultUser.id,
			name: "Financeiro e Fiscal",
			type: "expense",
			group_level1: "Financeiro e Fiscal",
			group_level2: "",
			group_code: "8.0",
			code: "",
			description: "Tarifas bancárias, encargos de cartão de crédito e serviços contábeis.",
			color: "#0284C7",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_8_1",
			user_id: defaultUser.id,
			name: "Encargos e Tarifas",
			type: "expense",
			group_level1: "Financeiro e Fiscal",
			group_level2: "Encargos e Tarifas",
			group_code: "8.0",
			code: "8.1",
			description: "Anuidades de cartão de crédito, tarifas de conta bancária e encargos operacionais.",
			icon: "CreditCard",
			color: "#DC2626",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_8_2",
			user_id: defaultUser.id,
			name: "Serviços Contábeis",
			type: "expense",
			group_level1: "Financeiro e Fiscal",
			group_level2: "Serviços Contábeis",
			group_code: "8.0",
			code: "8.2",
			description: "Honorários profissionais para elaboração de Declaração de IRPF e taxas correlatas.",
			icon: "Calculator",
			color: "#4B5563",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_grp_9",
			user_id: defaultUser.id,
			name: "Projetos e Obras (CapEx)",
			type: "expense",
			group_level1: "Projetos e Obras (CapEx)",
			group_level2: "",
			group_code: "9.0",
			code: "",
			description: "Investimentos patrimoniais em construção, reformas, infraestrutura e mobiliário planejado.",
			color: "#0284C7",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_9_1",
			user_id: defaultUser.id,
			name: "Projetos e Alvarás",
			type: "expense",
			group_level1: "Projetos e Obras (CapEx)",
			group_level2: "Projetos e Alvarás",
			group_code: "9.0",
			code: "9.1",
			description: "Projetos de arquitetura, engenharia, cálculos estruturais, taxas de habite-se e licenças.",
			icon: "Compass",
			color: "#0284C7",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_9_2",
			user_id: defaultUser.id,
			name: "Mão de Obra de Construção",
			type: "expense",
			group_level1: "Projetos e Obras (CapEx)",
			group_level2: "Mão de Obra de Construção",
			group_code: "9.0",
			code: "9.2",
			description: "Empreiteiros, pedreiros, armadores, eletricistas, encanadores e pintores da obra.",
			icon: "HardHat",
			color: "#D97706",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_9_3",
			user_id: defaultUser.id,
			name: "Materiais Estruturais",
			type: "expense",
			group_level1: "Projetos e Obras (CapEx)",
			group_level2: "Materiais Estruturais",
			group_code: "9.0",
			code: "9.3",
			description: "Cimento, ferro, areia, brita, blocos cerâmicos, lajes, telhas, rufos e estruturas de telhado.",
			icon: "Boxes",
			color: "#78716C",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_9_4",
			user_id: defaultUser.id,
			name: "Infraestrutura Elétrica/Hidráulica",
			type: "expense",
			group_level1: "Projetos e Obras (CapEx)",
			group_level2: "Infraestrutura Elétrica/Hidráulica",
			group_code: "9.0",
			code: "9.4",
			description: "Tubos e conexões pesadas, conduítes, fiação geral, quadros de distribuição e disjuntores.",
			icon: "Zap",
			color: "#EA580C",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_9_5",
			user_id: defaultUser.id,
			name: "Acabamento e Revestimentos",
			type: "expense",
			group_level1: "Projetos e Obras (CapEx)",
			group_level2: "Acabamento e Revestimentos",
			group_code: "9.0",
			code: "9.5",
			description: "Porcelanatos, argamassas, rejuntes, tintas, louças sanitárias, torneiras e iluminação técnica.",
			icon: "Paintbrush",
			color: "#059669",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_9_6",
			user_id: defaultUser.id,
			name: "Esquadrias e Fachada",
			type: "expense",
			group_level1: "Projetos e Obras (CapEx)",
			group_level2: "Esquadrias e Fachada",
			group_code: "9.0",
			code: "9.6",
			description: "Portas de madeira, janelas, blindex/vidros, portões basculantes e esquadrias de alumínio.",
			icon: "DoorOpen",
			color: "#475569",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_9_7",
			user_id: defaultUser.id,
			name: "Marcenaria Sob Medida",
			type: "expense",
			group_level1: "Projetos e Obras (CapEx)",
			group_level2: "Marcenaria Sob Medida",
			group_code: "9.0",
			code: "9.7",
			description: "Armários planejados para cozinha, quartos, painéis de sala, lavanderia e bancadas.",
			icon: "Hammer",
			color: "#92400E",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_9_8",
			user_id: defaultUser.id,
			name: "Mobília Solta e Eletros",
			type: "expense",
			group_level1: "Projetos e Obras (CapEx)",
			group_level2: "Mobília Solta e Eletros",
			group_code: "9.0",
			code: "9.8",
			description: "Sofá, mesas de jantar, camas, colchões, geladeira, ar-condicionado e eletrodomésticos.",
			icon: "Armchair",
			color: "#6D28D9",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_grp_10",
			user_id: defaultUser.id,
			name: "Investimentos e Patrimônio",
			type: "expense",
			group_level1: "Investimentos e Patrimônio",
			group_level2: "",
			group_code: "10.0",
			code: "",
			description: "Blindagem financeira, reserva de emergência, metas patrimoniais e aposentadoria.",
			color: "#0284C7",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_10_1",
			user_id: defaultUser.id,
			name: "Reserva de Emergência",
			type: "expense",
			group_level1: "Investimentos e Patrimônio",
			group_level2: "Reserva de Emergência",
			group_code: "10.0",
			code: "10.1",
			description: "Aporte em instrumentos de alta liquidez até atingir a blindagem do custo fixo familiar.",
			icon: "ShieldCheck",
			color: "#8B5CF6",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_10_2",
			user_id: defaultUser.id,
			name: "Metas de Médio Prazo",
			type: "expense",
			group_level1: "Investimentos e Patrimônio",
			group_level2: "Metas de Médio Prazo",
			group_code: "10.0",
			code: "10.2",
			description: "Poupança para troca programada de veículo, reformas futuras ou entradas de patrimônio.",
			icon: "Target",
			color: "#6366F1",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_sub_10_3",
			user_id: defaultUser.id,
			name: "Longo Prazo / Aposentadoria",
			type: "expense",
			group_level1: "Investimentos e Patrimônio",
			group_level2: "Longo Prazo / Aposentadoria",
			group_code: "10.0",
			code: "10.3",
			description: "Aportes consistentes em previdência, títulos públicos (IPCA+) e carteira de ações/FIIs.",
			icon: "PiggyBank",
			color: "#059669",
			status: "active",
			created: nowIso,
			updated: nowIso
		}
	];
	return {
		users: [defaultUser],
		families: [defaultFamily],
		accounts: seededAccounts,
		categories: seededCategories,
		transactions: [],
		budgets: [],
		debts: [],
		dreams: [],
		depara_rules: [],
		invoices: [],
		payments: []
	};
}
var AUTH_STORE_STORAGE_KEY = "gestio_financas_auth_session";
var VAULT_LOCKED_KEY = "gestio_vault_locked";
var defaultLocalUser = {
	id: "usr_local",
	email: "usuario@local.app",
	name: "Minhas Finanças",
	created: (/* @__PURE__ */ new Date()).toISOString(),
	updated: (/* @__PURE__ */ new Date()).toISOString()
};
var MockAuthStore = class {
	isValid = true;
	token = "mock_jwt_local_vault";
	record = defaultLocalUser;
	listeners = [];
	constructor(initialUser) {
		if (typeof window !== "undefined") {
			if (localStorage.getItem(VAULT_LOCKED_KEY) === "true") {
				this.record = null;
				this.token = "";
				this.isValid = false;
				return;
			}
			try {
				const stored = localStorage.getItem(AUTH_STORE_STORAGE_KEY);
				if (stored) {
					const parsed = JSON.parse(stored);
					if (parsed && parsed.record && parsed.token) {
						this.record = parsed.record;
						this.token = parsed.token;
						this.isValid = true;
						return;
					}
				}
			} catch {}
		}
		this.record = initialUser !== void 0 ? initialUser : defaultLocalUser;
		this.token = this.record ? "mock_jwt_local_vault" : "";
		this.isValid = !!this.record;
	}
	save(token, record) {
		this.token = token;
		this.record = record;
		this.isValid = true;
		if (typeof window !== "undefined") try {
			localStorage.removeItem(VAULT_LOCKED_KEY);
			localStorage.setItem(AUTH_STORE_STORAGE_KEY, JSON.stringify({
				token: this.token,
				record: this.record
			}));
		} catch {}
		this.notify();
	}
	clear() {
		this.token = "";
		this.record = null;
		this.isValid = false;
		if (typeof window !== "undefined") try {
			localStorage.setItem(VAULT_LOCKED_KEY, "true");
			localStorage.removeItem(AUTH_STORE_STORAGE_KEY);
		} catch {}
		this.notify();
	}
	onChange(callback) {
		this.listeners.push(callback);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== callback);
		};
	}
	notify() {
		for (const cb of this.listeners) try {
			cb();
		} catch (err) {
			console.warn("AuthStore listener error:", err);
		}
	}
};
var MockPocketBase = class {
	baseUrl = "";
	authStore;
	collections = {};
	subscriptions = {};
	constructor() {
		const initial = createInitialData();
		for (const [col, defaultRecords] of Object.entries(initial)) this.collections[col] = getStored(col, defaultRecords);
		this.initFromIndexedDb(initial);
		if (!this.collections.accounts || this.collections.accounts.length === 0) {
			this.collections.accounts = [...initial.accounts];
			this.persist("accounts");
		}
		if (!this.collections.categories || this.collections.categories.length === 0) {
			this.collections.categories = [...initial.categories];
			this.persist("categories");
		}
		this.authStore = new MockAuthStore(defaultLocalUser);
		const CATEGORIES_MIGRATION_KEY = "gestio_financas_categories_planilha_oficial_v9_force_sync";
		if (typeof window !== "undefined" && !localStorage.getItem(CATEGORIES_MIGRATION_KEY)) {
			this.migrateLegacyCategoriesToErpPlan(initial.categories);
			localStorage.setItem(CATEGORIES_MIGRATION_KEY, "true");
		}
	}
	async initFromIndexedDb(initial) {
		if (typeof window === "undefined") return;
		try {
			for (const col of STORES) {
				if (col === "vault_meta") continue;
				const records = await indexedDbStore.getAll(col);
				if (records && records.length > 0) this.collections[col] = records;
				else if (initial[col] && initial[col].length > 0) {
					this.collections[col] = [...initial[col]];
					for (const item of initial[col]) await indexedDbStore.put(col, item).catch(() => {});
				}
			}
			for (const key of [
				"transactions",
				"accounts",
				"debts",
				"dreams",
				"budgets",
				"depara_rules"
			]) localStorage.removeItem(STORAGE_PREFIX + key);
		} catch (err) {
			console.warn("[LocalStore] Inicialização IndexedDB fallback:", err);
		}
	}
	migrateLegacyCategoriesToErpPlan(officialCategories) {
		const cats = this.collections.categories || [];
		const groupNameMapping = {
			"Alimentação e Mercado": "Alimentação e Despensa",
			"Custos Fixos": "Habitação e Moradia",
			"Estilo de Vida": "Lazer e Bem-Estar",
			"Despesas Financeiras": "Serviços Financeiros",
			"Dívidas": "Serviços Financeiros",
			"Dívidas e Empréstimos": "Serviços Financeiros",
			"Investimentos": "Obrigações e Investimentos",
			"Investimentos e Sonhos": "Obrigações e Investimentos"
		};
		const officialIdSet = new Set(officialCategories.map((c) => c.id));
		const officialCodeMap = /* @__PURE__ */ new Map();
		for (const off of officialCategories) if (off.code) officialCodeMap.set(off.code, off);
		const userCustom = [];
		for (const c of cats) if (!officialIdSet.has(c.id) && !officialCodeMap.has(c.code) && !c.id.startsWith("cat_grp_") && !c.id.startsWith("cat_sub_") && !c.id.startsWith("cat_salario") && !c.id.startsWith("cat_mercado") && !c.id.startsWith("cat_restaurantes") && !c.id.startsWith("cat_aluguel") && !c.id.startsWith("cat_energia") && !c.id.startsWith("cat_transporte") && !c.id.startsWith("cat_saude") && !c.id.startsWith("cat_telecom") && !c.id.startsWith("cat_vestuario")) {
			const mappedGroup = groupNameMapping[c.group_level1] || c.group_level1;
			userCustom.push({
				...c,
				group_level1: mappedGroup
			});
		}
		this.collections.categories = [...officialCategories, ...userCustom];
		this.persist("categories");
	}
	clearAllTransactions() {
		this.collections.transactions = [];
		this.collections.invoices = [];
		this.collections.payments = [];
		this.persist("transactions");
		this.persist("invoices");
		this.persist("payments");
		if (this.collections.accounts) {
			for (const a of this.collections.accounts) a.current_balance = a.initial_balance ?? 0;
			this.persist("accounts");
		}
		this.emit("transactions", "delete", {
			id: "*",
			created: "",
			updated: ""
		});
	}
	autoCancellation(_flag) {}
	persist(col) {
		if (typeof window !== "undefined") {
			const records = this.collections[col] || [];
			for (const r of records) if (r && r.id) indexedDbStore.put(col, r).catch(() => {});
		}
	}
	async persistRecord(col, record) {
		if (typeof window !== "undefined") try {
			await indexedDbStore.put(col, record);
		} catch (err) {
			console.warn(`[IndexedDB] Falha ao persistir registro em ${col}:`, err);
		}
	}
	async deleteRecord(col, id) {
		if (typeof window !== "undefined") try {
			await indexedDbStore.delete(col, id);
		} catch (err) {
			console.warn(`[IndexedDB] Falha ao excluir registro de ${col}:`, err);
		}
	}
	emit(col, action, record) {
		const subs = this.subscriptions[col] || [];
		const wildSubs = this.subscriptions["*"] || [];
		const event = {
			action,
			record
		};
		for (const fn of [...subs, ...wildSubs]) try {
			fn(event);
		} catch (e) {
			console.warn("Realtime event error:", e);
		}
	}
	getCollectionRecords(name) {
		return this.collections[name] || [];
	}
	collection(name) {
		if (!this.collections[name]) this.collections[name] = getStored(name, []);
		return {
			getFullList: async (options) => {
				let items = [...this.collections[name] || []];
				items = this.applyFilter(name, items, options?.filter);
				items = this.applySort(items, options?.sort);
				if (options?.expand) items = items.map((item) => this.expandRecord(name, item, options.expand));
				return items;
			},
			getList: async (page = 1, perPage = 30, options) => {
				let items = [...this.collections[name] || []];
				items = this.applyFilter(name, items, options?.filter);
				items = this.applySort(items, options?.sort);
				const totalItems = items.length;
				const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
				const start = (page - 1) * perPage;
				const paginated = items.slice(start, start + perPage);
				return {
					items: options?.expand ? paginated.map((item) => this.expandRecord(name, item, options.expand)) : paginated,
					page,
					perPage,
					totalItems,
					totalPages
				};
			},
			getOne: async (id, options) => {
				const found = this.collections[name]?.find((r) => r.id === id);
				if (!found) throw new Error(`Record with id '${id}' not found in collection '${name}'.`);
				return options?.expand ? this.expandRecord(name, found, options.expand) : found;
			},
			getFirstListItem: async (filter, options) => {
				let items = [...this.collections[name] || []];
				items = this.applyFilter(name, items, filter);
				if (items.length === 0) throw new Error(`No record found matching filter '${filter}' in collection '${name}'.`);
				const found = items[0];
				return options?.expand ? this.expandRecord(name, found, options.expand) : found;
			},
			create: async (data, options) => {
				const id = data.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
				const nowIso = (/* @__PURE__ */ new Date()).toISOString();
				const newRecord = {
					...data,
					id,
					created: nowIso,
					updated: nowIso
				};
				this.collections[name].unshift(newRecord);
				await this.persistRecord(name, newRecord);
				this.emit(name, "create", newRecord);
				return options?.expand ? this.expandRecord(name, newRecord, options.expand) : newRecord;
			},
			update: async (id, data, options) => {
				const index = this.collections[name].findIndex((r) => r.id === id);
				if (index === -1) throw new Error(`Record '${id}' not found to update in '${name}'.`);
				const updated = {
					...this.collections[name][index],
					...data,
					id,
					updated: (/* @__PURE__ */ new Date()).toISOString()
				};
				this.collections[name][index] = updated;
				await this.persistRecord(name, updated);
				this.emit(name, "update", updated);
				return options?.expand ? this.expandRecord(name, updated, options.expand) : updated;
			},
			delete: async (id) => {
				const rec = this.collections[name].find((r) => r.id === id);
				this.collections[name] = this.collections[name].filter((r) => r.id !== id);
				await this.deleteRecord(name, id);
				if (rec) this.emit(name, "delete", rec);
				return true;
			},
			authWithPassword: async (email, _password) => {
				let user = this.collections.users?.find((u) => u.email === email);
				if (!user) {
					user = {
						id: email === "visitante@gestio.app" || email === "demo@gestio.app" ? "usr_convidado_demo" : "usr_" + Date.now(),
						email,
						name: email === "visitante@gestio.app" || email === "demo@gestio.app" ? "Convidado (Demonstração)" : email.split("@")[0],
						created: (/* @__PURE__ */ new Date()).toISOString(),
						updated: (/* @__PURE__ */ new Date()).toISOString()
					};
					this.collections.users.push(user);
					this.persist("users");
				}
				this.authStore.save("mock_jwt_" + user.id, user);
				return {
					token: this.authStore.token,
					record: user
				};
			},
			requestPasswordReset: async (_email) => {
				return true;
			},
			subscribe: async (topic, callback) => {
				const key = topic === "*" ? name : `${name}/${topic}`;
				if (!this.subscriptions[key]) this.subscriptions[key] = [];
				this.subscriptions[key].push(callback);
				return async () => {
					this.subscriptions[key] = this.subscriptions[key].filter((fn) => fn !== callback);
				};
			},
			unsubscribe: async (topic) => {
				const key = !topic || topic === "*" ? name : `${name}/${topic}`;
				delete this.subscriptions[key];
			}
		};
	}
	async send(path, options) {
		const method = (options?.method || "GET").toUpperCase();
		const body = options?.body || {};
		if (path === "/backend/v1/transfers" && method === "POST") {
			const { source_account_id, target_account_id, amount, date, description, notes } = body;
			const accounts = this.collections.accounts || [];
			const srcAcc = accounts.find((a) => a.id === source_account_id);
			const tgtAcc = accounts.find((a) => a.id === target_account_id);
			if (srcAcc) srcAcc.current_balance = (srcAcc.current_balance ?? srcAcc.initial_balance ?? 0) - amount;
			if (tgtAcc) tgtAcc.current_balance = (tgtAcc.current_balance ?? tgtAcc.initial_balance ?? 0) + amount;
			this.persist("accounts");
			return {
				id: (await this.collection("transactions").create({
					user_id: this.authStore.record?.id,
					account_id: source_account_id,
					transfer_account_id: target_account_id,
					amount,
					type: "transfer",
					date: date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
					competence_month: (date || (/* @__PURE__ */ new Date()).toISOString()).slice(0, 7),
					cash_month: (date || (/* @__PURE__ */ new Date()).toISOString()).slice(0, 7),
					description: description || "Transferência entre contas",
					notes
				})).id,
				amount
			};
		}
		if (path === "/backend/v1/invoices" && method === "POST") {
			const { card_account_id, reference_month } = body;
			const card = this.collections.accounts?.find((a) => a.id === card_account_id);
			const cardTxs = (this.collections.transactions || []).filter((t) => t.account_id === card_account_id && t.type === "expense" && t.cash_month === reference_month);
			const totalAmount = cardTxs.reduce((sum, t) => sum + (t.amount || 0), 0);
			let existing = this.collections.invoices?.find((inv) => inv.card_account_id === card_account_id && inv.reference_month === reference_month);
			if (existing) {
				existing.total_amount = totalAmount;
				existing.items_count = cardTxs.length;
				existing.updated = (/* @__PURE__ */ new Date()).toISOString();
				this.persist("invoices");
				return this.expandRecord("invoices", existing, "card_account_id,payment_account_id");
			} else {
				const created = await this.collection("invoices").create({
					user_id: this.authStore.record?.id,
					card_account_id,
					reference_month,
					total_amount: totalAmount,
					items_count: cardTxs.length,
					status: "open",
					due_date: `${reference_month}-${String(card?.due_day || 10).padStart(2, "0")}`
				});
				return this.expandRecord("invoices", created, "card_account_id,payment_account_id");
			}
		}
		if (path === "/backend/v1/invoice-movements" && method === "POST") {
			const { invoice_id, payment_account_id, paid_date, amount, notes } = body;
			const invoice = this.collections.invoices?.find((i) => i.id === invoice_id);
			const paymentAcc = this.collections.accounts?.find((a) => a.id === payment_account_id);
			const payAmount = amount || invoice?.total_amount || 0;
			if (paymentAcc) {
				paymentAcc.current_balance = (paymentAcc.current_balance ?? paymentAcc.initial_balance ?? 0) - payAmount;
				this.persist("accounts");
			}
			if (invoice) {
				invoice.status = "paid";
				invoice.paid_date = paid_date;
				invoice.payment_account_id = payment_account_id;
				this.persist("invoices");
			}
			return {
				movement_id: (await this.collection("transactions").create({
					user_id: this.authStore.record?.id,
					account_id: payment_account_id,
					invoice_id,
					amount: payAmount,
					type: "invoice_payment",
					date: paid_date,
					competence_month: paid_date.slice(0, 7),
					cash_month: paid_date.slice(0, 7),
					description: `Pagamento Fatura ${invoice?.reference_month || ""}`,
					notes
				})).id,
				invoice_id,
				amount: payAmount
			};
		}
		if (path.startsWith("/backend/v1/invoice-movements/") && method === "DELETE") {
			const movementId = path.split("/").pop();
			const tx = this.collections.transactions?.find((t) => t.id === movementId);
			if (tx) {
				if (tx.invoice_id) {
					const inv = this.collections.invoices?.find((i) => i.id === tx.invoice_id);
					if (inv) {
						inv.status = "open";
						delete inv.paid_date;
						delete inv.payment_account_id;
						this.persist("invoices");
					}
				}
				if (tx.account_id) {
					const acc = this.collections.accounts?.find((a) => a.id === tx.account_id);
					if (acc) {
						acc.current_balance = (acc.current_balance ?? acc.initial_balance ?? 0) + tx.amount;
						this.persist("accounts");
					}
				}
				await this.collection("transactions").delete(tx.id);
			}
			return { ok: true };
		}
		if (path === "/backend/v1/invoice-payments" && method === "POST") {
			const { source_transaction_id, installment_index, amount, cash_month, paid_date, payment_account_id, card_account_id, notes } = body;
			const payAcc = this.collections.accounts?.find((a) => a.id === payment_account_id);
			if (payAcc) {
				payAcc.current_balance = (payAcc.current_balance ?? payAcc.initial_balance ?? 0) - amount;
				this.persist("accounts");
			}
			const tx = this.collections.transactions?.find((t) => t.id === source_transaction_id);
			if (tx) {
				tx.installments_paid = (tx.installments_paid || 0) + 1;
				this.persist("transactions");
			}
			return await this.collection("payments").create({
				user_id: this.authStore.record?.id,
				source_transaction_id,
				installment_index,
				amount,
				cash_month,
				paid_date,
				payment_account_id,
				card_account_id,
				notes
			});
		}
		if (path.startsWith("/backend/v1/invoice-payments/") && method === "DELETE") {
			const paymentId = path.split("/").pop();
			const pmt = this.collections.payments?.find((p) => p.id === paymentId);
			if (pmt) {
				if (pmt.payment_account_id) {
					const acc = this.collections.accounts?.find((a) => a.id === pmt.payment_account_id);
					if (acc) {
						acc.current_balance = (acc.current_balance ?? acc.initial_balance ?? 0) + pmt.amount;
						this.persist("accounts");
					}
				}
				if (pmt.source_transaction_id) {
					const tx = this.collections.transactions?.find((t) => t.id === pmt.source_transaction_id);
					if (tx && (tx.installments_paid || 0) > 0) {
						tx.installments_paid = Math.max(0, (tx.installments_paid || 1) - 1);
						this.persist("transactions");
					}
				}
				await this.collection("payments").delete(paymentId);
			}
			return { ok: true };
		}
		if (path === "/backend/v1/invoice-item-exclude" && method === "POST") {
			const { invoice_id, transaction_id, installment_index, notes } = body;
			const invoice = this.collections.invoices?.find((i) => i.id === invoice_id);
			const tx = this.collections.transactions?.find((t) => t.id === transaction_id);
			const refMonth = invoice?.reference_month || "";
			const [yy, mm] = (refMonth || "2026-11").split("-").map(Number);
			const t = yy * 12 + (mm - 1) + 1;
			const deferMonth = `${Math.floor(t / 12)}-${String(t % 12 + 1).padStart(2, "0")}`;
			if (!this.collections.invoice_adjustments) this.collections.invoice_adjustments = [];
			const adj = {
				id: "adj_" + Date.now(),
				user_id: this.authStore.record?.id,
				family_id: invoice?.family_id,
				transaction_id,
				installment_index: installment_index || 0,
				action: "exclude",
				amount: tx?.amount || 0,
				invoice_month: refMonth,
				defer_month: deferMonth,
				invoice_id,
				notes,
				resolved: false,
				created: (/* @__PURE__ */ new Date()).toISOString(),
				updated: (/* @__PURE__ */ new Date()).toISOString()
			};
			this.collections.invoice_adjustments.push(adj);
			this.persist("invoice_adjustments");
			return {
				invoice_id,
				reference_month: refMonth,
				total_amount: invoice?.total_amount || 0,
				items_count: 0,
				items: [],
				deferred_month: deferMonth
			};
		}
		if (path === "/backend/v1/invoice-item-value" && method === "POST") {
			const { invoice_id, transaction_id, installment_index, value, notes } = body;
			const invoice = this.collections.invoices?.find((i) => i.id === invoice_id);
			const refMonth = invoice?.reference_month || "";
			if (!this.collections.invoice_adjustments) this.collections.invoice_adjustments = [];
			const adj = {
				id: "adj_" + Date.now(),
				user_id: this.authStore.record?.id,
				family_id: invoice?.family_id,
				transaction_id,
				installment_index: installment_index || 0,
				action: "set_value",
				amount: Number(value) || 0,
				invoice_month: refMonth,
				invoice_id,
				notes,
				resolved: false,
				created: (/* @__PURE__ */ new Date()).toISOString(),
				updated: (/* @__PURE__ */ new Date()).toISOString()
			};
			this.collections.invoice_adjustments.push(adj);
			this.persist("invoice_adjustments");
			if (invoice) {
				invoice.total_amount = Number(value) || 0;
				this.persist("invoices");
			}
			return {
				invoice_id,
				reference_month: refMonth,
				total_amount: Number(value) || 0,
				items_count: 1,
				items: []
			};
		}
		if (path.startsWith("/backend/v1/invoice-adjustments")) return this.collections.invoice_adjustments || [];
		if (path.startsWith("/api/skip/connectors")) return [];
		return {};
	}
	applyFilter(col, items, filterStr) {
		if (!filterStr || !filterStr.trim()) return items;
		return items.filter((record) => {
			return this.evaluateExpression(record, filterStr.trim());
		});
	}
	evaluateExpression(record, expr) {
		if (expr.startsWith("(") && expr.endsWith(")")) expr = expr.slice(1, -1).trim();
		if (expr.includes(" || ")) return expr.split(" || ").some((p) => this.evaluateExpression(record, p.trim()));
		if (expr.includes(" && ")) return expr.split(" && ").every((p) => this.evaluateExpression(record, p.trim()));
		const equalMatch = expr.match(/^([\w.]+)\s*=\s*['"]?([^'"]*)['"]?$/);
		if (equalMatch) {
			const [, key, val] = equalMatch;
			return String(record[key] ?? "") === val;
		}
		const notEqualMatch = expr.match(/^([\w.]+)\s*!=\s*['"]?([^'"]*)['"]?$/);
		if (notEqualMatch) {
			const [, key, val] = notEqualMatch;
			return String(record[key] ?? "") !== val;
		}
		return true;
	}
	applySort(items, sortStr) {
		if (!sortStr || !sortStr.trim()) return items;
		const criteria = sortStr.split(",").map((s) => s.trim());
		return [...items].sort((a, b) => {
			for (const crit of criteria) {
				const desc = crit.startsWith("-");
				const field = desc ? crit.slice(1) : crit;
				const valA = a[field] ?? "";
				const valB = b[field] ?? "";
				if (valA < valB) return desc ? 1 : -1;
				if (valA > valB) return desc ? -1 : 1;
			}
			return 0;
		});
	}
	expandRecord(col, record, expandStr) {
		const expanded = {
			...record,
			expand: { ...record.expand || {} }
		};
		const relations = expandStr.split(",").map((s) => s.trim());
		for (const rel of relations) if (rel === "category_id" && record.category_id) expanded.expand.category_id = this.collections.categories?.find((c) => c.id === record.category_id);
		else if (rel === "account_id" && record.account_id) expanded.expand.account_id = this.collections.accounts?.find((a) => a.id === record.account_id);
		else if (rel === "card_account_id" && record.card_account_id) expanded.expand.card_account_id = this.collections.accounts?.find((a) => a.id === record.card_account_id);
		else if (rel === "payment_account_id" && record.payment_account_id) expanded.expand.payment_account_id = this.collections.accounts?.find((a) => a.id === record.payment_account_id);
		else if (rel === "source_transaction_id" && record.source_transaction_id) expanded.expand.source_transaction_id = this.collections.transactions?.find((t) => t.id === record.source_transaction_id);
		return expanded;
	}
};
//#endregion
//#region src/lib/pocketbase/client.ts
/**
* PocketBase Client — Modo 100% Local e Privado (Zero-Knowledge Privacy)
* Garante que nenhum dado financeiro de terceiros ou testadores seja transmitido para servidores remotos.
* Todos os registros (transações, contas, orçamentos, faturas, sonhos e dívidas) residem
* exclusivamente no armazenamento local seguro (localStorage) do próprio aparelho do usuário.
*/
var pb = new MockPocketBase();
pb.autoCancellation(false);
//#endregion
//#region scripts/export-complete-json.ts
async function generateCompleteJson() {
	const schemaPath = path.resolve(process.cwd(), "src/lib/pocketbase/schema.json");
	const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
	const collections = {};
	for (const col of schema.collections.map((c) => c.name)) collections[col] = (typeof pb.getCollectionRecords === "function" ? pb.getCollectionRecords(col) : []) || [];
	const nowIso = (/* @__PURE__ */ new Date()).toISOString();
	const completeAppJson = {
		metadata: {
			app: "GestioFinancasPro",
			name: "Gestio Finanças Pro — Sistema PWA Offline-First",
			version: "0.0.66",
			schemaVersion: 1,
			exportedAt: nowIso,
			architecture: {
				client: "React 19 + TypeScript + Vite + Tailwind CSS + Shadcn UI",
				storageEngine: "IndexedDB (GestioFinancas_DB_v1) + localStorage (preferências visuais)",
				cryptography: "AES-GCM (256-bit) + PBKDF2 (SHA-256, 100.000 iterações)",
				executionModel: "100% Offline-First / Zero-Knowledge (Client-Side Only)",
				multiFormatParsers: [
					"OFX (Bancos Brasileiros)",
					"Excel (.xlsx, .xls)",
					"CSV (UTF-8, Latin1)",
					"PDF Textual"
				]
			},
			counts: Object.fromEntries(Object.entries(collections).map(([k, v]) => [k, v.length]))
		},
		databaseSchema: schema,
		initialData: collections,
		backupFormat: {
			formatDescription: "Formato compatível com restauração atômica no cofre local do Gestio Finanças",
			metadata: {
				app: "GestioFinancasPro",
				version: "0.0.66",
				schemaVersion: 1,
				createdAt: nowIso,
				deviceInfo: "Gestio Finanças Standalone Export",
				isEncrypted: false,
				counts: Object.fromEntries(Object.entries(collections).map(([k, v]) => [k, v.length]))
			},
			data: collections
		}
	};
	const outputDir = process.cwd();
	const outputPath = path.resolve(outputDir, "Gestio_Financas_Completo.json");
	const publicPath = path.resolve(outputDir, "public/Gestio_Financas_Completo.json");
	const distPath = path.resolve(outputDir, "dist/Gestio_Financas_Completo.json");
	const artifactsDir = "C:\\Users\\Rogerio Coimbra\\.gemini\\antigravity\\brain\\751a8d2f-5908-46dc-b0d8-98d98e26dd50";
	const artifactPath = path.resolve(artifactsDir, "Gestio_Financas_Completo.json");
	const jsonString = JSON.stringify(completeAppJson, null, 2);
	fs.writeFileSync(outputPath, jsonString, "utf-8");
	fs.writeFileSync(publicPath, jsonString, "utf-8");
	if (fs.existsSync(path.resolve(outputDir, "dist"))) fs.writeFileSync(distPath, jsonString, "utf-8");
	if (fs.existsSync(artifactsDir)) fs.writeFileSync(artifactPath, jsonString, "utf-8");
	console.log("✅ Arquivo JSON completo gerado com sucesso!");
	console.log("Tamanho:", (jsonString.length / 1024).toFixed(2), "KB");
	console.log("Total de coleções:", Object.keys(collections).length);
	for (const [k, v] of Object.entries(collections)) console.log(`  - ${k}: ${v.length} registros`);
}
generateCompleteJson().catch((err) => {
	console.error("Erro ao gerar JSON:", err);
	process.exit(1);
});
//#endregion
export {};
