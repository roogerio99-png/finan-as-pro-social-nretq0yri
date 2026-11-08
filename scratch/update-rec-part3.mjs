import fs from 'fs'

let code = fs.readFileSync('src/pages/ReconciliationPage.tsx', 'utf8')

// 1. Atualizar o bloco superior: PASSO 1 e PASSO 2
const oldTopHeader = `      {/* Top Header & Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={\`flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border transition-all \${
          isDragOver
            ? 'border-emerald-500 bg-emerald-50/40 ring-4 ring-emerald-100 shadow-md'
            : 'border-slate-200 shadow-xs'
        }\`}
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Conciliação & De-Para
            </h1>
            {detectedBadge && (
              <span
                className={\`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border shadow-xs \${
                  detectedDocType === 'invoice'
                    ? 'bg-purple-100 text-purple-900 border-purple-200'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                }\`}
              >
                {detectedDocType === 'invoice' ? (
                  <CreditCard className="w-3.5 h-3.5 text-purple-700" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                )}
                {detectedBadge}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Importe <strong>Extratos Bancários</strong> ou <strong>Faturas de Cartão</strong> nos
            formatos <strong>OFX</strong>, <strong>PDF</strong>, <strong>Excel (XLSX)</strong> ou <strong>CSV</strong> (Nubank, Banco
            do Brasil, Mercado Pago, Itaú, Santander, Bradesco, etc.). Detecção automática do banco,
            parcelas, identificadores e bloqueio de duplicatas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (typeof window !== 'undefined' && 'caches' in window) {
                try {
                  const keys = await caches.keys()
                  await Promise.all(keys.map((k) => caches.delete(k)))
                } catch {
                  // ignore
                }
              }
              window.location.reload()
            }}
            title="Limpar cache do navegador e carregar a versão mais recente publicada"
            className="text-xs text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 hover:text-indigo-900 gap-1 rounded-xl h-11 px-3 border border-indigo-200 font-semibold transition-all shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin-hover" />
            Atualizar App
          </Button>

          <Button
            variant="outline"
            onClick={handleLoadSampleStatement}
            disabled={parsingPdf}
            className="text-xs text-emerald-800 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 gap-1.5 h-11 px-3"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Carregar Exemplo
          </Button>

          <label className={\`cursor-pointer \${parsingPdf ? 'pointer-events-none opacity-60' : ''}\`}>
            <input
              type="file"
              accept=".ofx,.csv,.tsv,.txt,.pdf,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              disabled={parsingPdf}
            />
            <div className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-colors h-11 cursor-pointer">
              {parsingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Lendo documento...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" /> Importar OFX / PDF / Excel / CSV
                </>
              )}
            </div>
          </label>
        </div>
      </div>`

