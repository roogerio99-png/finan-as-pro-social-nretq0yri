import fs from 'fs'

let code = fs.readFileSync('src/pages/ReconciliationPage.tsx', 'utf8')

// 1. handleSaveSingleLine transfer validation e save
const oldSingleTransferCheck = `    if (line.type === 'transfer' && !line.transfer_account_id) {
      toast({
        title: 'Selecione a Conta Destino',
        description: 'Para transferências, escolha para qual conta o saldo foi transferido.',
        variant: 'destructive',
      })
      return
    }`

const newSingleTransferCheck = `    if (line.type === 'transfer' && !line.transfer_account_id) {
      const isIncoming = line.direction === 'in'
      toast({
        title: isIncoming ? 'Selecione a Conta de Origem' : 'Selecione a Conta de Destino',
        description: isIncoming
          ? 'Para transferências de entrada, escolha de qual conta o dinheiro veio.'
          : 'Para transferências de saída, escolha para qual conta o dinheiro foi transferido.',
        variant: 'destructive',
      })
      return
    }`

code = code.replace(oldSingleTransferCheck, newSingleTransferCheck)

// Substituir gravação no handleSaveSingleLine
const oldSingleTransferSave = `      if (line.type === 'transfer') {
        if (line.transfer_account_id) {
          try {
            await transactionsService.transfer({
              sourceAccountId: selectedAccountId,
              targetAccountId: line.transfer_account_id,
              amount: line.amount,
              date: line.date,
              description: line.description || 'Transferência entre contas',
            })
          } catch {
            await transactionsService.create({
              account_id: selectedAccountId,
              transfer_account_id: line.transfer_account_id,
              description: line.description,
              amount: line.amount,
              type: 'transfer',
              date: line.date,
              competence_month: line.competence_month,
              cash_month: line.cash_month,
              is_reconciled: true,
              import_batch_id: batchId,
            })
          }
        } else {
          await transactionsService.create({
            account_id: selectedAccountId,
            description: line.description,
            amount: line.amount,
            type: 'transfer',
            date: line.date,
            competence_month: line.competence_month,
            cash_month: line.cash_month,
            is_reconciled: true,
            import_batch_id: batchId,
          })
        }
      }`

const newSingleTransferSave = `      if (line.type === 'transfer') {
        const isIncoming = line.direction === 'in'
        const sourceId = isIncoming ? line.transfer_account_id! : selectedAccountId
        const targetId = isIncoming ? selectedAccountId : line.transfer_account_id!

        if (line.transfer_account_id) {
          try {
            await transactionsService.transfer({
              sourceAccountId: sourceId,
              targetAccountId: targetId,
              amount: line.amount,
              date: line.date,
              description: line.description || (isIncoming ? 'Transferência recebida' : 'Transferência enviada'),
            })
          } catch {
            await transactionsService.create({
              account_id: selectedAccountId,
              transfer_account_id: line.transfer_account_id,
              description: line.description,
              amount: line.amount,
              type: 'transfer',
              date: line.date,
              competence_month: line.competence_month,
              cash_month: line.cash_month,
              is_reconciled: true,
              import_batch_id: batchId,
            })
          }
        } else {
          await transactionsService.create({
            account_id: selectedAccountId,
            description: line.description,
            amount: line.amount,
            type: 'transfer',
            date: line.date,
            competence_month: line.competence_month,
            cash_month: line.cash_month,
            is_reconciled: true,
            import_batch_id: batchId,
          })
        }
      }`

code = code.replace(oldSingleTransferSave, newSingleTransferSave)

// 2. handleSaveBatch transfer save
const oldBatchTransferSave = `        if (line.type === 'transfer') {
          // Transferência entre contas
          if (line.transfer_account_id) {
            try {
              await transactionsService.transfer({
                sourceAccountId: selectedAccountId,
                targetAccountId: line.transfer_account_id,
                amount: line.amount,
                date: line.date,
                description: line.description || 'Transferência entre contas',
              })
            } catch {
              await transactionsService.create({
                account_id: selectedAccountId,
                transfer_account_id: line.transfer_account_id,
                description: line.description,
                amount: line.amount,
                type: 'transfer',
                date: line.date,
                competence_month: line.competence_month,
                cash_month: line.cash_month,
                is_reconciled: true,
                import_batch_id: batchId,
              })
            }
          } else {
            await transactionsService.create({
              account_id: selectedAccountId,
              description: line.description,
              amount: line.amount,
              type: 'transfer',
              date: line.date,
              competence_month: line.competence_month,
              cash_month: line.cash_month,
              is_reconciled: true,
              import_batch_id: batchId,
            })
          }
        }`

const newBatchTransferSave = `        if (line.type === 'transfer') {
          const isIncoming = line.direction === 'in'
          const sourceId = isIncoming ? (line.transfer_account_id || selectedAccountId) : selectedAccountId
          const targetId = isIncoming ? selectedAccountId : (line.transfer_account_id || selectedAccountId)

          if (line.transfer_account_id) {
            try {
              await transactionsService.transfer({
                sourceAccountId: sourceId,
                targetAccountId: targetId,
                amount: line.amount,
                date: line.date,
                description: line.description || (isIncoming ? 'Transferência recebida' : 'Transferência enviada'),
              })
            } catch {
              await transactionsService.create({
                account_id: selectedAccountId,
                transfer_account_id: line.transfer_account_id,
                description: line.description,
                amount: line.amount,
                type: 'transfer',
                date: line.date,
                competence_month: line.competence_month,
                cash_month: line.cash_month,
                is_reconciled: true,
                import_batch_id: batchId,
              })
            }
          } else {
            await transactionsService.create({
              account_id: selectedAccountId,
              description: line.description,
              amount: line.amount,
              type: 'transfer',
              date: line.date,
              competence_month: line.competence_month,
              cash_month: line.cash_month,
              is_reconciled: true,
              import_batch_id: batchId,
            })
          }
        }`

code = code.replace(oldBatchTransferSave, newBatchTransferSave)

fs.writeFileSync('src/pages/ReconciliationPage.tsx', code)
console.log('Update part 2 completed successfully!')
