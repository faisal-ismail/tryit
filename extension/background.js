/**
 * TryIt AI — Chrome Extension Manifest V3 Service Worker (`extension/background.js`)
 * Relays API requests from `content.js` on third-party HTTPS stores (ZARR, Amazon, Sephora, Zara, Shopify)
 * to `https://tryit.sineix.com` (with automatic fallback to `http://localhost:8000` during local dev)
 * and persists Cross-Store Pinned Look items and Custom Person Profiles across browser tabs.
 */
importScripts("config.js");

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["backendUrl", "youcamApiKey", "geminiApiKey", "pinnedLook", "customProfiles"],
      (items) => {
        resolve({
          backendUrl: (items.backendUrl || TRYIT_CONFIG.DEFAULT_BACKEND_URL).replace(/\/+$/, ""),
          youcamApiKey: items.youcamApiKey || "",
          geminiApiKey: items.geminiApiKey || "",
          pinnedLook: items.pinnedLook || null,
          customProfiles: Array.isArray(items.customProfiles) ? items.customProfiles : [],
        });
      }
    );
  });
}

/**
 * Fetches from primary backend (`https://tryit.sineix.com`), and if unreachable during local testing,
 * automatically falls back to `http://localhost:8000`.
 */
async function fetchWithFallback(primaryBase, path, options = {}) {
  const candidates = [primaryBase];
  const localUrl = TRYIT_CONFIG.LOCAL_FALLBACK_URL || "http://localhost:8000";
  const prodUrl = TRYIT_CONFIG.DEFAULT_BACKEND_URL || "https://tryit.sineix.com";
  if (primaryBase !== localUrl) candidates.push(localUrl);
  if (primaryBase !== prodUrl) candidates.push(prodUrl);

  let lastErr = null;
  for (const base of candidates) {
    try {
      const resp = await fetch(`${base}${path}`, options);
      if (resp.ok || resp.status < 500) {
        return { resp, activeBase: base };
      }
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("TryIt AI backend unreachable");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const settings = await getSettings();
    const base = settings.backendUrl;

    try {
      if (message.type === "GET_SETTINGS") {
        sendResponse({ ok: true, settings });
        return;
      }

      if (message.type === "GET_PERSONAS") {
        const { resp, activeBase } = await fetchWithFallback(base, "/api/personas");
        const data = await resp.json();
        sendResponse({
          ok: true,
          personas: data.personas || [],
          customProfiles: settings.customProfiles || [],
          settings: { ...settings, backendUrl: activeBase },
        });
        return;
      }

      if (message.type === "SAVE_CUSTOM_PROFILES") {
        await chrome.storage.local.set({ customProfiles: message.customProfiles || [] });
        sendResponse({ ok: true, customProfiles: message.customProfiles || [] });
        return;
      }

      if (message.type === "START_TRYON") {
        const { resp, activeBase } = await fetchWithFallback(base, "/api/tryon/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product: message.product,
            persona: message.persona,
            override_youcam_key: settings.youcamApiKey || null,
            override_gemini_key: settings.geminiApiKey || null,
          }),
        });
        const data = await resp.json();
        sendResponse({ ok: resp.ok, data, backendUrl: activeBase });
        return;
      }

      if (message.type === "CHAIN_TRYON") {
        const { resp, activeBase } = await fetchWithFallback(base, "/api/tryon/chain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previous_task_id: message.previous_task_id,
            base_result_image_url: message.base_result_image_url,
            pinned_product: message.pinned_product,
            second_product: message.second_product,
            persona: message.persona,
            override_youcam_key: settings.youcamApiKey || null,
            override_gemini_key: settings.geminiApiKey || null,
          }),
        });
        const data = await resp.json();
        sendResponse({ ok: resp.ok, data, backendUrl: activeBase });
        return;
      }

      if (message.type === "EDIT_TRYON") {
        const { resp, activeBase } = await fetchWithFallback(base, "/api/tryon/edit-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command_text: message.command_text,
            previous_task_id: message.previous_task_id,
            current_result_image_url: message.current_result_image_url,
            original_person_image_url: message.original_person_image_url,
            current_items: message.current_items || [],
            persona: message.persona,
            override_youcam_key: settings.youcamApiKey || null,
            override_gemini_key: settings.geminiApiKey || null,
          }),
        });
        const data = await resp.json();
        sendResponse({ ok: resp.ok, data, backendUrl: activeBase });
        return;
      }

      if (message.type === "POLL_STATUS") {
        const { resp, activeBase } = await fetchWithFallback(
          base,
          `/api/tryon/status/${encodeURIComponent(message.taskId)}`
        );
        const data = await resp.json();
        sendResponse({ ok: resp.ok, data, backendUrl: activeBase });
        return;
      }

      if (message.type === "SAVE_PINNED_LOOK") {
        await chrome.storage.local.set({ pinnedLook: message.pinnedLook });
        sendResponse({ ok: true, pinnedLook: message.pinnedLook });
        return;
      }

      sendResponse({ ok: false, error: `Unknown message type: ${message.type}` });
    } catch (err) {
      sendResponse({ ok: false, error: err.message || String(err), backendUrl: base });
    }
  })();

  // Keep message channel open for async response
  return true;
});
