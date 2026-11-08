import { MockPocketBase } from './mockStore'

/**
 * PocketBase Client — Modo 100% Local e Privado com Isolamento de Cofre por Perfil
 */
const pb = new MockPocketBase()
pb.autoCancellation(false)

export { pb }
export default pb
