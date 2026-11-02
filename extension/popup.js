/**
 * TryIt AI — Popup Controller (`extension/popup.js`)
 */
document.addEventListener("DOMContentLoaded", () => {
  const urlInput = document.getElementById("backend-url");
  const pinnedBox = document.getElementById("pinned-box");
  const pinnedName = document.getElementById("pinned-name");
  const statusMsg = document.getElementById("status-msg");

  chrome.storage.local.get(["backendUrl", "pinnedLook"], (items) => {
    urlInput.value = items.backendUrl || TRYIT_CONFIG.DEFAULT_BACKEND_URL;

    if (items.pinnedLook && items.pinnedLook.product) {
      pinnedBox.style.display = "block";
      pinnedName.textContent = `${items.pinnedLook.product.brand || "Brand"} — ${items.pinnedLook.product.title}`;
    }
  });

  document.getElementById("save-btn").addEventListener("click", () => {
    const backendUrl = (urlInput.value.trim() || TRYIT_CONFIG.DEFAULT_BACKEND_URL).replace(/\/+$/, "");
    chrome.storage.local.set({ backendUrl }, () => {
      statusMsg.textContent = "✓ Preferences saved";
      setTimeout(() => {
        statusMsg.textContent = "";
      }, 2000);
    });
  });

  document.getElementById("open-demo-btn").addEventListener("click", () => {
    const backendUrl = (urlInput.value.trim() || TRYIT_CONFIG.DEFAULT_BACKEND_URL).replace(/\/+$/, "");
    chrome.tabs.create({ url: `${backendUrl}/demo-store` });
  });
});
