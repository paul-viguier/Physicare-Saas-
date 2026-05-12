import { describe, it, expect, beforeAll } from 'vitest'

beforeAll(() => {
  process.env.ENCRYPTION_KEY = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff'
})

describe('encrypt/decrypt', () => {
  it('roundtrip', async () => {
    const { encrypt, decrypt } = await import('../crypto')
    const enc = encrypt('hello-secret-token')
    expect(enc).toMatch(/^v1:/)
    expect(decrypt(enc)).toBe('hello-secret-token')
  })
  it('renvoie tel quel pour les valeurs non chiffrées (compat)', async () => {
    const { decrypt } = await import('../crypto')
    expect(decrypt('legacy-plain')).toBe('legacy-plain')
  })
  it('vide en entrée → vide en sortie', async () => {
    const { encrypt } = await import('../crypto')
    expect(encrypt('')).toBe('')
    expect(encrypt(null)).toBe('')
  })
})

describe('verifyHmacSha256', () => {
  it('valide une bonne signature', async () => {
    const { verifyHmacSha256 } = await import('../crypto')
    const crypto = await import('crypto')
    const body = '{"a":1}'
    const sig = crypto.createHmac('sha256', 'sekret').update(body).digest('hex')
    expect(verifyHmacSha256('sekret', body, sig)).toBe(true)
  })
  it('rejette une mauvaise signature', async () => {
    const { verifyHmacSha256 } = await import('../crypto')
    expect(verifyHmacSha256('sekret', '{}', 'deadbeef')).toBe(false)
  })
})