const newTopHeader = `      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Conciliação & De-Para
            </h1>
            {detectedBadge && (
              <span
                className={\`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border shadow-xs \${
                  detectedDocType === 'invoice'
                    ? 'bg-purple-100 text-purple-900 border-purple-200'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                }\`}
              >
                {detectedDocType === 'invoice' ? (
                  <CreditCard className="w-3.5 h-3.5 text-purple-700" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                )}
                {detectedBadge}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Importe <strong>Extratos Bancários</strong> ou <strong>Faturas de Cartão</strong> nos
            formatos <strong>OFX</strong>, <strong>PDF</strong>, <strong>Excel (XLSX)</strong> ou <strong>CSV</strong> (Nubank, Banco
            do Brasil, Mercado Pago, Itaú, Santander, Bradesco, etc.).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (typeof window !== 'undefined' && 'caches' in window) {
                try {
                  const keys = await caches.keys()
                  await Promise.all(keys.map((k) => caches.delete(k)))
                } catch {
                  // ignore
                }
              }
              window.location.reload()
            }}
            title="Limpar cache do navegador e carregar a versão mais recente publicada"
            className="text-xs text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 hover:text-indigo-900 gap-1 rounded-xl h-10 px-3 border border-indigo-200 font-semibold transition-all shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin-hover" />
            Atualizar App
          </Button>

          <Button
            variant="outline"
            onClick={handleLoadSampleStatement}
            disabled={parsingPdf}
            className="text-xs text-emerald-800 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 gap-1.5 h-10 px-3"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Carregar Exemplo
          </Button>
        </div>
      </div>

      {/* PASSO 1: Escolha da Conta Bancária ou Cartão */}
      <Card className="border-slate-200 shadow-xs rounded-2xl bg-white p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0 mt-0.5">
              1
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">
                  Escolha a Conta Bancária ou Cartão deste Extrato
                </h2>
                {selectedAccountId && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Conta Ativa
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Primeiro, escolha de qual conta se refere o extrato. Se o arquivo contiver dados do banco ou agência/conta, faremos a sugestão automática.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              id="topAccountSelect"
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value)
                setSuggestedAccountMessage(null)
              }}
              className="h-10 text-xs font-bold bg-slate-50 border border-slate-300 hover:border-emerald-500 text-slate-900 rounded-xl px-3.5 shadow-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none min-w-[240px] transition-all cursor-pointer"
            >
              <option value="" disabled>-- Selecione a conta --</option>
              {accounts
                .filter((a) => a.status !== 'archived')
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} {acc.type === 'credit_card' ? '(Cartão de Crédito)' : acc.type === 'savings' ? '(Poupança)' : '(Conta Corrente)'}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {suggestedAccountMessage && (
          <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{suggestedAccountMessage}</span>
          </div>
        )}
      </Card>

      {/* PASSO 2: Envie o Arquivo do Extrato ou Fatura */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={\`flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border transition-all \${
          isDragOver
            ? 'border-emerald-500 bg-emerald-50/40 ring-4 ring-emerald-100 shadow-md'
            : 'border-slate-200 shadow-xs'
        }\`}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0 mt-0.5">
            2
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Envie o Extrato ou Fatura
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Arraste e solte o arquivo aqui ou clique no botão para selecionar (OFX, PDF, XLSX ou CSV).
            </p>
          </div>
        </div>

        <label className={\`cursor-pointer shrink-0 \${parsingPdf ? 'pointer-events-none opacity-60' : ''}\`}>
          <input
            type="file"
            accept=".ofx,.csv,.tsv,.txt,.pdf,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            disabled={parsingPdf}
          />
          <div className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-colors h-11 cursor-pointer">
            {parsingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Lendo documento...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" /> Importar OFX / PDF / Excel / CSV
              </>
            )}
          </div>
        </label>
      </div>`

code = code.replace(oldTopHeader, newTopHeader)

// 2. Mobile Cards: Transferência e Valor
const oldMobileTransfer = `{line.type === 'transfer' ? (
                      <div className="space-y-1">
                        <Select
                          value={line.transfer_account_id || ''}
                          onValueChange={(val) => handleUpdateLineTransferAccount(line.id, val)}
                        >
                          <SelectTrigger className="h-8 text-xs font-medium border-blue-200 bg-blue-50/70 text-blue-900 rounded-lg w-full">
                            <SelectValue placeholder="Selecione conta destino..." />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts
                              .filter((a) => a.id !== selectedAccountId && a.status !== 'archived')
                              .map((acc) => (
                                <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                  {acc.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                          <ArrowRightLeft className="w-2.5 h-2.5" /> Movimentação neutra de saldo
                        </span>
                      </div>
                    )`

