const encoder = new TextEncoder()
const decoder = new TextDecoder()

const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes))

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

export const randomBase64 = (bytes = 16): string => {
  const values = new Uint8Array(bytes)
  crypto.getRandomValues(values)
  return toBase64(values)
}

const deriveKey = async (password: string, salt: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> => {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: 250_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    usages,
  )
}

export const hashPin = async (pin: string): Promise<{ salt: string; verifier: string }> => {
  const salt = fromBase64(randomBase64(16))
  const key = await deriveKey(pin, salt, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, encoder.encode('control-personal-pin'))
  return { salt: toBase64(salt), verifier: `${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}` }
}

export const verifyPin = async (pin: string, saltBase64: string, verifier: string): Promise<boolean> => {
  try {
    const [ivBase64, encryptedBase64] = verifier.split('.')
    if (!ivBase64 || !encryptedBase64) return false
    const key = await deriveKey(pin, fromBase64(saltBase64), ['decrypt'])
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(fromBase64(ivBase64)) }, key, toArrayBuffer(fromBase64(encryptedBase64)))
    return decoder.decode(decrypted) === 'control-personal-pin'
  } catch {
    return false
  }
}

export const encryptText = async (plainText: string, password: string): Promise<string> => {
  const salt = fromBase64(randomBase64(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt, ['encrypt'])
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, encoder.encode(plainText))
  return JSON.stringify({ encrypted: true, algorithm: 'AES-GCM', salt: toBase64(salt), iv: toBase64(iv), data: toBase64(new Uint8Array(encrypted)) })
}

export const decryptText = async (payload: string, password: string): Promise<string> => {
  const parsed = JSON.parse(payload) as { salt: string; iv: string; data: string }
  const key = await deriveKey(password, fromBase64(parsed.salt), ['decrypt'])
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(fromBase64(parsed.iv)) }, key, toArrayBuffer(fromBase64(parsed.data)))
  return decoder.decode(decrypted)
}
