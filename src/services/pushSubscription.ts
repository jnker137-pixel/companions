const VAPID_PUBLIC_KEY = 'BKMCVDQ4x3TccDE1Oi3MfrY-4i2fGWA0mPrdqf0DgaLX6movUljKBlMlMuzcp-kArUGydXRIYIeKZAXoPas-LEo';
const SUPABASE_URL = 'https://uxiymaeobmleshekvqvl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4aXltYWVvYm1sZXNoZWt2cXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NTQ3OTYsImV4cCI6MjA4NzEzMDc5Nn0.cAltB-U4B7-38M065Cn30uwoPu-wzh62IkuDUT4rrAQ';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function subscribeToPush(clientId: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const registration = await navigator.serviceWorker.register('/companions/sw-push.js');
  await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const sub = subscription.toJSON();
  await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      client_id: clientId,
      endpoint: subscription.endpoint,
      p256dh: sub.keys?.p256dh,
      auth: sub.keys?.auth,
    }),
  });
}
