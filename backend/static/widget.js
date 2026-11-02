/**
 * TryIt AI — Shared Interactive VTO & Skin AI Drawer Widget (`backend/static/widget.js`)
 * Powers Dual-Access "Judge Mode" on `/demo-store` with:
 *  1. 8 Diverse Pre-Built Models (Asian, African, American, Latin across Female & Male)
 *  2. Custom Person Profiles (e.g., "Zain Ali") with multi-photo gallery & "Add Result Photo to Profile"
 *  3. Manual Try-On execution (never auto-runs on product click unless a guided demo scenario is triggered)
 *  4. Natural-Language Text Command Edits (e.g., "remove jacket", "add leather boots", "add cashmere scarf")
 *  5. Footer attribution: "Powered by YouCam & Gemini API"
 */
(function () {
  const API_BASE = window.TRYIT_BACKEND_URL || window.location.origin;

  const state = {
    isOpen: false,
    personas: [],
    customProfiles: JSON.parse(localStorage.getItem("tryit_custom_profiles") || "[]"),
    selectedPersonaId: "maya",
    selectedPhotoUrl: null,
    genderFilter: "all", // "all" | "female" | "male" | "custom"
    newProfileDraftPhoto: null,
    currentProduct: null,
    lastCompletedTask: null,
    activeOutfitItems: [],
    originalPersonImageUrl: null,
    pinnedLook: JSON.parse(localStorage.getItem("tryit_pinned_look") || "null"),
    compareBeforeMode: false,
    webcamStream: null,
    overrideYouCamKey: localStorage.getItem("tryit_youcam_key") || "",
    overrideGeminiKey: localStorage.getItem("tryit_gemini_key") || "",
  };

  function resolveUrl(url) {
    if (!url) return "";
    if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return url.startsWith("/") ? `${API_BASE}${url}` : url;
  }

  function saveCustomProfiles() {
    localStorage.setItem("tryit_custom_profiles", JSON.stringify(state.customProfiles || []));
  }

  function getAllProfiles() {
    const customMap = new Map();
    (state.customProfiles || []).forEach((cp) => customMap.set(cp.persona_id, cp));

    const mergedPrebuilt = (state.personas || []).map((p) =>
      customMap.has(p.persona_id) ? customMap.get(p.persona_id) : p
    );
    const pureCustom = (state.customProfiles || []).filter(
      (cp) => !mergedPrebuilt.some((mp) => mp.persona_id === cp.persona_id)
    );
    return [...pureCustom, ...mergedPrebuilt];
  }

  function getSelectedProfile() {
    const all = getAllProfiles();
    return (
      all.find((p) => p.persona_id === state.selectedPersonaId) ||
      all[0] || {
        persona_id: "maya",
        person_name: "Maya Lin",
        gender: "female",
        ethnicity: "Asian",
        undertone: "Warm Olive",
        skin_type: "Dry & Sensitive",
        usual_size: "M",
        full_body_image_url: `${API_BASE}/static/assets/persona_maya_full.png`,
        face_image_url: `${API_BASE}/static/assets/persona_maya_face.png`,
        photos: [
          { photo_id: "maya_full", label: "Full-Body Look", url: "/static/assets/persona_maya_full.png" },
          { photo_id: "maya_face", label: "Close-Up Portrait", url: "/static/assets/persona_maya_face.png" },
        ],
        baseline_skin_scores: {
          moisture: 68,
          redness: 41,
          acne: 78,
          pores: 72,
          wrinkles: 88,
          texture: 75,
        },
      }
    );
  }

  function savePinnedLook(lookObj) {
    state.pinnedLook = lookObj;
    if (lookObj) {
      localStorage.setItem("tryit_pinned_look", JSON.stringify(lookObj));
    } else {
      localStorage.removeItem("tryit_pinned_look");
    }
    renderPinnedBanner();
  }

  function getActivePersona() {
    const found = getSelectedProfile();
    const clone = JSON.parse(JSON.stringify(found));
    const chosenPhoto = resolveUrl(state.selectedPhotoUrl || clone.full_body_image_url);
    clone.full_body_image_url = chosenPhoto;
    clone.face_image_url = chosenPhoto;
    return clone;
  }

  function injectDrawerDOM() {
    if (document.getElementById("tryit-ai-drawer-root")) return;

    const root = document.createElement("div");
    root.id = "tryit-ai-drawer-root";
    root.innerHTML = `
      <div id="tryit-backdrop" class="tryit-backdrop"></div>
      <aside id="tryit-drawer" class="tryit-drawer" aria-label="TryIt AI Virtual Try-On & Skin AI Drawer">
        <header class="tryit-header">
          <div class="tryit-brand">
            <span class="tryit-logo-orb">✨</span>
            <div>
              <div class="tryit-title-row">
                <span class="tryit-title">TryIt AI</span>
                <span class="tryit-pill-badge">Virtual Fitting Room</span>
              </div>
              <p class="tryit-subtitle">Personal Style, Outfit Builder &amp; Skin Advisor</p>
            </div>
          </div>
          <div class="tryit-header-actions">
            <button id="tryit-keys-toggle" class="tryit-icon-btn" title="Configure Optional Live API Keys">🔑 Keys</button>
            <button id="tryit-close-btn" class="tryit-icon-btn" title="Close Drawer">✕</button>
          </div>
        </header>

        <div id="tryit-keys-panel" class="tryit-keys-panel hidden">
          <div class="tryit-keys-title">Optional Live API Credentials (Auto-Fallback Active by Default)</div>
          <div class="tryit-keys-grid">
            <input id="tryit-input-youcam" type="password" placeholder="YouCam S2S API Key (optional)" value="${state.overrideYouCamKey}" />
            <input id="tryit-input-gemini" type="password" placeholder="Gemini 2.5 Flash Key (optional)" value="${state.overrideGeminiKey}" />
            <button id="tryit-save-keys-btn" class="tryit-btn-small">Save</button>
          </div>
        </div>

        <div class="tryit-body">
          <!-- Active Product Summary -->
          <section class="tryit-card tryit-product-bar">
            <img id="tryit-prod-thumb" src="" alt="Product" class="tryit-prod-thumb" />
            <div class="tryit-prod-meta">
              <div class="tryit-prod-brand-row">
                <span id="tryit-prod-brand" class="tryit-prod-brand">STORE</span>
                <span id="tryit-prod-price" class="tryit-prod-price">$0.00</span>
              </div>
              <h3 id="tryit-prod-title" class="tryit-prod-title">Select a product to TryIt with AI</h3>
              <p id="tryit-prod-ingredients" class="tryit-prod-ing"></p>
            </div>
          </section>

          <!-- Cross-Store Pinned Look Builder Banner -->
          <section id="tryit-pinned-banner" class="tryit-pinned-banner hidden"></section>

          <!-- Shopper Persona Selector + Custom Profile Creator + Multi-Photo Gallery -->
          <section class="tryit-card">
            <div class="tryit-section-header">
              <span>1. Select Person or Create Profile</span>
              <div class="tryit-upload-controls">
                <button id="tryit-toggle-creator-btn" class="tryit-mini-action" type="button">+ Create Profile</button>
                <button id="tryit-webcam-btn" class="tryit-mini-action" type="button">📷 Webcam</button>
              </div>
            </div>

            <!-- Create Custom Profile Form (e.g., Zain Ali) -->
            <div id="tryit-profile-creator" class="hidden" style="background:#F4F1FD;border:1px solid #DDD6FE;border-radius:10px;padding:12px;margin-bottom:10px;">
              <div style="font-size:0.76rem;font-weight:700;color:#6D28D9;margin-bottom:8px;">
                Create Person Profile (e.g., Zain Ali)
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <input id="tryit-new-name" type="text" placeholder="Name (e.g., Zain Ali)" style="padding:7px 9px;border-radius:7px;border:1px solid #DDD6FE;background:#FFFFFF;color:#0F172A;font-size:0.78rem;" />
                <select id="tryit-new-gender" style="padding:7px 9px;border-radius:7px;border:1px solid #DDD6FE;background:#FFFFFF;color:#0F172A;font-size:0.78rem;">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <select id="tryit-new-ethnicity" style="padding:7px 9px;border-radius:7px;border:1px solid #DDD6FE;background:#FFFFFF;color:#0F172A;font-size:0.78rem;">
                  <option value="South Asian">South Asian</option>
                  <option value="Asian">Asian</option>
                  <option value="African">African</option>
                  <option value="American">American</option>
                  <option value="Latin">Latin</option>
                  <option value="Middle Eastern">Middle Eastern</option>
                </select>
                <select id="tryit-new-size" style="padding:7px 9px;border-radius:7px;border:1px solid #DDD6FE;background:#FFFFFF;color:#0F172A;font-size:0.78rem;">
                  <option value="S">Size S</option>
                  <option value="M" selected>Size M</option>
                  <option value="L">Size L</option>
                  <option value="XL">Size XL</option>
                </select>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px;">
                <label class="tryit-mini-action" for="tryit-new-profile-photo" style="cursor:pointer;">📷 Initial Photo</label>
                <input id="tryit-new-profile-photo" type="file" accept="image/*" style="display:none" />
                <span id="tryit-new-photo-status" style="font-size:0.7rem;color:#64748B;flex:1;">Optional</span>
                <button id="tryit-save-profile-btn" class="tryit-btn-small" type="button">Save Profile</button>
              </div>
            </div>

            <!-- Filter Tabs (All / Women / Men / My Profiles) -->
            <div id="tryit-gender-filters" style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
              <button class="tryit-mini-action active" data-gfilter="all" type="button">All (8+)</button>
              <button class="tryit-mini-action" data-gfilter="female" type="button">Women</button>
              <button class="tryit-mini-action" data-gfilter="male" type="button">Men</button>
              <button class="tryit-mini-action" data-gfilter="custom" type="button">My Profiles</button>
            </div>

            <div id="tryit-persona-tabs" class="tryit-persona-tabs" style="max-height:190px;overflow-y:auto;"></div>

            <!-- Multi-Photo Gallery for Selected Profile -->
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid #E5E7EB;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span id="tryit-photo-strip-label" style="font-size:0.75rem;font-weight:700;color:#0F172A;">
                  2. Choose Photo of Maya Lin
                </span>
                <span style="font-size:0.68rem;color:#64748B;">Click a photo to use for Try-On</span>
              </div>
              <div id="tryit-photo-strip" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;align-items:center;"></div>
              <input id="tryit-photo-upload" type="file" accept="image/*" style="display:none" />
            </div>

            <!-- Live Webcam Modal Container -->
            <div id="tryit-webcam-box" class="tryit-webcam-box hidden">
              <video id="tryit-webcam-video" autoplay playsinline muted></video>
              <div class="tryit-webcam-actions">
                <button id="tryit-capture-btn" class="tryit-primary-btn" type="button">📸 Capture Frame to Profile</button>
                <button id="tryit-cancel-webcam-btn" class="tryit-secondary-btn" type="button">Cancel</button>
              </div>
            </div>
          </section>

          <!-- Action Triggers (Manual User Go-Ahead) -->
          <div class="tryit-action-row">
            <button id="tryit-run-btn" class="tryit-primary-btn" type="button">
              ✨ Try It On Selected Photo
            </button>
            <button id="tryit-chain-btn" class="tryit-chain-btn hidden" type="button">
              ⛓️ Chain with Pinned Look
            </button>
          </div>

          <!-- Split-Polling Progress Indicator -->
          <div id="tryit-loading-box" class="tryit-loading-box hidden">
            <div class="tryit-spinner"></div>
            <div>
              <div id="tryit-loading-stage" class="tryit-loading-stage">Styling your look...</div>
              <div class="tryit-loading-sub">Powered by YouCam &amp; Gemini API</div>
            </div>
          </div>

          <!-- Visual VTO & Skin AI Result Canvas -->
          <section id="tryit-result-section" class="tryit-result-section hidden">
            <div class="tryit-canvas-wrapper">
              <div class="tryit-canvas-badges">
                <span id="tryit-endpoint-badge" class="tryit-endpoint-badge">Styled Preview</span>
                <div class="tryit-canvas-tools">
                  <button id="tryit-compare-btn" class="tryit-tool-pill" type="button">👁️ Before / After</button>
                  <button id="tryit-pin-btn" class="tryit-tool-pill tryit-pin-pill" type="button">📌 Pin to Look</button>
                  <a id="tryit-download-link" class="tryit-tool-pill" href="#" download="tryit-ai-look.png">⬇ Save</a>
                </div>
              </div>
              <img id="tryit-result-img" src="" alt="TryIt AI Output" class="tryit-result-img" />
              <!-- Add Result Photo into Active Profile Gallery -->
              <div style="padding:10px 12px;background:#F4F1FD;border-top:1px solid #DDD6FE;display:flex;justify-content:space-between;align-items:center;gap:8px;">
                <span style="font-size:0.74rem;color:#0F172A;font-weight:600;">Save this rendered photo to profile:</span>
                <button id="tryit-save-to-profile-btn" class="tryit-tool-pill tryit-pin-pill" type="button">
                  📥 Add Photo to Profile
                </button>
              </div>
            </div>

            <!-- Edit Look by Text Command -->
            <div class="tryit-card">
              <div class="tryit-section-header" style="margin-bottom:4px;">
                <span>Edit Look by Text Command</span>
              </div>
              <p style="font-size:0.72rem;color:#64748B;margin-bottom:8px;">
                Remove or add a specific item (e.g., "remove jacket", "add leather boots", "add cashmere scarf")
              </p>
              <div style="display:flex;gap:6px;">
                <input
                  id="tryit-edit-cmd-input"
                  type="text"
                  placeholder="e.g., Remove last item, or Add leather boots..."
                  style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid #DDD6FE;background:#FFFFFF;color:#0F172A;font-size:0.78rem;"
                />
                <button id="tryit-edit-cmd-btn" class="tryit-btn-small" type="button">Apply Edit</button>
              </div>
              <div id="tryit-quick-edit-chips" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
                <button class="tryit-mini-action" data-editcmd="Remove last item" type="button">✕ Remove last item</button>
                <button class="tryit-mini-action" data-editcmd="Add obsidian leather boots" type="button">+ Add leather boots</button>
                <button class="tryit-mini-action" data-editcmd="Add camel cashmere scarf" type="button">+ Add cashmere scarf</button>
                <button class="tryit-mini-action" data-editcmd="Add quilted crossbody bag" type="button">+ Add crossbody bag</button>
              </div>
            </div>

            <!-- Moment of Decision Agentic Pre-Checkout Verdict Card -->
            <div id="tryit-verdict-card" class="tryit-verdict-card">
              <div class="tryit-verdict-top">
                <div>
                  <span class="tryit-verdict-label">STYLIST &amp; DERMAL COMPATIBILITY VERDICT</span>
                  <h4 id="tryit-verdict-headline" class="tryit-verdict-headline"></h4>
                </div>
                <div id="tryit-score-ring" class="tryit-score-ring">94%</div>
              </div>
              <p id="tryit-verdict-advice" class="tryit-verdict-advice"></p>
              <ul id="tryit-verdict-factors" class="tryit-verdict-factors"></ul>
            </div>

            <!-- Quantitative Skin Analysis Telemetry -->
            <div class="tryit-card">
              <div class="tryit-section-header">
                <span>Skin Compatibility Telemetry (6 Biomarkers)</span>
                <span id="tryit-overall-skin" class="tryit-pill-badge">Composite: --/100</span>
              </div>
              <div id="tryit-skin-grid" class="tryit-skin-grid"></div>
            </div>
          </section>
        </div>

        <!-- Required Footer Attribution -->
        <footer style="padding:10px 20px;border-top:1px solid #DDD6FE;background:#F4F1FD;text-align:center;font-size:0.72rem;color:#64748B;letter-spacing:0.06em;text-transform:uppercase;font-weight:700;">
          Powered by <span style="color:#7C3AED;">YouCam</span> &amp; <span style="color:#6D28D9;">Gemini API</span>
        </footer>
      </aside>
    `;
    document.body.appendChild(root);

    // Bind events
    document.getElementById("tryit-close-btn").addEventListener("click", closeDrawer);
    document.getElementById("tryit-backdrop").addEventListener("click", closeDrawer);
    document.getElementById("tryit-keys-toggle").addEventListener("click", () => {
      document.getElementById("tryit-keys-panel").classList.toggle("hidden");
    });
    document.getElementById("tryit-save-keys-btn").addEventListener("click", () => {
      state.overrideYouCamKey = document.getElementById("tryit-input-youcam").value.trim();
      state.overrideGeminiKey = document.getElementById("tryit-input-gemini").value.trim();
      localStorage.setItem("tryit_youcam_key", state.overrideYouCamKey);
      localStorage.setItem("tryit_gemini_key", state.overrideGeminiKey);
      document.getElementById("tryit-keys-panel").classList.add("hidden");
    });

    document.getElementById("tryit-run-btn").addEventListener("click", () => executeTryOn(false));
    document.getElementById("tryit-chain-btn").addEventListener("click", () => executeTryOn(true));

    document.getElementById("tryit-compare-btn").addEventListener("click", toggleBeforeAfter);
    document.getElementById("tryit-pin-btn").addEventListener("click", pinCurrentResultToLook);

    // Toggle Custom Profile Creator
    document.getElementById("tryit-toggle-creator-btn").addEventListener("click", () => {
      document.getElementById("tryit-profile-creator").classList.toggle("hidden");
    });

    document.getElementById("tryit-new-profile-photo").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        state.newProfileDraftPhoto = reader.result;
        document.getElementById("tryit-new-photo-status").textContent = "✓ Photo ready";
      };
      reader.readAsDataURL(file);
    });

    document.getElementById("tryit-save-profile-btn").addEventListener("click", () => {
      const nameInput = document.getElementById("tryit-new-name");
      const name = (nameInput.value || "").trim() || "Zain Ali";
      const gender = document.getElementById("tryit-new-gender").value || "male";
      const ethnicity = document.getElementById("tryit-new-ethnicity").value || "South Asian";
      const size = document.getElementById("tryit-new-size").value || "M";

      const fallbackAvatar =
        gender === "male"
          ? `${API_BASE}/static/assets/persona_kenji_full.png`
          : `${API_BASE}/static/assets/persona_maya_full.png`;
      const firstPhotoUrl = state.newProfileDraftPhoto || fallbackAvatar;
      const profileId = `custom_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${Date.now().toString().slice(-4)}`;

      const newProfile = {
        persona_id: profileId,
        person_name: name,
        gender,
        ethnicity,
        is_custom: true,
        height_cm: gender === "male" ? 179 : 166,
        usual_size: size,
        skin_type: "Normal",
        undertone: "Warm Neutral",
        full_body_image_url: firstPhotoUrl,
        face_image_url: firstPhotoUrl,
        photos: [
          {
            photo_id: `ph_${Date.now()}`,
            label: state.newProfileDraftPhoto ? "Uploaded Photo 1" : "Studio Pose",
            url: firstPhotoUrl,
          },
        ],
        baseline_skin_scores: {
          moisture: 76,
          redness: 84,
          acne: 82,
          pores: 78,
          wrinkles: 88,
          texture: 81,
        },
      };

      state.customProfiles = [newProfile, ...(state.customProfiles || [])];
      saveCustomProfiles();
      state.selectedPersonaId = newProfile.persona_id;
      state.selectedPhotoUrl = firstPhotoUrl;
      state.newProfileDraftPhoto = null;
      nameInput.value = "";
      document.getElementById("tryit-new-photo-status").textContent = "Optional";
      document.getElementById("tryit-profile-creator").classList.add("hidden");
      renderPersonas();
      renderProfilePhotoStrip();
    });

    // Gender / Origin filters
    document.querySelectorAll("#tryit-gender-filters [data-gfilter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.genderFilter = btn.getAttribute("data-gfilter") || "all";
        document.querySelectorAll("#tryit-gender-filters [data-gfilter]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderPersonas();
      });
    });

    // Upload additional photo into active profile
    document.getElementById("tryit-photo-upload").addEventListener("change", handlePhotoUpload);

    // Add Result Photo into Active Profile Gallery
    document.getElementById("tryit-save-to-profile-btn").addEventListener("click", () => {
      if (!state.lastCompletedTask) return;
      const fullResultUrl = resolveUrl(state.lastCompletedTask.result_image_url);
      const profile = getSelectedProfile();
      const label = state.currentProduct
        ? `Tried: ${state.currentProduct.title.slice(0, 18)}`
        : "Saved Try-On Look";
      addPhotoToProfile(fullResultUrl, label);
      const btn = document.getElementById("tryit-save-to-profile-btn");
      btn.textContent = `✓ Added to ${profile.person_name}'s Photos`;
      setTimeout(() => {
        btn.textContent = `📥 Add to ${profile.person_name}'s Photos`;
      }, 2000);
    });

    // Text Command Edit events
    document.getElementById("tryit-edit-cmd-btn").addEventListener("click", () => {
      const input = document.getElementById("tryit-edit-cmd-input");
      const cmd = (input.value || "").trim();
      if (cmd) executeTextCommandEdit(cmd);
    });
    document.getElementById("tryit-edit-cmd-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = (e.target.value || "").trim();
        if (cmd) executeTextCommandEdit(cmd);
      }
    });
    document.querySelectorAll("#tryit-quick-edit-chips [data-editcmd]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const cmd = chip.getAttribute("data-editcmd");
        document.getElementById("tryit-edit-cmd-input").value = cmd;
        executeTextCommandEdit(cmd);
      });
    });

    // Webcam controls
    document.getElementById("tryit-webcam-btn").addEventListener("click", startWebcam);
    document.getElementById("tryit-capture-btn").addEventListener("click", captureWebcamFrame);
    document.getElementById("tryit-cancel-webcam-btn").addEventListener("click", stopWebcam);
  }

  function addPhotoToProfile(photoUrl, label) {
    const active = JSON.parse(JSON.stringify(getSelectedProfile()));
    if (!Array.isArray(active.photos) || active.photos.length === 0) {
      active.photos = [
        {
          photo_id: `${active.persona_id}_default`,
          label: "Full-Body Look",
          url: active.full_body_image_url,
        },
      ];
    }
    active.photos.push({
      photo_id: `ph_${Date.now()}`,
      label: label || `Photo ${active.photos.length + 1}`,
      url: photoUrl,
    });
    state.selectedPhotoUrl = photoUrl;

    const idx = (state.customProfiles || []).findIndex((cp) => cp.persona_id === active.persona_id);
    if (idx >= 0) {
      state.customProfiles[idx] = active;
    } else {
      state.customProfiles = [...(state.customProfiles || []), active];
    }
    saveCustomProfiles();
    renderPersonas();
    renderProfilePhotoStrip();
  }

  async function loadPersonas() {
    try {
      const resp = await fetch(`${API_BASE}/api/personas`);
      const data = await resp.json();
      state.personas = data.personas || [];
    } catch (err) {
      console.warn("Fallback personas loaded:", err);
    }
    renderPersonas();
    renderProfilePhotoStrip();
    renderPinnedBanner();
  }

  function renderPersonas() {
    const container = document.getElementById("tryit-persona-tabs");
    if (!container) return;

    const all = getAllProfiles();
    const filtered = all.filter((p) => {
      if (state.genderFilter === "female") return p.gender === "female";
      if (state.genderFilter === "male") return p.gender === "male";
      if (state.genderFilter === "custom") return Boolean(p.is_custom);
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div style="grid-column:1/-1;font-size:0.78rem;color:#94A3B8;padding:8px;">No custom profiles yet. Click "+ Create Profile" to add one (e.g., Zain Ali).</div>`;
      return;
    }

    container.innerHTML = filtered
      .map((p) => {
        const active = p.persona_id === state.selectedPersonaId ? "active" : "";
        const thumbUrl = resolveUrl(
          (p.photos && p.photos[0] && p.photos[0].url) || p.face_image_url || p.full_body_image_url
        );
        const origin = p.ethnicity || (p.is_custom ? "Custom" : "Model");
        const genderText = p.gender === "male" ? "Male" : "Female";
        const photoCount = Array.isArray(p.photos) ? p.photos.length : 1;
        return `
          <button type="button" class="tryit-persona-card ${active}" data-persona="${p.persona_id}">
            <img src="${thumbUrl}" alt="${p.person_name}" class="tryit-persona-avatar" />
            <div class="tryit-persona-info">
              <div class="tryit-persona-name">${p.person_name}</div>
              <div class="tryit-persona-meta">${origin} • ${genderText} • Size ${p.usual_size}</div>
              <div class="tryit-persona-sub">${photoCount} Photo${photoCount > 1 ? "s" : ""} • ${p.undertone}</div>
            </div>
          </button>
        `;
      })
      .join("");

    container.querySelectorAll(".tryit-persona-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedPersonaId = btn.getAttribute("data-persona");
        const selected = getSelectedProfile();
        state.selectedPhotoUrl =
          (selected.photos && selected.photos[0] && selected.photos[0].url) ||
          selected.full_body_image_url;
        renderPersonas();
        renderProfilePhotoStrip();
      });
    });
  }

  function renderProfilePhotoStrip() {
    const strip = document.getElementById("tryit-photo-strip");
    const labelEl = document.getElementById("tryit-photo-strip-label");
    if (!strip || !labelEl) return;

    const profile = getSelectedProfile();
    labelEl.textContent = `2. ${profile.person_name}'s Photos (Choose One)`;

    const saveBtn = document.getElementById("tryit-save-to-profile-btn");
    if (saveBtn) {
      saveBtn.textContent = `📥 Add to ${profile.person_name}'s Photos`;
    }

    const photos =
      Array.isArray(profile.photos) && profile.photos.length > 0
        ? profile.photos
        : [
            {
              photo_id: `${profile.persona_id}_full`,
              label: "Full-Body Look",
              url: profile.full_body_image_url,
            },
            {
              photo_id: `${profile.persona_id}_face`,
              label: "Close-Up Portrait",
              url: profile.face_image_url,
            },
          ];

    if (!state.selectedPhotoUrl || !photos.some((ph) => ph.url === state.selectedPhotoUrl)) {
      state.selectedPhotoUrl = photos[0].url;
    }

    strip.innerHTML =
      photos
        .map((ph) => {
          const isSel = ph.url === state.selectedPhotoUrl;
          const border = isSel ? "2px solid #7C3AED" : "1px solid #DDD6FE";
          return `
            <button type="button" class="tryit-photo-thumb" data-photourl="${ph.url}" style="position:relative;width:56px;height:70px;border-radius:6px;border:${border};padding:0;overflow:hidden;background:#F4F1FD;cursor:pointer;flex-shrink:0;">
              <img src="${resolveUrl(ph.url)}" alt="${ph.label}" style="width:100%;height:100%;object-fit:cover;display:block;" />
              <span style="position:absolute;bottom:0;left:0;right:0;background:rgba(15,23,42,0.72);color:#fff;font-size:0.55rem;padding:2px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ph.label}</span>
            </button>
          `;
        })
        .join("") +
      `
        <label for="tryit-photo-upload" style="width:56px;height:70px;border-radius:6px;border:1px dashed #7C3AED;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#7C3AED;font-size:0.64rem;font-weight:700;cursor:pointer;flex-shrink:0;text-align:center;padding:4px;background:#F4F1FD;">
          <span>＋</span>
          <span>Add Photo</span>
        </label>
      `;

    strip.querySelectorAll(".tryit-photo-thumb").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedPhotoUrl = btn.getAttribute("data-photourl");
        renderProfilePhotoStrip();
      });
    });
  }

  function renderPinnedBanner() {
    const banner = document.getElementById("tryit-pinned-banner");
    const chainBtn = document.getElementById("tryit-chain-btn");
    if (!banner || !chainBtn) return;

    if (!state.pinnedLook) {
      banner.classList.add("hidden");
      chainBtn.classList.add("hidden");
      return;
    }

    banner.classList.remove("hidden");
    chainBtn.classList.remove("hidden");
    banner.innerHTML = `
      <div class="tryit-pinned-inner">
        <img src="${state.pinnedLook.result_image_url}" alt="Pinned Look" class="tryit-pinned-thumb" />
        <div class="tryit-pinned-text">
          <div class="tryit-pinned-tag">📌 PINNED BASE LOOK (READY FOR OUTFIT PAIRING)</div>
          <div class="tryit-pinned-title">${state.pinnedLook.product.brand || "Store A"}: ${state.pinnedLook.product.title}</div>
        </div>
        <button id="tryit-clear-pin-btn" class="tryit-clear-pin-btn" type="button" title="Clear Pinned Look">✕</button>
      </div>
    `;
    document.getElementById("tryit-clear-pin-btn").addEventListener("click", () => savePinnedLook(null));
  }

  function handlePhotoUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const profile = getSelectedProfile();
      addPhotoToProfile(reader.result, `Photo ${(profile.photos || []).length + 1}`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function startWebcam() {
    const box = document.getElementById("tryit-webcam-box");
    const video = document.getElementById("tryit-webcam-video");
    try {
      state.webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 720, height: 920 } });
      video.srcObject = state.webcamStream;
      box.classList.remove("hidden");
    } catch (err) {
      alert("Webcam access unavailable in this browser context. Please use a Pre-Loaded Persona or Upload Photo.");
    }
  }

  function captureWebcamFrame() {
    const video = document.getElementById("tryit-webcam-video");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 920;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    addPhotoToProfile(dataUrl, "Webcam Capture");
    stopWebcam();
  }

  function stopWebcam() {
    if (state.webcamStream) {
      state.webcamStream.getTracks().forEach((t) => t.stop());
      state.webcamStream = null;
    }
    document.getElementById("tryit-webcam-box").classList.add("hidden");
  }

  /**
   * Opens the drawer for a product.
   * Default `autoRun = false` so clicking "TryIt with AI" lets the user select a profile & photo first!
   */
  function openWithProduct(product, autoRun = false, autoChain = false) {
    injectDrawerDOM();
    state.currentProduct = {
      title: product.title || "Selected Product",
      brand: product.brand || "FEATURED STORE",
      category_hint: product.category_hint || "",
      price: product.price || "$0.00",
      image_url: resolveUrl(product.image_url),
      ingredients: product.ingredients || "",
      selected_shade_hex: product.selected_shade_hex || "#D94E64",
      page_url: window.location.href,
    };

    document.getElementById("tryit-prod-thumb").src = state.currentProduct.image_url;
    document.getElementById("tryit-prod-brand").textContent = state.currentProduct.brand;
    document.getElementById("tryit-prod-price").textContent = state.currentProduct.price;
    document.getElementById("tryit-prod-title").textContent = state.currentProduct.title;
    document.getElementById("tryit-prod-ingredients").textContent =
      state.currentProduct.ingredients || "Standard retail product attributes";

    document.getElementById("tryit-loading-box").classList.add("hidden");
    document.getElementById("tryit-result-section").classList.add("hidden");

    document.getElementById("tryit-drawer").classList.add("open");
    document.getElementById("tryit-backdrop").classList.add("open");
    state.isOpen = true;
    renderPersonas();
    renderProfilePhotoStrip();
    renderPinnedBanner();

    if (autoRun) {
      executeTryOn(autoChain && Boolean(state.pinnedLook));
    }
  }

  function closeDrawer() {
    stopWebcam();
    const drawer = document.getElementById("tryit-drawer");
    const backdrop = document.getElementById("tryit-backdrop");
    if (drawer) drawer.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
    state.isOpen = false;
  }

  async function executeTryOn(isChained = false) {
    if (!state.currentProduct) return;

    const loadingBox = document.getElementById("tryit-loading-box");
    const loadingStage = document.getElementById("tryit-loading-stage");
    const resultSection = document.getElementById("tryit-result-section");

    loadingBox.classList.remove("hidden");
    resultSection.classList.add("hidden");
    state.compareBeforeMode = false;

    const persona = getActivePersona();
    state.originalPersonImageUrl = persona.full_body_image_url;
    state.activeOutfitItems =
      isChained && state.pinnedLook
        ? [state.pinnedLook.product, state.currentProduct]
        : [state.currentProduct];

    try {
      let startResp;
      if (isChained && state.pinnedLook) {
        loadingStage.textContent = `Pairing '${state.currentProduct.title}' with your saved look on ${persona.person_name}...`;
        const res = await fetch(`${API_BASE}/api/tryon/chain`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previous_task_id: state.pinnedLook.task_id,
            base_result_image_url: state.pinnedLook.result_image_url,
            pinned_product: state.pinnedLook.product,
            second_product: state.currentProduct,
            persona,
            override_youcam_key: state.overrideYouCamKey || null,
            override_gemini_key: state.overrideGeminiKey || null,
          }),
        });
        startResp = await res.json();
      } else {
        loadingStage.textContent = `Styling '${state.currentProduct.title}' on ${persona.person_name}...`;
        const res = await fetch(`${API_BASE}/api/tryon/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product: state.currentProduct,
            persona,
            override_youcam_key: state.overrideYouCamKey || null,
            override_gemini_key: state.overrideGeminiKey || null,
          }),
        });
        startResp = await res.json();
      }

      let statusData = null;
      for (let attempt = 0; attempt < 22; attempt++) {
        const pollRes = await fetch(`${API_BASE}/api/tryon/status/${encodeURIComponent(startResp.task_id)}`);
        statusData = await pollRes.json();
        if (statusData.status === "completed" || statusData.status === "failed") {
          break;
        }
        await new Promise((r) => setTimeout(r, 950));
      }

      loadingBox.classList.add("hidden");
      if (statusData) {
        renderCompletedResult(statusData);
      }
    } catch (err) {
      loadingBox.classList.add("hidden");
      alert(`TryIt AI request error: ${err.message}`);
    }
  }

  async function executeTextCommandEdit(commandText) {
    if (!state.lastCompletedTask) return;
    const loadingBox = document.getElementById("tryit-loading-box");
    const loadingStage = document.getElementById("tryit-loading-stage");
    loadingBox.classList.remove("hidden");
    loadingStage.textContent = `Applying text command: "${commandText}"...`;

    const persona = getActivePersona();
    const currentResultUrl = resolveUrl(state.lastCompletedTask.result_image_url);
    const originalUrl = state.originalPersonImageUrl || persona.full_body_image_url;

    const isRemove = /\b(remove|delete|without|take off|undo|clear)\b/i.test(commandText);
    if (isRemove && state.activeOutfitItems.length > 0) {
      state.activeOutfitItems = state.activeOutfitItems.slice(0, -1);
    }

    try {
      const res = await fetch(`${API_BASE}/api/tryon/edit-command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command_text: commandText,
          previous_task_id: state.lastCompletedTask.task_id,
          current_result_image_url: currentResultUrl,
          original_person_image_url: originalUrl,
          current_items: state.activeOutfitItems,
          persona,
          override_youcam_key: state.overrideYouCamKey || null,
          override_gemini_key: state.overrideGeminiKey || null,
        }),
      });
      const startResp = await res.json();

      let statusData = null;
      for (let attempt = 0; attempt < 22; attempt++) {
        const pollRes = await fetch(`${API_BASE}/api/tryon/status/${encodeURIComponent(startResp.task_id)}`);
        statusData = await pollRes.json();
        if (statusData.status === "completed" || statusData.status === "failed") {
          break;
        }
        await new Promise((r) => setTimeout(r, 850));
      }

      loadingBox.classList.add("hidden");
      if (statusData) {
        renderCompletedResult(statusData);
        document.getElementById("tryit-edit-cmd-input").value = "";
      }
    } catch (err) {
      loadingBox.classList.add("hidden");
      alert(`Edit command failed: ${err.message}`);
    }
  }

  function renderCompletedResult(data) {
    state.lastCompletedTask = data;
    const resultSection = document.getElementById("tryit-result-section");
    resultSection.classList.remove("hidden");

    const fullResultUrl = resolveUrl(data.result_image_url);
    const imgEl = document.getElementById("tryit-result-img");
    imgEl.src = fullResultUrl;

    const downloadLink = document.getElementById("tryit-download-link");
    downloadLink.href = `${API_BASE}/api/proxy-image?url=${encodeURIComponent(data.result_image_url)}`;

    const chainSuffix =
      data.chained_items && data.chained_items.length > 1
        ? ` • ${data.chained_items.length} Items Styled`
        : "";
    document.getElementById("tryit-endpoint-badge").textContent = `Styled Preview${chainSuffix}`;

    const verdict = data.agent_verdict;
    const verdictCard = document.getElementById("tryit-verdict-card");
    verdictCard.className = `tryit-verdict-card status-${verdict.status_badge}`;
    document.getElementById("tryit-verdict-headline").textContent = verdict.verdict_headline;
    document.getElementById("tryit-score-ring").textContent = `${verdict.match_score}%`;
    document.getElementById("tryit-verdict-advice").textContent = verdict.actionable_advice;

    const factorsList = document.getElementById("tryit-verdict-factors");
    factorsList.innerHTML = (verdict.key_factors || [])
      .map((f) => `<li>${f}</li>`)
      .join("");

    const scores = data.skin_scores;
    if (scores) {
      document.getElementById("tryit-overall-skin").textContent = `Composite: ${scores.overall_score}/100`;
      const metrics = [
        { label: "Moisture", val: scores.moisture },
        { label: "Redness Calm", val: scores.redness },
        { label: "Acne Clarity", val: scores.acne },
        { label: "Pore Refine", val: scores.pores },
        { label: "Smoothness", val: scores.wrinkles },
        { label: "Texture", val: scores.texture },
      ];
      document.getElementById("tryit-skin-grid").innerHTML = metrics
        .map((m) => {
          const barColor = m.val < 50 ? "#EF4444" : m.val < 70 ? "#F59E0B" : "#10B981";
          return `
            <div class="tryit-skin-item">
              <div class="tryit-skin-row">
                <span>${m.label}</span>
                <strong>${m.val}/100</strong>
              </div>
              <div class="tryit-skin-track">
                <div class="tryit-skin-fill" style="width:${m.val}%;background:${barColor}"></div>
              </div>
            </div>
          `;
        })
        .join("");
    }
  }

  function toggleBeforeAfter() {
    if (!state.lastCompletedTask) return;
    state.compareBeforeMode = !state.compareBeforeMode;
    const imgEl = document.getElementById("tryit-result-img");
    const btn = document.getElementById("tryit-compare-btn");

    if (state.compareBeforeMode) {
      imgEl.src = resolveUrl(state.lastCompletedTask.source_image_url);
      btn.textContent = "✨ Show AI Result";
      btn.classList.add("active");
    } else {
      imgEl.src = resolveUrl(state.lastCompletedTask.result_image_url);
      btn.textContent = "👁️ Before / After";
      btn.classList.remove("active");
    }
  }

  function pinCurrentResultToLook() {
    if (!state.lastCompletedTask || !state.currentProduct) return;
    const fullResultUrl = resolveUrl(state.lastCompletedTask.result_image_url);

    savePinnedLook({
      task_id: state.lastCompletedTask.task_id,
      result_image_url: fullResultUrl,
      product: state.currentProduct,
    });

    const pinBtn = document.getElementById("tryit-pin-btn");
    pinBtn.textContent = "✅ Pinned to Look!";
    setTimeout(() => {
      pinBtn.textContent = "📌 Pin to Look";
    }, 1800);
  }

  window.TryItAIWidget = {
    init: async function () {
      injectDrawerDOM();
      await loadPersonas();
    },
    openWithProduct,
    closeDrawer,
    pinLookAndChainNext: async function (firstProduct, secondProduct, personaId = "maya") {
      injectDrawerDOM();
      state.selectedPersonaId = personaId;
      renderPersonas();
      renderProfilePhotoStrip();
      openWithProduct(firstProduct, false, false);
      await executeTryOn(false);
      pinCurrentResultToLook();
      openWithProduct(secondProduct, false, true);
      await executeTryOn(true);
    },
    selectPersona: function (personaId) {
      state.selectedPersonaId = personaId;
      const selected = getSelectedProfile();
      state.selectedPhotoUrl =
        (selected.photos && selected.photos[0] && selected.photos[0].url) ||
        selected.full_body_image_url;
      renderPersonas();
      renderProfilePhotoStrip();
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.TryItAIWidget.init());
  } else {
    window.TryItAIWidget.init();
  }
})();
