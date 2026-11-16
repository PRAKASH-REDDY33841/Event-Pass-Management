const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('--- 1. Testing Event Listing for Indian & International Events ---');
  const eventsRes = await get('http://localhost:5000/api/events');
  console.log('Events API Status:', eventsRes.status);
  const events = eventsRes.data.events;
  const inrEvents = events.filter(e => e.currency === 'INR' || e.country === 'India');
  const usEvents = events.filter(e => e.country === 'United States');
  console.log(`Total Events: ${events.length}`);
  console.log(`Indian Events (INR): ${inrEvents.length} ->`, inrEvents.map(e => `${e.title} (${e.city}, ₹${e.min_tier_price})`));
  console.log(`US Events (USD): ${usEvents.length} ->`, usEvents.map(e => `${e.title} (${e.city}, $${e.min_tier_price})`));

  console.log('\n--- 2. Testing Cancellation Quote API (5-minute rule & IRCTC slabs) ---');
  // Find a ticket
  const tRes = await get('http://localhost:5000/api/tickets/EP-GEN-81897923/cancellation-quote');
  console.log('Cancellation Quote Status:', tRes.status);
  if (tRes.data && tRes.data.quote) {
    console.log('Quote Details:', {
      canCancel: tRes.data.quote.canCancel,
      hoursRemaining: tRes.data.quote.hoursRemaining,
      minutesRemaining: tRes.data.quote.minutesRemaining,
      refundPercentage: tRes.data.quote.refundPercentage + '%',
      originalAmount: tRes.data.quote.originalAmount,
      refundAmount: tRes.data.quote.refundAmount,
      cancellationFee: tRes.data.quote.cancellationFee,
      currency: tRes.data.event?.currency
    });
  } else {
    console.log('Quote Response:', tRes.raw?.slice(0, 200));
  }

  console.log('\n--- 3. Testing Email Outbox & QR Code Preview ---');
  const outboxRes = await get('http://localhost:5000/api/outbox');
  console.log('Outbox Status:', outboxRes.status);
  const emails = outboxRes.data?.emails || [];
  console.log(`Total Outbox Emails: ${emails.length}`);
  if (emails.length > 0) {
    const first = emails[0];
    console.log('First email ID:', first.id, 'Subject:', first.subject);
    const previewRes = await get(`http://localhost:5000/api/outbox/${first.id}`);
    const hasDataUrlQr = previewRes.raw && previewRes.raw.includes('data:image/png;base64,');
    console.log('Preview HTML rendered? Length:', previewRes.raw?.length);
    console.log('Contains rendered base64 QR image:', hasDataUrlQr ? '✓ YES (Properly Embedded!)' : '✗ NO');
  }

  console.log('\n=== ALL VERIFICATION CHECKS COMPLETED ===');
}

run().catch(console.error);

