// ─── Stripe ─────────────────────────────────────
// Crée un customer Stripe et (option) un abonnement
// Skip silencieusement si STRIPE_SECRET_KEY absent.

export async function provisionStripe({ client, managerEmail, plan }) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return { ok: false, skipped: true, reason: 'STRIPE_SECRET_KEY missing' }

  const auth = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }

  const customerBody = new URLSearchParams({
    name: client.nom,
    'metadata[client_slug]': client.slug,
    'metadata[platform]': 'physicare',
  })
  if (managerEmail) customerBody.set('email', managerEmail)

  const customerRes = await fetch('https://api.stripe.com/v1/customers', {
    method: 'POST', headers: auth, body: customerBody,
  })
  const customer = await customerRes.json()
  if (!customerRes.ok) return { ok: false, error: customer.error?.message || 'stripe customer error' }

  const priceId = plan ? process.env[`STRIPE_PRICE_${plan.toUpperCase()}`] : process.env.STRIPE_PRICE_DEFAULT
  if (!priceId) {
    return { ok: true, data: { customerId: customer.id }, note: 'no price configured, customer only' }
  }

  const trialDays = Number(process.env.STRIPE_TRIAL_DAYS || 14)
  const subBody = new URLSearchParams({
    customer: customer.id,
    'items[0][price]': priceId,
    trial_period_days: String(trialDays),
    'metadata[client_slug]': client.slug,
  })
  const subRes = await fetch('https://api.stripe.com/v1/subscriptions', {
    method: 'POST', headers: auth, body: subBody,
  })
  const sub = await subRes.json()
  if (!subRes.ok) return { ok: false, error: sub.error?.message || 'stripe subscription error', data: { customerId: customer.id } }

  return {
    ok: true,
    data: {
      customerId: customer.id,
      subscriptionId: sub.id,
      status: sub.status,
      trialEnd: sub.trial_end,
    },
  }
}
