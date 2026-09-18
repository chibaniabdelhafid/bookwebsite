import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SB_SERVICE_ROLE_KEY')!
  )

  try {
    const bodyIn = await req.json()
    const {
      finalize = true,       // false = sauvegarde "Non complète" (abandonnée), true = commande confirmée
      items,                 // [{ book_id, quantity, selected_options?: {label: name}, bundle_id? }]
      form,                  // { name, phone, wilaya, address }
      livraison,
      abandoned_id,
    } = bodyIn

    if (!Array.isArray(items) || items.length === 0) {
      return json({ error: 'Panier vide' }, 400)
    }
    if (!form?.phone || form.phone.length < 6) {
      return json({ error: 'Téléphone invalide' }, 400)
    }

    // ── Validation stricte uniquement si finalize (commande confirmée) ──
    if (finalize) {
      if (!form.name?.trim() || !/^0[567]\d{8}$/.test(form.phone) || !form.wilaya || !form.address?.trim()) {
        return json({ error: 'Champs invalides' }, 400)
      }
    }

    // ── Prix livraison ──
    const { data: wilayaRow } = form.wilaya
      ? await supabase.from('wilaya_delivery').select('*').eq('wilaya', form.wilaya).single()
      : { data: null }

    // ── Recalcul serveur de chaque item (jamais confiance au prix client) ──
    let orderTotal = 0
    let anyFreeDelivery = items.length > 0
    const computedItems: any[] = []

    for (const it of items) {
      const { data: book, error: bookErr } = await supabase
        .from('books').select('*').eq('id', it.book_id).single()
      if (bookErr || !book) return json({ error: `Livre introuvable (id ${it.book_id})` }, 404)

      let bundle = null
      if (it.bundle_id) {
        const { data } = await supabase.from('book_bundles')
          .select('*').eq('id', it.bundle_id).eq('active', true).single()
        bundle = data
      }

      const quantity = Math.max(1, Number(it.quantity) || 1)

      if (!bundle && quantity > (book.stock ?? 0)) {
        return json({ error: `Stock insuffisant pour "${book.title}" (dispo: ${book.stock ?? 0})` }, 400)
      }

      // Prix de base (promo éventuelle)
      let unitPrice = book.promotion && book.promotion < book.price ? book.promotion : book.price
      let selectedOptionsToStore: Record<string, any> | null = null

      if (it.selected_options && typeof it.selected_options === 'object') {
        const { data: optionsRows } = await supabase
          .from('book_options').select('*').eq('book_id', book.id)
        selectedOptionsToStore = {}

        for (const [label, chosenName] of Object.entries(it.selected_options)) {
          let choice: any = null
          if (label === 'القياس') {
            const adminQias = optionsRows?.find((o: any) => o.label === 'القياس')
            const choices = adminQias?.choices?.length
              ? adminQias.choices
              : [{ name: book.qias || '—', price: unitPrice, auto: true }]
            choice = choices.find((ch: any) => ch.name === chosenName)
            if (choice) {
              // qias original → garde la promo, sinon prix propre au choix
              const isOriginal = choice.auto || choice.name === book.qias
              unitPrice = isOriginal ? unitPrice : (choice.price > 0 ? choice.price : unitPrice)
            }
          } else {
            const opt = optionsRows?.find((o: any) => o.label === label)
            choice = opt?.choices?.find((ch: any) => ch.name === chosenName)
            if (choice && opt?.affects_price && choice.price > 0) unitPrice = choice.price
          }
          if (choice) selectedOptionsToStore[label] = `${choice.name} (+${choice.price || 0} دج)`
        }
      }

      const orderQty = bundle ? bundle.qty : quantity
      const orderPrice = bundle ? bundle.price : unitPrice * quantity
      const isFreeDelivery = bundle ? !!bundle.free_delivery : !!book.free_delivery
      anyFreeDelivery = anyFreeDelivery && isFreeDelivery

      orderTotal += orderPrice
      computedItems.push({
        book_id: book.id, title: book.title, qty: orderQty, price: orderPrice,
        selected_options: selectedOptionsToStore,
        bundle_label: bundle ? (bundle.label || `${bundle.qty} نسخ`) : null,
      })
    }

    const deliveryPrice = anyFreeDelivery
      ? 0
      : (livraison === 'domicile' ? wilayaRow?.home_price : wilayaRow?.dhd_price) ?? 0
    const total = orderTotal + deliveryPrice

    // ── Insert / update de la commande ──
    const orderPayload = {
      name: form.name || null,
      phone: form.phone,
      wilaya: form.wilaya || null,
      address: form.address || null,
      total,
      status: finalize ? 'Attente' : 'Non complète',
      livraison,
      abandoned: !finalize,
      bundle_label: computedItems[0]?.bundle_label || null,
    }

    let orderId: number
    if (abandoned_id) {
      const { data, error } = await supabase.from('orders')
        .update(orderPayload).eq('id', abandoned_id).select('id').single()
      if (error) return json({ error: error.message }, 500)
      orderId = data.id
      await supabase.from('order_items').delete().eq('order_id', orderId)
    } else {
      const { data, error } = await supabase.from('orders')
        .insert(orderPayload).select('id, order_number').single()
      if (error) return json({ error: error.message }, 500)
      orderId = data.id
    }

    const { error: itemsErr } = await supabase.from('order_items').insert(
      computedItems.map(ci => ({ ...ci, order_id: orderId }))
    )
    if (itemsErr) return json({ error: itemsErr.message }, 500)

    // ── Décrément stock + retour uniquement si commande confirmée ──
    if (finalize) {
      for (const ci of computedItems) {
        await supabase.rpc('decrement_stock', { p_book_id: ci.book_id, p_qty: ci.qty })
      }
    }

    const { data: finalOrder } = await supabase
      .from('orders').select('id, order_number').eq('id', orderId).single()

    return json({ success: true, order_id: orderId, order_number: finalOrder?.order_number, total })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})