const newMobileTransfer = `{line.type === 'transfer' ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-blue-700 flex items-center gap-1">
                            {line.direction === 'in' ? (
                              <>
                                <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                                Conta de Origem (De onde veio):
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-3 h-3 text-blue-600" />
                                Conta de Destino (Para onde foi):
                              </>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleLineDirection(line.id)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 underline font-semibold"
                          >
                            {line.direction === 'in' ? 'Mudar p/ Saída' : 'Mudar p/ Entrada'}
                          </button>
                        </div>
                        <Select
                          value={line.transfer_account_id || ''}
                          onValueChange={(val) => handleUpdateLineTransferAccount(line.id, val)}
                        >
                          <SelectTrigger className="h-8 text-xs font-medium border-blue-200 bg-blue-50/70 text-blue-900 rounded-lg w-full">
                            <SelectValue
                              placeholder={
                                line.direction === 'in'
                                  ? 'Selecione conta de origem...'
                                  : 'Selecione conta de destino...'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts
                              .filter((a) => a.id !== selectedAccountId && a.status !== 'archived')
                              .map((acc) => (
                                <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                  {acc.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                          {line.direction === 'in' ? (
                            <>
                              <ArrowDownRight className="w-2.5 h-2.5 text-emerald-600" />
                              Entrando em: <strong>{accounts.find(a => a.id === selectedAccountId)?.name || 'Conta do Extrato'}</strong>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-2.5 h-2.5 text-blue-600" />
                              Saindo de: <strong>{accounts.find(a => a.id === selectedAccountId)?.name || 'Conta do Extrato'}</strong>
                            </>
                          )}
                        </span>
                      </div>
                    )`

code = code.replace(oldMobileTransfer, newMobileTransfer)

// 3. Desktop Table: Transferência e Rótulo
const oldDesktopTransfer = `{line.type === 'transfer' ? (
                        <div className="space-y-1">
                          <Select
                            value={line.transfer_account_id || ''}
                            onValueChange={(val) => handleUpdateLineTransferAccount(line.id, val)}
                          >
                            <SelectTrigger className="h-8 text-xs font-medium border-blue-200 bg-blue-50/70 text-blue-900 rounded-lg max-w-[220px]">
                              <SelectValue placeholder="Selecione conta destino..." />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts
                                .filter((a) => a.id !== selectedAccountId && a.status !== 'archived')
                                .map((acc) => (
                                  <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                    {acc.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
                            <ArrowRightLeft className="w-2.5 h-2.5" /> Movimentação neutra de saldo
                          </p>
                        </div>
                      )`

const newDesktopTransfer = `{line.type === 'transfer' ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-blue-700 flex items-center gap-1">
                              {line.direction === 'in' ? (
                                <>
                                  <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                                  Origem (De onde veio):
                                </>
                              ) : (
                                <>
                                  <ArrowUpRight className="w-3 h-3 text-blue-600" />
                                  Destino (Para onde foi):
                                </>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleLineDirection(line.id)}
                              className="text-[10px] text-blue-600 hover:text-blue-800 underline font-semibold"
                              title="Alternar sentido da transferência"
                            >
                              {line.direction === 'in' ? 'Mudar p/ Saída' : 'Mudar p/ Entrada'}
                            </button>
                          </div>
                          <Select
                            value={line.transfer_account_id || ''}
                            onValueChange={(val) => handleUpdateLineTransferAccount(line.id, val)}
                          >
                            <SelectTrigger className="h-8 text-xs font-medium border-blue-200 bg-blue-50/70 text-blue-900 rounded-lg max-w-[230px]">
                              <SelectValue
                                placeholder={
                                  line.direction === 'in'
                                    ? 'Selecione conta de origem...'
                                    : 'Selecione conta destino...'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts
                                .filter((a) => a.id !== selectedAccountId && a.status !== 'archived')
                                .map((acc) => (
                                  <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                    {acc.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                            {line.direction === 'in' ? (
                              <>
                                <ArrowDownRight className="w-2.5 h-2.5 text-emerald-600" />
                                Entrando em <strong>{accounts.find(a => a.id === selectedAccountId)?.name || 'Conta do Extrato'}</strong>
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="w-2.5 h-2.5 text-blue-600" />
                                Saindo de <strong>{accounts.find(a => a.id === selectedAccountId)?.name || 'Conta do Extrato'}</strong>
                              </>
                            )}
                          </p>
                        </div>
                      )`

code = code.replace(oldDesktopTransfer, newDesktopTransfer)

fs.writeFileSync('src/pages/ReconciliationPage.tsx', code)
console.log('Update part 3 completed successfully!')
