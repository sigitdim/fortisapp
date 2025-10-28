// pay.js (potongan inti)
const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

router.post('/create', async (req, res) => {
  try {
    const { name, email, phone, amount = 149000, note = 'Aktivasi FortisApp Pro', redirect = 'https://fortislab.id/thanks' } = req.body || {};

    const r = await fetch('https://api.mayar.id/hl/v1/invoice/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MAYAR_API_KEY}`,
      },
      body: JSON.stringify({
        name,
        email,
        mobile: phone,
        redirectUrl: redirect,
        description: note,
        expiredAt: new Date(Date.now() + 1000*60*30).toISOString(), // 30 menit
        items: [
          { quantity: 1, rate: amount, description: note }
        ]
      })
    });

    const out = await r.json();
    if (out?.statusCode === 200 && out?.data?.link) {
      return res.json({ ok: true, checkout_url: out.data.link });
    }
    console.error('Mayar create invoice non-200:', out);
    return res.status(502).json({ ok:false, error:'Create invoice gagal', detail: out });
  } catch (e) {
    console.error('🧨 Mayar error:', e);
    res.status(500).json({ ok:false, error:'Internal error' });
  }
});

module.exports = router;
