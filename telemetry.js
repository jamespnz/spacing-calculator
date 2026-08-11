/**
 * HeadsUp ADS - Zero-Dependency Micro-Utility Telemetry
 * Captures Pageviews and Active Time-on-Page without external trackers.
 */
(function () {
  'use strict';

  // =========================================================================
  // SUPABASE CONFIGURATION
  // =========================================================================
  const SUPABASE_URL = 'https://uheysmshuoddslnyhcli.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_O2Rq2Fa0ejDET99FINtrGw_qDQ8-K6N'; // Publishable anon key
  const APP_ID = 'spacing-app';                                             // Micro-utility identifier

  // Target the Supabase PostgREST table endpoint directly
  const ENDPOINT = `${SUPABASE_URL}/rest/v1/telemetry_events`;

  let totalActiveTime = 0;
  let lastActiveTimestamp = Date.now();
  let isTabActive = true;

  // 1. Fire Initial Pageview Event (Aligned to schema)
  function logPageview() {
    sendPayload({
      app_id: APP_ID,
      event: 'pageview',
      referrer: document.referrer || 'direct'
    });
  }

  // 2. Track Active Time (Pauses when user switches tabs)
  function updateActiveTime() {
    if (isTabActive) {
      const now = Date.now();
      totalActiveTime += Math.round((now - lastActiveTimestamp) / 1000);
      lastActiveTimestamp = now;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      updateActiveTime();
      isTabActive = false;
    } else {
      lastActiveTimestamp = Date.now();
      isTabActive = true;
    }
  });

  // 3. Dispatch Time-on-Page Payload on Page Unload / Exit (Aligned to schema)
  function logTimeOnPage() {
    updateActiveTime();
    if (totalActiveTime < 1) return; // Ignore accidental misclicks (< 1s)

    sendPayload({
      app_id: APP_ID,
      event: 'time_on_page',
      duration_seconds: totalActiveTime
    });
  }

  // 4. Send Payload to Supabase REST API
  function sendPayload(data) {
    const payloadString = JSON.stringify(data);

    if (navigator.sendBeacon && document.visibilityState === 'hidden') {
      // SendBeacon for page unload / close
      const beaconUrl = `${ENDPOINT}?apikey=${encodeURIComponent(SUPABASE_ANON_KEY)}`;
      const blob = new Blob([payloadString], { type: 'application/json' });
      navigator.sendBeacon(beaconUrl, blob);
    } else {
      // Standard Fetch for immediate pageview insertion
      fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: payloadString,
        keepalive: true
      })
      .then(res => {
        if (!res.ok) {
          res.json().then(err => console.error('Supabase Ingestion Error:', err));
        }
      })
      .catch(err => console.error('Telemetry Fetch Error:', err));
    }
  }

  // Lifecycle Bindings
  logPageview();
  window.addEventListener('pagehide', logTimeOnPage);
  window.addEventListener('beforeunload', logTimeOnPage);
})();