import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_TOKEN')!
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')!

serve(async (req) => {
  try {
    const payload = await req.json()
    const order = payload.record

    const message = `
🔔 *طلب جديد!*

📦 *رقم الطلب:* ${order.order_number || order.id}
👤 *الاسم:* ${order.name}
📞 *الهاتف:* ${order.phone}
📍 *الولاية:* ${order.wilaya}
🏠 *العنوان:* ${order.address}
🚚 *التوصيل:* ${order.livraison === 'domicile' ? 'توصيل للمنزل' : 'مكتب DHD'}
💰 *المجموع:* ${order.total} دج
📅 *التاريخ:* ${new Date(order.created_at).toLocaleString('ar-DZ')}
    `

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    )

    const result = await response.json()
    console.log('Telegram response:', result)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
      console.error('Error:', error)

      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
})