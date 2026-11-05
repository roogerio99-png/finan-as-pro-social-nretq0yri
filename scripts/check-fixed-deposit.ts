/// <reference types="tsx" />

import { solveFixedDeposit, depositSeries } from '../src/components/simulations/fixedDepositSolver'

const check = (label: string, form: any) => {
  const out = solveFixedDeposit(form)
  console.log(label, JSON.stringify(out))
}

// 1) nº de meses: taxa 1%, dep 50, final 364,50
check('meses:', { months: '', rate: '1', deposit: '50', final: '364,50' })
// 2) taxa: meses 9, dep 100, final 946,30
check('taxa:', { months: '9', rate: '', deposit: '100', final: '946,30' })
// 3) depósito: meses 6, taxa 0,85%, final 8500
check('aporte:', { months: '6', rate: '0,85', deposit: '', final: '8500' })
// 4) final: meses 8, taxa 1,2%, dep 150
check('final:', { months: '8', rate: '1,2', deposit: '150', final: '' })

// erros
check('dois vazios:', { months: '', rate: '', deposit: '100', final: '946,30' })
check('inválido:', { months: '0', rate: '', deposit: '100', final: '946,30' })

// série
console.log('serie:', JSON.stringify(depositSeries(150, 1.2, 8)))
