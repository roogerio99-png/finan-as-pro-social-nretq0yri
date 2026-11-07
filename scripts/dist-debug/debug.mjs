import { ClientResponseError } from "pocketbase";
//#region src/lib/pocketbase/mockStore.ts
var STORAGE_PREFIX = "gestio_financas_pb_";
function getStored(key, defaultValue) {
	try {
		const raw = localStorage.getItem(STORAGE_PREFIX + key);
		if (raw) return JSON.parse(raw);
	} catch {}
	return defaultValue;
}
function setStored(key, value) {
	try {
		localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
	} catch {}
}
function createInitialData() {
	const nowIso = (/* @__PURE__ */ new Date()).toISOString();
	nowIso.slice(0, 7);
	const defaultUser = {
		id: "usr_rogerio",
		email: "roogerio99@gmail.com",
		name: "Rogério Coimbra",
		verified: true,
		created: nowIso,
		updated: nowIso
	};
	const defaultFamily = {
		id: "fam_silva",
		name: "Família Coimbra",
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
			id: "cat_salario",
			user_id: defaultUser.id,
			name: "Salário Principal",
			type: "income",
			group_level1: "Receitas",
			group_level2: "Renda Ativa",
			subgroup_level3: "Salário CLT",
			icon: "Briefcase",
			color: "#16A34A",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_dividendos",
			user_id: defaultUser.id,
			name: "Rendimentos e Dividendos",
			type: "income",
			group_level1: "Receitas",
			group_level2: "Renda Passiva",
			subgroup_level3: "Investimentos",
			icon: "TrendingUp",
			color: "#059669",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_freela",
			user_id: defaultUser.id,
			name: "Freela & Extras",
			type: "income",
			group_level1: "Receitas",
			group_level2: "Renda Extra",
			subgroup_level3: "Serviços",
			icon: "PlusCircle",
			color: "#10B981",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_aluguel",
			user_id: defaultUser.id,
			name: "Aluguel & Condomínio",
			type: "expense",
			group_level1: "Custos Fixos",
			group_level2: "Habitação",
			subgroup_level3: "Moradia",
			icon: "Home",
			color: "#2563EB",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_energia",
			user_id: defaultUser.id,
			name: "Energia, Água & Gás",
			type: "expense",
			group_level1: "Custos Fixos",
			group_level2: "Habitação",
			subgroup_level3: "Utilidades",
			icon: "Zap",
			color: "#3B82F6",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_mercado",
			user_id: defaultUser.id,
			name: "Supermercado Mensal",
			type: "expense",
			group_level1: "Custos Fixos",
			group_level2: "Alimentação",
			subgroup_level3: "Feira e Mercado",
			icon: "ShoppingCart",
			color: "#0284C7",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_saude",
			user_id: defaultUser.id,
			name: "Plano de Saúde",
			type: "expense",
			group_level1: "Custos Fixos",
			group_level2: "Saúde",
			subgroup_level3: "Convênio",
			icon: "HeartPulse",
			color: "#0EA5E9",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_telecom",
			user_id: defaultUser.id,
			name: "Internet e Celular",
			type: "expense",
			group_level1: "Custos Fixos",
			group_level2: "Comunicação",
			subgroup_level3: "Telecom",
			icon: "Wifi",
			color: "#06B6D4",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_restaurantes",
			user_id: defaultUser.id,
			name: "Restaurantes e Delivery",
			type: "expense",
			group_level1: "Estilo de Vida",
			group_level2: "Lazer & Alimentação",
			subgroup_level3: "Ifood & Jantares",
			icon: "Utensils",
			color: "#F59E0B",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_streaming",
			user_id: defaultUser.id,
			name: "Streaming & Assinaturas",
			type: "expense",
			group_level1: "Estilo de Vida",
			group_level2: "Lazer",
			subgroup_level3: "Netflix/Spotify",
			icon: "Tv",
			color: "#D97706",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_transporte",
			user_id: defaultUser.id,
			name: "Combustível e Uber",
			type: "expense",
			group_level1: "Estilo de Vida",
			group_level2: "Transporte",
			subgroup_level3: "Locomoção",
			icon: "Car",
			color: "#B45309",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_vestuario",
			user_id: defaultUser.id,
			name: "Vestuário e Compras",
			type: "expense",
			group_level1: "Estilo de Vida",
			group_level2: "Pessoal",
			subgroup_level3: "Roupas",
			icon: "ShoppingBag",
			color: "#EA580C",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_reserva_sonho",
			user_id: defaultUser.id,
			name: "Aporte Reserva de Emergência",
			type: "expense",
			group_level1: "Investimentos e Sonhos",
			group_level2: "Segurança",
			subgroup_level3: "Tesouro Selic",
			icon: "ShieldCheck",
			color: "#8B5CF6",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_viagem_sonho",
			user_id: defaultUser.id,
			name: "Aporte Viagem de Férias",
			type: "expense",
			group_level1: "Investimentos e Sonhos",
			group_level2: "Metas",
			subgroup_level3: "Eurotrip 2026",
			icon: "Plane",
			color: "#7C3AED",
			status: "active",
			created: nowIso,
			updated: nowIso
		},
		{
			id: "cat_divida_parcela",
			user_id: defaultUser.id,
			name: "Parcela Renegociação Empréstimo",
			type: "expense",
			group_level1: "Dívidas",
			group_level2: "Bancário",
			subgroup_level3: "Empréstimo Pessoal",
			icon: "CreditCard",
			color: "#DC2626",
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
var MockAuthStore = class {
	isValid = true;
	token = "mock_jwt_token_gestio_financas";
	record = null;
	listeners = [];
	constructor(initialUser) {
		this.record = initialUser;
		this.isValid = !!initialUser;
	}
	save(token, record) {
		if (record && (record.email === "roogerio99@gmail.com" || record.name === "Rogério Silva")) record.name = "Rogério Coimbra";
		this.token = token;
		this.record = record;
		this.isValid = true;
		this.notify();
	}
	clear() {
		this.token = "";
		this.record = null;
		this.isValid = false;
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
		if (this.collections.users) {
			let usersMigrated = false;
			for (const u of this.collections.users) if (u.email === "roogerio99@gmail.com" || u.name === "Rogério Silva") {
				u.name = "Rogério Coimbra";
				usersMigrated = true;
			}
			if (usersMigrated) this.persist("users");
		}
		if (this.collections.families) {
			let famMigrated = false;
			for (const f of this.collections.families) if (f.name === "Família Silva") {
				f.name = "Família Coimbra";
				famMigrated = true;
			}
			if (famMigrated) this.persist("families");
		}
		const defaultUser = this.collections.users?.[0] || null;
		if (defaultUser && (defaultUser.email === "roogerio99@gmail.com" || defaultUser.name === "Rogério Silva")) defaultUser.name = "Rogério Coimbra";
		this.authStore = new MockAuthStore(defaultUser);
		const PURGE_TX_KEY = "pocketbase_mock_transactions_cleared_for_real_data_v2";
		if (typeof window !== "undefined" && !localStorage.getItem(PURGE_TX_KEY)) {
			this.clearAllTransactions();
			localStorage.setItem(PURGE_TX_KEY, "true");
		}
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
		setStored(col, this.collections[col] || []);
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
				this.persist(name);
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
				this.persist(name);
				this.emit(name, "update", updated);
				return options?.expand ? this.expandRecord(name, updated, options.expand) : updated;
			},
			delete: async (id) => {
				const rec = this.collections[name].find((r) => r.id === id);
				this.collections[name] = this.collections[name].filter((r) => r.id !== id);
				this.persist(name);
				if (rec) this.emit(name, "delete", rec);
				return true;
			},
			authWithPassword: async (email, _password) => {
				let user = this.collections.users?.find((u) => u.email === email);
				if (!user) {
					user = {
						id: "usr_" + Date.now(),
						email,
						name: email === "roogerio99@gmail.com" ? "Rogério Coimbra" : email.split("@")[0],
						created: (/* @__PURE__ */ new Date()).toISOString(),
						updated: (/* @__PURE__ */ new Date()).toISOString()
					};
					this.collections.users.push(user);
					this.persist("users");
				} else if (user.email === "roogerio99@gmail.com" || user.name === "Rogério Silva") {
					user.name = "Rogério Coimbra";
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
//#region src/lib/pocketbase/errors.ts
function extractFieldErrors(error) {
	if (!(error instanceof ClientResponseError)) return {};
	const data = error.response?.data;
	if (!data || typeof data !== "object") return {};
	const errors = {};
	for (const [field, detail] of Object.entries(data)) if (detail && typeof detail === "object" && "message" in detail && typeof detail.message === "string") errors[field] = detail.message;
	return errors;
}
function getErrorMessage(error) {
	if (!(error instanceof ClientResponseError)) return error instanceof Error ? error.message : "An unexpected error occurred.";
	const msgs = Object.values(extractFieldErrors(error));
	return msgs.length > 0 ? msgs.join(" ") : error.message || "An unexpected error occurred.";
}
//#endregion
//#region src/services/categories.ts
var categoriesService = {
	async getAll() {
		return await this.list();
	},
	async list(options) {
		const filter = pb.authStore.record ? `user_id = '${pb.authStore.record.id}' || user_id = '' || user_id = 'usr_rogerio'` : "";
		const records = await pb.collection("categories").getFullList({
			filter: filter || void 0,
			sort: "group_level1,group_level2,name"
		});
		if (options?.includeInactive) return records;
		return records.filter((c) => (c.status ?? "active") === "active");
	},
	/** Payload base para criar categoria: sempre user_id do usuário logado e
	* family_id do seu núcleo (a regra de create exige vínculo com a família —
	* sem family_id a criação é recusada quando o auth não tem family_id). */
	async create(data) {
		const payload = {
			...data,
			user_id: pb.authStore.record?.id,
			family_id: data.family_id ?? pb.authStore.record?.family_id ?? ""
		};
		return await pb.collection("categories").create(payload);
	},
	async update(id, data) {
		return await pb.collection("categories").update(id, data);
	},
	async delete(id) {
		return await pb.collection("categories").delete(id);
	},
	/** Cria uma nova linha do plano de contas (grupo nível 1 ou subgrupo nível 2). */
	async createNode(data) {
		const userId = pb.authStore.record?.id;
		if (!userId) throw new Error("Sua sessão expirou. Faça login novamente para criar grupos ou subgrupos.");
		const payload = {
			...data,
			user_id: userId,
			family_id: data.family_id ?? pb.authStore.record?.family_id ?? "",
			status: data.status || "active"
		};
		try {
			return await pb.collection("categories").create(payload);
		} catch (err) {
			throw new Error(getErrorMessage(err));
		}
	},
	/** Ativa/inativa uma lista de registros do plano de contas (inativação preserva o histórico). */
	async setActive(ids, status) {
		if (ids.length === 0) return;
		try {
			await Promise.all(ids.map((id) => pb.collection("categories").update(id, { status })));
		} catch (err) {
			throw new Error(getErrorMessage(err));
		}
	},
	/** Exclui definitivamente uma lista de IDs do plano de contas */
	async deleteNodes(ids) {
		if (ids.length === 0) return;
		try {
			await Promise.all(ids.map((id) => pb.collection("categories").delete(id)));
		} catch (err) {
			throw new Error(getErrorMessage(err));
		}
	},
	/**
	* Renomeia todos os registros que compartilham o mesmo rótulo de grupo/subgrupo.
	* Busca a lista fresca do banco (o estado da tela pode estar defasado) e retorna
	* quantos registros foram alterados — 0 significa que nenhum rótulo foi encontrado,
	* o que o chamador deve tratar como erro (não como sucesso silencioso).
	*/
	async renameLabel(field, oldValue, newValue, parentGroup) {
		if (!oldValue || !newValue || oldValue === newValue) return 0;
		const fresh = await this.list({ includeInactive: true });
		const targets = (parentGroup ? fresh.filter((c) => (c.group_level1 || "") === parentGroup) : fresh).filter((c) => oldValue === "Sem grupo" ? !(c[field] || "") : (c[field] || "") === oldValue);
		if (targets.length === 0) return 0;
		try {
			await Promise.all(targets.map((c) => {
				const patch = { [field]: newValue };
				if ((c.name || "") === oldValue && !c.subgroup_level3) patch.name = newValue;
				return pb.collection("categories").update(c.id, patch);
			}));
			return targets.length;
		} catch (err) {
			throw new Error(getErrorMessage(err));
		}
	},
	/**
	* Grava código e descrição do plano de contas no nó informado (edição completa
	* do grupo/subgrupo). Esses metadados vivem no registro canônico do nó —
	* grupo: linha sem group_level2; subgrupo: linha sem subgroup_level3.
	* Registros antigos sem canônico (ex.: "Renda Ativa") ganham um na primeira
	* edição, sempre com user_id + family_id do authStore (padrão da criação).
	*/
	async updateNodeMeta(opts) {
		const fresh = await this.list({ includeInactive: true });
		const rows = fresh.filter((c) => c.type === opts.type);
		const inScope = opts.level === 1 ? rows.filter((c) => opts.label === "Sem grupo" ? !(c.group_level1 || "") : (c.group_level1 || "") === opts.label) : rows.filter((c) => (c.group_level1 || "") === (opts.parent || "") && (c.group_level2 || "") === opts.label);
		const canonical = opts.level === 1 ? inScope.find((c) => !c.group_level2 && !c.subgroup_level3) : inScope.find((c) => !c.subgroup_level3);
		const patch = { description: opts.description || "" };
		if (opts.level === 1) patch.group_code = opts.code || "";
		else patch.code = opts.code || "";
		try {
			if (canonical) {
				await pb.collection("categories").update(canonical.id, patch);
				if (opts.level === 1) {
					const others = inScope.filter((c) => c.id !== canonical.id);
					await Promise.all(others.map((c) => pb.collection("categories").update(c.id, { group_code: patch.group_code })));
				}
				return;
			}
			if (opts.level === 1 && opts.label === "Sem grupo") {
				await Promise.all(inScope.map((c) => pb.collection("categories").update(c.id, patch)));
				return;
			}
			if (opts.level === 1) await this.createNode({
				name: opts.label,
				type: opts.type,
				group_level1: opts.label,
				group_level2: "",
				group_code: opts.code || "",
				code: "",
				description: opts.description || "",
				status: "active",
				color: opts.type === "income" ? "#059669" : "#0284C7"
			});
			else {
				const parentRec = fresh.find((c) => c.type === opts.type && (c.group_level1 || "") === (opts.parent || "") && !c.group_level2 && !c.subgroup_level3);
				await this.createNode({
					name: opts.label,
					type: opts.type,
					group_level1: opts.parent || "",
					group_level2: opts.label,
					group_code: parentRec?.group_code || "",
					code: opts.code || "",
					description: opts.description || "",
					status: "active",
					color: parentRec?.color || (opts.type === "income" ? "#10B981" : "#06B6D4")
				});
			}
		} catch (err) {
			throw new Error(getErrorMessage(err));
		}
	},
	/** Converte o plano de contas em árvore: grupos (nível 1) -> subgrupos (nível 2) -> categorias. */
	buildTree(all, type) {
		const rows = all.filter((c) => c.type === type);
		return Array.from(new Set(rows.map((c) => c.group_level1 || "Sem grupo"))).map((g) => {
			const groupRows = rows.filter((c) => (c.group_level1 || "Sem grupo") === g);
			return {
				name: g,
				category: groupRows.find((c) => !c.group_level2 && !c.subgroup_level3),
				subgroups: Array.from(new Set(groupRows.filter((c) => c.group_level2).map((c) => c.group_level2))).map((s) => {
					const subRows = groupRows.filter((c) => c.group_level2 === s);
					return {
						name: s,
						category: subRows.find((c) => !c.subgroup_level3),
						leaves: subRows.filter((c) => c.subgroup_level3)
					};
				})
			};
		});
	}
};
//#endregion
//#region src/services/accounts.ts
var accountsService = {
	async list(familyId, options) {
		const filter = familyId ? `family_id = '${familyId}' || user_id = '${pb.authStore.record?.id}'` : `user_id = '${pb.authStore.record?.id}'`;
		let records = await pb.collection("accounts").getFullList({
			filter: pb.authStore.record ? filter : "",
			sort: "-created"
		});
		if (records.length === 0) try {
			records = [await this.create({
				name: "Conta Corrente Principal",
				type: "checking",
				initial_balance: 0,
				current_balance: 0,
				color: "#059669",
				status: "active"
			}), await this.create({
				name: "Cartão de Crédito",
				type: "credit_card",
				initial_balance: 0,
				current_balance: 0,
				credit_limit: 5e3,
				closing_day: 25,
				due_day: 5,
				color: "#7C3AED",
				status: "active"
			})];
		} catch {}
		if (options?.includeArchived) return records;
		return records.filter((a) => (a.status ?? "active") === "active");
	},
	async getAll() {
		return await this.list();
	},
	async create(data) {
		const payload = {
			...data,
			user_id: pb.authStore.record?.id,
			status: data.status || "active",
			initial_balance: data.initial_balance || 0
		};
		return await pb.collection("accounts").create(payload);
	},
	async update(id, data) {
		return await pb.collection("accounts").update(id, data);
	},
	async delete(id) {
		return await pb.collection("accounts").delete(id);
	},
	calculateCashDueDate(dateStr, closingDay, dueDay) {
		if (!closingDay || !dueDay) return dateStr.slice(0, 7);
		const date = new Date(dateStr);
		const day = date.getDate();
		let month = date.getMonth();
		let year = date.getFullYear();
		if (day > closingDay) month += 1;
		if (dueDay < closingDay) month += 1;
		return new Date(year, month, dueDay).toISOString().slice(0, 7);
	}
};
//#endregion
//#region src/components/cadastros/categoriesTree.ts
var isNumericCode = (c) => !!c && /^\d+(\.\d+)*$/.test(c);
/** Chave de ordenação numérica de um código ERP ("1.3" -> [1,3]); códigos
* livres (não numéricos) e ausentes vão para o fim da lista. */
var codeKey = (code) => {
	if (!isNumericCode(code)) return [Number.MAX_SAFE_INTEGER];
	return code.split(".").map((p) => parseInt(p, 10) || 0);
};
var compareCodes = (a, b) => {
	const ka = codeKey(a);
	const kb = codeKey(b);
	const len = Math.max(ka.length, kb.length);
	for (let i = 0; i < len; i++) {
		const d = (ka[i] ?? 0) - (kb[i] ?? 0);
		if (d !== 0) return d;
	}
	return 0;
};
var isActive = (c) => (c.status ?? "active") === "active";
/** Agrupa os registros em grupos (nível 1) e subgrupos (nível 2), ordenados
* pelo código ERP numérico; legados sem código ficam ao fim. */
var buildGroups = (all, type) => {
	const rows = all.filter((c) => c.type === type);
	const map = /* @__PURE__ */ new Map();
	for (const r of rows) {
		const key = r.group_level1 || "Sem grupo";
		if (!map.has(key)) map.set(key, []);
		map.get(key).push(r);
	}
	const groups = Array.from(map.entries()).map(([name, items]) => {
		const record = items.find((i) => !i.group_level2 && !i.subgroup_level3);
		const groupCode = record?.group_code || items.find((i) => i.group_code)?.group_code;
		const subMap = /* @__PURE__ */ new Map();
		for (const it of items) {
			if (it === record) continue;
			const sk = it.group_level2 || "";
			if (!subMap.has(sk)) subMap.set(sk, []);
			subMap.get(sk).push(it);
		}
		const subgroups = Array.from(subMap.entries()).map(([sName, sItems]) => ({
			key: sName || "(sem subgrupo)",
			name: sName,
			record: sItems.find((i) => !i.subgroup_level3) || sItems[0],
			items: sItems,
			status: sItems.some(isActive) ? "active" : "inactive"
		}));
		subgroups.sort((a, b) => compareCodes(a.record?.code, b.record?.code));
		return {
			key: name,
			name,
			record,
			items,
			subgroups,
			groupCode,
			description: record?.description || "",
			status: items.some(isActive) ? "active" : "inactive"
		};
	});
	groups.sort((a, b) => {
		const byCode = compareCodes(a.groupCode, b.groupCode);
		if (byCode !== 0) return byCode;
		return a.name.localeCompare(b.name, "pt-BR");
	});
	return groups;
};
//#endregion
//#region scripts/debug-selects.ts
async function test() {
	console.log("--- TESTANDO CATEGORIAS E CONTAS ---");
	const cats = await categoriesService.getAll();
	console.log("Total de categorias carregadas:", cats.length);
	const groups = buildGroups(cats, "expense");
	console.log("Total de grupos de despesa:", groups.length);
	for (const g of groups) {
		console.log(`Grupo: "${g.name}" | groupCode: "${g.groupCode}" | subgroups: ${g.subgroups.length} | recordId:`, g.record?.id);
		for (const s of g.subgroups) console.log(`   -> Sub: "${s.name}" | recordId:`, s.record?.id);
	}
	const accs = await accountsService.getAll();
	console.log("Total de contas:", accs.length);
	for (const a of accs) console.log(`Conta: "${a.name}" | tipo: ${a.type} | id: ${a.id}`);
}
test().catch(console.error);
//#endregion
export {};
