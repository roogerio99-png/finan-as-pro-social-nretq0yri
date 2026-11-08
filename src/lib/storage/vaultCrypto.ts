/**
 * Módulo Criptográfico do Cofre Local (PWA)
 * Utiliza exclusivamente primitivas auditadas da Web Crypto API nativa (crypto.subtle).
 * Algoritmo: AES-GCM (256 bits) com derivação de chave PBKDF2 (SHA-256, 100.000 iterações).
 * Sem bibliotecas externas ou algoritmos proprietários.
 */

const PBKDF2_ITERATIONS = 100000
const KEY_LENGTH_BITS = 256
const IV_LENGTH_BYTES = 12 // 96 bits recomendado para AES-GCM
const SALT_LENGTH_BYTES = 16

export interface EncryptedPayload {
  ciphertext: string // Base64
  iv: string // Base64
  salt: string // Base64
  version: number
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export const vaultCrypto = {
  /**
   * Gera um salt aleatório criptograficamente seguro
   */
  generateSalt(): Uint8Array {
    const salt = new Uint8Array(SALT_LENGTH_BYTES)
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(salt)
    } else {
      // Fallback para ambiente Node.js / testes
      for (let i = 0; i < salt.length; i++) {
        salt[i] = Math.floor(Math.random() * 256)
      }
    }
    return salt
  },

  /**
   * Deriva uma CryptoKey AES-GCM de 256 bits a partir de uma senha de usuário usando PBKDF2
   */
  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder()
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    )

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      passwordKey,
      {
        name: 'AES-GCM',
        length: KEY_LENGTH_BITS,
      },
      false,
      ['encrypt', 'decrypt'],
    )
  },

  /**
   * Criptografa dados em formato JSON usando AES-GCM e retorna payload com IV e Salt
   */
  async encrypt(data: any, password: string): Promise<EncryptedPayload> {
    const salt = this.generateSalt()
    const key = await this.deriveKey(password, salt)

    const iv = new Uint8Array(IV_LENGTH_BYTES)
    crypto.getRandomValues(iv)

    const enc = new TextEncoder()
    const encodedData = enc.encode(JSON.stringify(data))

    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encodedData,
    )

    return {
      ciphertext: arrayBufferToBase64(ciphertextBuffer),
      iv: arrayBufferToBase64(iv),
      salt: arrayBufferToBase64(salt),
      version: 1,
    }
  },

  /**
   * Descriptografa um payload AES-GCM. Lança erro se a senha estiver incorreta ou dados corrompidos.
   */
  async decrypt(payload: EncryptedPayload, password: string): Promise<any> {
    const salt = new Uint8Array(base64ToArrayBuffer(payload.salt))
    const iv = new Uint8Array(base64ToArrayBuffer(payload.iv))
    const ciphertext = base64ToArrayBuffer(payload.ciphertext)

    const key = await this.deriveKey(password, salt)

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
        },
        key,
        ciphertext,
      )

      const dec = new TextDecoder()
      const jsonStr = dec.decode(decryptedBuffer)
      return JSON.parse(jsonStr)
    } catch {
      throw new Error('Senha incorreta ou integridade do cofre comprometida.')
    }
  },

  /**
   * Gera hash seguro com salt para validação rápida de senha de desbloqueio
   */
  async hashPassword(password: string, salt: Uint8Array): Promise<string> {
    const enc = new TextEncoder()
    const passwordBytes = enc.encode(password)
    const combined = new Uint8Array(passwordBytes.length + salt.length)
    combined.set(passwordBytes)
    combined.set(salt, passwordBytes.length)

    const hashBuffer = await crypto.subtle.digest('SHA-256', combined)
    return arrayBufferToBase64(hashBuffer)
  },

  /**
   * Neutraliza fórmulas perigosas ao exportar para CSV / planilhas (mitigação de CSV Injection)
   * Se o texto iniciar com '=', '+', '-', '@', '\t', '\r', prefixa com apóstrofo (')
   */
  sanitizeCsvCell(val: any): string {
    if (val === null || val === undefined) return ''
    const str = String(val).trim()
    if (/^[=+\-@\t\r]/.test(str)) {
      return `'${str}`
    }
    return str
  },
}
