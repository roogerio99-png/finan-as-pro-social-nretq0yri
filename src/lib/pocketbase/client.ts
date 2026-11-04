import PocketBase from 'pocketbase'
import { MockPocketBase } from './mockStore'

const pbUrl = import.meta.env.VITE_POCKETBASE_URL

let pbInstance: any

if (pbUrl && typeof pbUrl === 'string' && pbUrl.trim().length > 0 && pbUrl.startsWith('http')) {
  pbInstance = new PocketBase(pbUrl)
  pbInstance.autoCancellation(false)
} else {
  // Use in-memory & localStorage mock client for standalone execution in AI Studio
  pbInstance = new MockPocketBase()
}

const pb = pbInstance
export default pb
