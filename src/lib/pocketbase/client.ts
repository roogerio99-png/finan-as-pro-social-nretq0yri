import { MockPocketBase } from './mockStore'

/**
 * PocketBase Client — Modo 100% Local e Privado (Zero-Knowledge Privacy)
 * Garante que nenhum dado financeiro de terceiros ou testadores seja transmitido para servidores remotos.
 * Todos os registros (transações, contas, orçamentos, faturas, sonhos e dívidas) residem
 * exclusivamente no armazenamento local seguro (localStorage) do próprio aparelho do usuário.
 */
const pb = new MockPocketBase() as any
pb.autoCancellation(false)

export { pb }
export default pb
