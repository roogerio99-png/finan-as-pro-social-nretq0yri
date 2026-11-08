import fs from 'fs'

let code = fs.readFileSync('src/pages/ReconciliationPage.tsx', 'utf8')

// 1. Estado
if (!code.includes('suggestedAccountMessage')) {
  code = code.replace(
    'const [savingLineId, setSavingLineId] = useState<string | null>(null)',
    'const [savingLineId, setSavingLineId] = useState<string | null>(null)\n  const [suggestedAccountMessage, setSuggestedAccountMessage] = useState<string | null>(null)'
  )
}

// 2. Localizar findMatchingAccountId existente
const startIdx = code.indexOf('  // Localiza automaticamente a conta bancária ou cartão que melhor corresponde ao extrato')
const endTarget = '    return undefined\n  }'
const endIdx = code.indexOf(endTarget, startIdx) + endTarget.length

if (startIdx !== -1 && endIdx !== -1) {
  const newFindMatching = `  // Localiza automaticamente a conta bancária ou cartão que melhor corresponde ao extrato
  const findMatchingAccountId = (
    bankName: string | undefined,
    docType: 'invoice' | 'statement' | undefined,
    acctId: string | undefined,
    fileName?: string,
  ): string | undefined => {
    const active = accounts.filter((a) => a.status !== 'archived')
    if (active.length === 0) return undefined

    // 1. Se for fatura de cartão de crédito
    if (docType === 'invoice') {
      if (bankName) {
        const match = active.find(
          (a) => a.type === 'credit_card' && a.name.toLowerCase().includes(bankName.toLowerCase()),
        )
        if (match) return match.id
      }
      const anyCard = active.find((a) => a.type === 'credit_card')
      if (anyCard) return anyCard.id
    }

    // 2. Por número da conta bancária
    if (acctId) {
      const cleanId = acctId.replace(/[-]/g, '').trim()
      if (cleanId) {
        const match = active.find((a) => a.name.replace(/[-]/g, '').includes(cleanId))
        if (match) return match.id
      }
    }

    // 3. Por nome do banco ou nome do arquivo
    const searchTarget = \`\${bankName || ''} \${fileName || ''}\`.toLowerCase()
    if (searchTarget.trim()) {
      const match = active.find((a) => {
        const nameLower = a.name.toLowerCase()
        if (searchTarget.includes('nubank') || searchTarget.includes('nu_') || searchTarget.includes('nu pagamentos')) {
          return nameLower.includes('nubank') || nameLower.includes('nu')
        }
        if (searchTarget.includes('banco do brasil') || searchTarget.includes('bco do brasil') || searchTarget.includes('bb')) {
          return nameLower.includes('brasil') || nameLower.includes('bb')
        }
        if (searchTarget.includes('mercado pago')) {
          return nameLower.includes('mercado pago') || nameLower.includes('mp')
        }
        if (searchTarget.includes('santander')) return nameLower.includes('santander')
        if (searchTarget.includes('itaú') || searchTarget.includes('itau')) return nameLower.includes('itau')
        if (searchTarget.includes('bradesco')) return nameLower.includes('bradesco')
        if (searchTarget.includes('inter')) return nameLower.includes('inter')
        if (searchTarget.includes('c6')) return nameLower.includes('c6')
        return bankName ? nameLower.includes(bankName.toLowerCase()) : false
      })
      if (match) return match.id
    }

    return undefined
  }

  const applyAccountMatch = (
    result: { bank?: string; document_type?: 'invoice' | 'statement'; acctId?: string; badge?: string },
    fileName?: string,
  ) => {
    const matchedAccId = findMatchingAccountId(result.bank, result.document_type, result.acctId, fileName)
    if (matchedAccId) {
      setSelectedAccountId(matchedAccId)
      const matched = accounts.find((a) => a.id === matchedAccId)
      if (matched) {
        const msg = \`Extrato identificado: "\${result.bank || result.badge || 'banco'}" • Conta vinculada: "\${matched.name}"\`
        setSuggestedAccountMessage(msg)
        toast({
          title: 'Conta identificada automaticamente!',
          description: \`Identificamos os dados do banco no extrato e selecionamos a conta "\${matched.name}". Você pode trocá-la se desejar.\`,
        })
      }
    }
  }`

  code = code.slice(0, startIdx) + newFindMatching + code.slice(endIdx)
}

