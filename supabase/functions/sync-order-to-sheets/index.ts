// supabase/functions/sync-order-to-sheets/index.ts
//
// Reçoit les Database Webhooks de Supabase (tables `orders` et `order_items`)
// et écrit/actualise la ligne correspondante dans un Google Sheet via un
// compte de service Google (Service Account), sans jamais exposer de secret
// côté client/admin.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Variables d'environnement (à définir avec `supabase secrets set`) ──
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_SERVICE_ACCOUNT = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT')!)
const SHEET_ID = Deno.env.get('GOOGLE_SHEET_ID')!
const SHEET_NAME = Deno.env.get('GOOGLE_SHEET_NAME') || 'Commandes'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ─────────────────────────────────────────────────────────────
// 1. Authentification Google (JWT Bearer flow avec le Service Account)
// ─────────────────────────────────────────────────────────────
async function getGoogleAccessToken(): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claim = {
    iss: GOOGLE_SERVICE_ACCOUNT.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const unsigned = `${b64url(header)}.${b64url(claim)}`

  const key = await importPrivateKey(GOOGLE_SERVICE_ACCOUNT.private_key)
  const signatureBuf = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(unsigned)
  )
  const encodedSig = btoa(String.fromCharCode(...new Uint8Array(signatureBuf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const jwt = `${unsigned}.${encodedSig}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Échec auth Google: ' + JSON.stringify(data))
  return data.access_token
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

// ─────────────────────────────────────────────────────────────
// 2. Helpers Google Sheets (chercher / écrire une ligne)
// ─────────────────────────────────────────────────────────────
async function findRowByOrderNumber(token: string, orderNumber: string): Promise<number | null> {
  const range = `${SHEET_NAME}!A:A`
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  const rows: string[][] = data.values || []
  const idx = rows.findIndex((r) => r[0] === orderNumber)
  return idx === -1 ? null : idx + 1 // Google Sheets est indexé à partir de 1
}

async function writeRow(token: string, rowNumber: number | null, values: (string | number)[]) {
  if (rowNumber) {
    // Mise à jour d'une ligne existante
    const lastCol = String.fromCharCode(64 + values.length) // A, B, C...
    const range = `${SHEET_NAME}!A${rowNumber}:${lastCol}${rowNumber}`
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [values] }),
      }
    )
  } else {
    // Ajout d'une nouvelle ligne
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME + '!A:Z')}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [values] }),
      }
    )
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Handler principal
// ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Sécurité : vérifier le secret envoyé par le webhook Supabase
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const table = payload.table as string
  const record = payload.record

  // orders → record.id est l'id de la commande
  // order_items → record.order_id référence la commande parente
  const orderId = table === 'order_items' ? record?.order_id : record?.id
  if (!orderId) return new Response('No order id in payload', { status: 400 })

  // Récupérer la commande complète avec ses articles
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return new Response('Order not found: ' + error?.message, { status: 404 })
  }

  // Construire la ligne à écrire dans le sheet
  const itemsText =
    order.order_items && order.order_items.length > 0
      ? order.order_items.map((it: any) => `${it.title} x${it.qty}`).join(' | ')
      : '-'

  const row = [
    order.order_number || '',
    order.name || '',
    order.phone || '',
    itemsText,
    order.wilaya || '',
    order.address || '',
    order.livraison || '',
    order.total ?? 0,
    order.status || '',
    order.created_at ? new Date(order.created_at).toLocaleString('fr-FR') : '',
  ]

  try {
    const token = await getGoogleAccessToken()
    const existingRow = await findRowByOrderNumber(token, order.order_number)
    await writeRow(token, existingRow, row)
  } catch (e) {
    console.error(e)
    return new Response('Sheets error: ' + e, { status: 500 })
  }

  return new Response('OK', { status: 200 })
})