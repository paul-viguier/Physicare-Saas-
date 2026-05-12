// PHYSICARE® — Helpers crypto (HMAC + AES pour tokens)
// AES-GCM 256 pour les access_token providers stockés en DB.
import crypto from 'crypto'

function key() {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) throw new Error('ENCRYPTION_KEY manquante (32 bytes hex, openssl rand -hex 32)')
  const buf = Buffer.from(raw, 'hex')
  if (buf.length !== 32) throw new Error('ENCRYPTION_KEY doit faire 32 bytes (64 chars hex)')
  return buf
}

/** Chiffre un texte → "v1:<ivHex>:<tagHex>:<cipherHex>". */
export function encrypt(plain) {
  if (plain == null || plain === '') return ''
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

/** Déchiffre, ou renvoie tel quel si pas au format v1: (compat legacy). */
export function decrypt(payload) {
  if (!payload || typeof payload !== 'string') return payload
  if (!payload.startsWith('v1:')) return payload
  const [, ivHex, tagHex, encHex] = payload.split(':')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  const dec = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()])
  return dec.toString('utf8')
}

/** Comparaison constant-time pour signatures webhook. */
export function timingSafeEqual(a, b) {
  try {
    const ba = Buffer.from(a || '', 'hex')
    const bb = Buffer.from(b || '', 'hex')
    if (ba.length !== bb.length) return false
    return crypto.timingSafeEqual(ba, bb)
  } catch { return false }
}

/** Vérifie la signature SVIX-style (svix-id . svix-timestamp . body) → utilisé par Resend. */
export function verifySvix({ secret, id, timestamp, body, signatureHeader }) {
  if (!secret || !signatureHeader) return false
  // Resend envoie 'v1,base64sig v1,base64sig2'
  const sigs = String(signatureHeader).split(' ')
    .map(s => s.startsWith('v1,') ? s.slice(3) : null).filter(Boolean)
  const payload = `${id}.${timestamp}.${body}`
  const cleanSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret
  const expected = crypto.createHmac('sha256', Buffer.from(cleanSecret, 'base64'))
    .update(payload).digest('base64')
  return sigs.some(s => {
    try { return crypto.timingSafeEqual(Buffer.from(s, 'base64'), Buffer.from(expected, 'base64')) }
    catch { return false }
  })
}

/** Vérifie un HMAC SHA-256 simple (Unipile-style header X-Signature). */
export function verifyHmacSha256(secret, body, signatureHex) {
  if (!secret || !signatureHex) return false
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return timingSafeEqual(expected, signatureHex)
}
