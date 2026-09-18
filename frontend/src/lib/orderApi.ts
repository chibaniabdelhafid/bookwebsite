const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-order`

export async function submitOrder(payload: {
  finalize?: boolean
  items: { book_id: number; quantity: number; selected_options?: Record<string,string>; bundle_id?: number }[]
  form: { name: string; phone: string; wilaya: string; address: string }
  livraison: string
  abandoned_id?: number | null
}) {
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(payload),
  })
  return res.json()
}