// 3. Substituir chamadas nos 4 pontos de leitura
code = code.replace(
  /const matchedAccId = findMatchingAccountId\(result\.bank, result\.document_type, result\.acctId\)[\s\S]*?setSelectedAccountId\(matchedAccId\)[\s\S]*?\}/g,
  'applyAccountMatch(result, file.name)'
)

// 4. processExtractedLines direction
code = code.replace(
  'const descLower = item.desc.toLowerCase()',
  'let initialDirection: \'in\' | \'out\' = item.direction || (item.type === \'income\' ? \'in\' : \'out\')\n      const descLower = item.desc.toLowerCase()'
)

code = code.replace(
  'transfer_account_id: initialTransferAccId,',
  'transfer_account_id: initialTransferAccId,\n        direction: initialDirection,'
)

// 5. handleUpdateLineType e handleToggleLineDirection
const oldUpdateType = `  const handleUpdateLineType = (lineId: string, newType: TransactionType) => {
    setImportLines((prev) =>
      prev.map((item) => {
        if (item.id !== lineId) return item
        let transferId = item.transfer_account_id
        if (newType === 'transfer' && !transferId) {
          const other = accounts.find((a) => a.id !== selectedAccountId && a.status !== 'archived')
          if (other) transferId = other.id
        } else if (newType === 'invoice_payment' && !transferId) {
          const card = accounts.find((a) => a.type === 'credit_card' && a.status !== 'archived')
          if (card) transferId = card.id
        }
        return {
          ...item,
          type: newType,
          transfer_account_id: transferId,
          // se virou transferência ou quitação de fatura, remove obrigatoriedade de categoria
          selected_category_id:
            newType === 'transfer' || newType === 'invoice_payment'
              ? ''
              : item.selected_category_id || item.suggested_category_id || '',
        }
      }),
    )
  }`

const newUpdateType = `  const handleUpdateLineType = (lineId: string, newType: TransactionType) => {
    setImportLines((prev) =>
      prev.map((item) => {
        if (item.id !== lineId) return item
        let transferId = item.transfer_account_id
        if (newType === 'transfer' && !transferId) {
          const other = accounts.find((a) => a.id !== selectedAccountId && a.status !== 'archived')
          if (other) transferId = other.id
        } else if (newType === 'invoice_payment' && !transferId) {
          const card = accounts.find((a) => a.type === 'credit_card' && a.status !== 'archived')
          if (card) transferId = card.id
        }
        const newDirection = newType === 'income' ? 'in' : newType === 'expense' ? 'out' : item.direction || 'out'
        return {
          ...item,
          type: newType,
          direction: newDirection,
          transfer_account_id: transferId,
          selected_category_id:
            newType === 'transfer' || newType === 'invoice_payment'
              ? ''
              : item.selected_category_id || item.suggested_category_id || '',
        }
      }),
    )
  }

  const handleToggleLineDirection = (lineId: string) => {
    setImportLines((prev) =>
      prev.map((item) => {
        if (item.id !== lineId) return item
        const nextDir = item.direction === 'in' ? 'out' : 'in'
        return {
          ...item,
          direction: nextDir,
          type:
            item.type === 'transfer' || item.type === 'invoice_payment'
              ? item.type
              : nextDir === 'in'
              ? 'income'
              : 'expense',
        }
      }),
    )
  }`

code = code.replace(oldUpdateType, newUpdateType)

fs.writeFileSync('src/pages/ReconciliationPage.tsx', code)
console.log('Update part 1 completed successfully!')
