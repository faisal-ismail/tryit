/**
 * TryIt AI — Universal Storefront Button Injector & Virtual Fitting Room (`extension/content.js`)
 * Tailored to match ZARR (https://zarr.com.pk) luxury visual identity:
 *   - Clean White (#FFFFFF) & Warm Alabaster (#F8F8F8 / #FAF6EB) surfaces
 *   - ZARR Signature Gold (#BB9935 / #D4AF37) & Jet Black (#000000) accents
 *   - Diverse Pre-Built Personas (Asian, African, American, Latin across Female & Male)
 *   - Custom Person Profiles (e.g., "Zain Ali") with multi-photo gallery & "Add Result Photo to Profile"
 *   - Manual Try-On trigger (never auto-runs without user's go-ahead)
 *   - Natural-Language Text Command Edits (add/remove specific products)
 *   - Footer attribution: Powered by YouCam & Gemini API
 */
(function () {
  if (window.location.pathname.includes("/demo-store") || window.TryItAIWidget) {
    return;
  }

  const ADD_TO_CART_SELECTORS = [
    ".product-form__submit[name='add']", // ZARR (zarr.com.pk) & Shopify OS 2.0
    "#add-to-cart-button", // Amazon
    "#buy-now-button", // Amazon
    'button[data-at="add_to_basket_btn"]', // Sephora
    'button[name="add"]', // Shopify universal
    "button.single_add_to_cart_button", // WooCommerce
    'button[data-qa-action="add-to-cart"]', // Zara
    'button[aria-label*="Add to Cart" i]',
    'button[aria-label*="Add to Bag" i]',
    'button[id*="add-to-cart" i]',
    'button[class*="add-to-cart" i]',
    'button[class*="add-to-bag" i]',
  ];

  // Fallback diverse pre-built personas if backend is still loading
  const DEFAULT_DIVERSE_PERSONAS = [
    {
      persona_id: "maya",
      person_name: "Maya Lin",
      gender: "female",
      ethnicity: "Asian",
      height_cm: 166,
      usual_size: "M",
      skin_type: "Dry & Sensitive",
      undertone: "Warm Olive",
      full_body_image_url: "/static/assets/persona_maya_full.png",
      face_image_url: "/static/assets/persona_maya_face.png",
      photos: [
        { photo_id: "maya_full", label: "Full-Body Look", url: "/static/assets/persona_maya_full.png" },
        { photo_id: "maya_face", label: "Close-Up Portrait", url: "/static/assets/persona_maya_face.png" },
      ],
    },
    {
      persona_id: "kenji",
      person_name: "Kenji Sato",
      gender: "male",
      ethnicity: "Asian",
      height_cm: 178,
      usual_size: "L",
      skin_type: "Combination",
      undertone: "Warm Neutral",
      full_body_image_url: "/static/assets/persona_kenji_full.png",
      face_image_url: "/static/assets/persona_kenji_face.png",
      photos: [
        { photo_id: "kenji_full", label: "Full-Body Look", url: "/static/assets/persona_kenji_full.png" },
        { photo_id: "kenji_face", label: "Close-Up Portrait", url: "/static/assets/persona_kenji_face.png" },
      ],
    },
    {
      persona_id: "zara",
      person_name: "Zara Okafor",
      gender: "female",
      ethnicity: "African",
      height_cm: 171,
      usual_size: "S",
      skin_type: "Normal",
      undertone: "Rich Warm",
      full_body_image_url: "/static/assets/persona_zara_full.png",
      face_image_url: "/static/assets/persona_zara_face.png",
      photos: [
        { photo_id: "zara_full", label: "Full-Body Look", url: "/static/assets/persona_zara_full.png" },
        { photo_id: "zara_face", label: "Close-Up Portrait", url: "/static/assets/persona_zara_face.png" },
      ],
    },
    {
      persona_id: "malik",
      person_name: "Malik Mensah",
      gender: "male",
      ethnicity: "African",
      height_cm: 184,
      usual_size: "L",
      skin_type: "Normal",
      undertone: "Deep Warm",
      full_body_image_url: "/static/assets/persona_malik_full.png",
      face_image_url: "/static/assets/persona_malik_face.png",
      photos: [
        { photo_id: "malik_full", label: "Full-Body Look", url: "/static/assets/persona_malik_full.png" },
        { photo_id: "malik_face", label: "Close-Up Portrait", url: "/static/assets/persona_malik_face.png" },
      ],
    },
    {
      persona_id: "claire",
      person_name: "Claire Bennett",
      gender: "female",
      ethnicity: "American",
      height_cm: 169,
      usual_size: "M",
      skin_type: "Combination",
      undertone: "Cool Fair",
      full_body_image_url: "/static/assets/persona_claire_full.png",
      face_image_url: "/static/assets/persona_claire_face.png",
      photos: [
        { photo_id: "claire_full", label: "Full-Body Look", url: "/static/assets/persona_claire_full.png" },
        { photo_id: "claire_face", label: "Close-Up Portrait", url: "/static/assets/persona_claire_face.png" },
      ],
    },
    {
      persona_id: "liam",
      person_name: "Liam Vance",
      gender: "male",
      ethnicity: "American",
      height_cm: 182,
      usual_size: "L",
      skin_type: "Oily & Blemish-Prone",
      undertone: "Cool Neutral",
      full_body_image_url: "/static/assets/persona_liam_full.png",
      face_image_url: "/static/assets/persona_liam_face.png",
      photos: [
        { photo_id: "liam_full", label: "Full-Body Look", url: "/static/assets/persona_liam_full.png" },
        { photo_id: "liam_face", label: "Close-Up Portrait", url: "/static/assets/persona_liam_face.png" },
      ],
    },
    {
      persona_id: "sofia",
      person_name: "Sofia Morales",
      gender: "female",
      ethnicity: "Latin",
      height_cm: 164,
      usual_size: "S",
      skin_type: "Normal",
      undertone: "Golden Tan",
      full_body_image_url: "/static/assets/persona_sofia_full.png",
      face_image_url: "/static/assets/persona_sofia_face.png",
      photos: [
        { photo_id: "sofia_full", label: "Full-Body Look", url: "/static/assets/persona_sofia_full.png" },
        { photo_id: "sofia_face", label: "Close-Up Portrait", url: "/static/assets/persona_sofia_face.png" },
      ],
    },
    {
      persona_id: "mateo",
      person_name: "Mateo Rivera",
      gender: "male",
      ethnicity: "Latin",
      height_cm: 179,
      usual_size: "M",
      skin_type: "Combination",
      undertone: "Warm Bronze",
      full_body_image_url: "/static/assets/persona_mateo_full.png",
      face_image_url: "/static/assets/persona_mateo_face.png",
      photos: [
        { photo_id: "mateo_full", label: "Full-Body Look", url: "/static/assets/persona_mateo_full.png" },
        { photo_id: "mateo_face", label: "Close-Up Portrait", url: "/static/assets/persona_mateo_face.png" },
      ],
    },
  ];

  let shadowRoot = null;
  let extState = {
    backendUrl: (window.TRYIT_CONFIG && window.TRYIT_CONFIG.DEFAULT_BACKEND_URL) || "http://localhost:8000",
    personas: DEFAULT_DIVERSE_PERSONAS,
    customProfiles: [],
    selectedPersonaId: "maya",
    selectedPhotoUrl: null,
    genderFilter: "all", // "all" | "female" | "male" | "custom"
    newProfileDraftPhoto: null,
    scrapedProduct: null,
    pinnedLook: null,
    lastResult: null,
    activeOutfitItems: [],
    originalPersonImageUrl: null,
    compareBefore: false,
  };

  function isInsideCartDrawer(el) {
    if (!el || !el.closest) return false;
    return Boolean(
      el.closest(
        "cart-drawer, .cart-drawer, #CartDrawer, #cart-notification, .mini-cart, [id*='cart-drawer' i]"
      )
    );
  }

  function resolveImageUrl(url) {
    if (!url) return "";
    if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    if (url.startsWith("/")) {
      return `${extState.backendUrl}${url}`;
    }
    return url;
  }

  function getAllProfiles() {
    // Merge customProfiles first, then pre-built personas (allowing saved photos on pre-built profiles too)
    const customMap = new Map();
    (extState.customProfiles || []).forEach((cp) => customMap.set(cp.persona_id, cp));

    const mergedPrebuilt = (extState.personas || DEFAULT_DIVERSE_PERSONAS).map((p) => {
      if (customMap.has(p.persona_id)) {
        return customMap.get(p.persona_id);
      }
      return p;
    });

    const pureCustom = (extState.customProfiles || []).filter(
      (cp) => !mergedPrebuilt.some((mp) => mp.persona_id === cp.persona_id)
    );

    return [...pureCustom, ...mergedPrebuilt];
  }

  function getSelectedProfile() {
    const all = getAllProfiles();
    return all.find((p) => p.persona_id === extState.selectedPersonaId) || all[0];
  }

  /**
   * Scrapes product title, brand, price, high-res image, and fabric/ingredients from ZARR & any eCommerce page.
   */
  function scrapeCurrentProductPage() {
    let title = "";
    let price = "";
    let imageUrl = "";
    let brand = window.location.hostname.replace(/^www\./, "").split(".")[0].toUpperCase();
    let categoryHint = "";
    let ingredients = "";

    const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of ldScripts) {
      try {
        const raw = JSON.parse(script.textContent || "{}");
        const nodes = Array.isArray(raw) ? raw : raw["@graph"] ? raw["@graph"] : [raw];
        for (const node of nodes) {
          if (
            node &&
            (node["@type"] === "Product" ||
              (Array.isArray(node["@type"]) && node["@type"].includes("Product")))
          ) {
            title = title || node.name || "";
            if (node.image) {
              imageUrl = Array.isArray(node.image)
                ? node.image[0]
                : typeof node.image === "object"
                ? node.image.url
                : node.image;
            }
            if (node.brand) {
              brand = typeof node.brand === "object" ? node.brand.name || brand : node.brand;
            }
            categoryHint = categoryHint || node.category || "";
            ingredients = ingredients || node.description || "";
            const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
            if (offers && offers.price) {
              const currency = offers.priceCurrency || "PKR";
              price =
                currency === "USD"
                  ? `$${offers.price}`
                  : currency === "PKR"
                  ? `Rs. ${Number(offers.price).toLocaleString()}`
                  : `${currency} ${offers.price}`;
            }
          }
        }
      } catch (_) {}
    }

    if (!title) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      title =
        document.querySelector(".product__title h1, .product-single__title, h1")?.innerText?.trim() ||
        (ogTitle && ogTitle.content) ||
        document.title;
    }

    if (!imageUrl) {
      const ogImg = document.querySelector('meta[property="og:image"]');
      const mainImg =
        document.querySelector(".product__media img, .product-gallery__media img, #landingImage") ||
        document.querySelector('img[data-at="product_image"]') ||
        document.querySelector("main img");
      imageUrl = (ogImg && ogImg.content) || (mainImg && (mainImg.currentSrc || mainImg.src)) || "";
    }
    if (imageUrl && imageUrl.startsWith("//")) {
      imageUrl = `https:${imageUrl}`;
    }

    if (!price) {
      const priceEl =
        document.querySelector(".price-item--sale, .price-item--regular, .product__price") ||
        document.querySelector(".a-price .a-offscreen") ||
        document.querySelector('[data-at="price"], .woocommerce-Price-amount, [class*="price" i]');
      price = priceEl ? priceEl.innerText.trim().split("\n")[0] : "";
    }

    const vendorEl = document.querySelector(
      ".product__text.caption-with-letter-spacing, .product__vendor a, .product-vendor"
    );
    if (vendorEl && vendorEl.innerText.trim()) {
      brand = vendorEl.innerText.trim().toUpperCase();
    }

    if (!categoryHint) {
      const crumbs = Array.from(
        document.querySelectorAll(
          ".breadcrumbs a, nav[aria-label*='breadcrumb' i] a, #wayfinding-breadcrumbs_feature_div a"
        )
      )
        .map((a) => a.innerText.trim())
        .filter(Boolean);
      categoryHint = crumbs.join(" > ");
    }

    const descNode =
      document.querySelector(".product__description, .product-single__description") ||
      document.querySelector('[data-at="ingredients_section"]') ||
      document.querySelector('[id*="ingredient" i], [class*="ingredient" i]');
    if (descNode && descNode.innerText) {
      ingredients = descNode.innerText.replace(/\s+/g, " ").trim().slice(0, 450);
    } else if (!ingredients) {
      const metaDesc = document.querySelector('meta[name="description"]');
      ingredients = (metaDesc && metaDesc.content) || "";
    }

    return {
      title: title.slice(0, 160),
      brand: String(brand).slice(0, 40),
      category_hint: String(categoryHint).slice(0, 120),
      price: String(price).slice(0, 35),
      image_url: imageUrl,
      ingredients: String(ingredients).slice(0, 450),
      page_url: window.location.href,
    };
  }

  function cleanShopperText(text) {
    if (!text) return "";
    return text
      .replace(/Rendered via YouCam `[^`]+` pipeline\.\s*/gi, "")
      .replace(/YouCam Skin AI/gi, "Skin Analysis")
      .replace(/YouCam Skin Analysis/gi, "Skin Analysis")
      .replace(/YouCam Makeup VTO & Skin Tone telemetry/gi, "Shade & Undertone Analysis")
      .replace(/Sequential YouCam VTO Chaining succeeded!\s*/gi, "")
      .replace(/Task #1 rendered/gi, "Styled")
      .replace(/and piped the composite output into Task #2 \(`[^`]+`\) for/gi, "paired seamlessly with")
      .trim();
  }

  /**
   * Injects the ZARR-styled "✨ TRY IT ON" button next to or below the native Add to Cart button.
   */
  function findAndInjectTryItButtons() {
    const candidates = [];
    for (const sel of ADD_TO_CART_SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => {
        if (!isInsideCartDrawer(el)) candidates.push(el);
      });
    }

    if (candidates.length === 0) {
      document.querySelectorAll("button, input[type='submit'], a[role='button']").forEach((btn) => {
        if (isInsideCartDrawer(btn)) return;
        const text = (btn.innerText || btn.value || "").trim().toLowerCase();
        if (
          text === "add to cart" ||
          text === "add to bag" ||
          text === "add to basket" ||
          text === "buy now"
        ) {
          candidates.push(btn);
        }
      });
    }

    candidates.slice(0, 2).forEach((targetBtn) => {
      if (targetBtn.dataset.tryitInjected === "true") return;
      targetBtn.dataset.tryitInjected = "true";

      const tryitBtn = document.createElement("button");
      tryitBtn.type = "button";
      tryitBtn.className = "tryit-ai-injected-dom-btn";
      tryitBtn.innerHTML = `<span class="tryit-sparkle">✨</span><span>Try It On</span>`;
      tryitBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const product = scrapeCurrentProductPage();
        openShadowDrawer(product);
      });

      const submitWrapper = targetBtn.closest(".product-form__submit-wrapper");
      if (submitWrapper && submitWrapper.parentNode) {
        submitWrapper.parentNode.insertBefore(tryitBtn, submitWrapper.nextSibling);
      } else if (targetBtn.parentNode) {
        targetBtn.parentNode.insertBefore(tryitBtn, targetBtn.nextSibling);
      }
    });
  }

  /**
   * Builds the isolated Shadow DOM Slide-Over Virtual Fitting Room in ZARR's White, Gold & Black palette.
   */
  function ensureShadowDrawer() {
    if (shadowRoot) return shadowRoot;

    const host = document.createElement("div");
    host.id = "tryit-ai-shadow-host";
    document.body.appendChild(host);
    shadowRoot = host.attachShadow({ mode: "open" });

    shadowRoot.innerHTML = `
      <style>
        :host {
          all: initial;
          font-family: "DM Sans", "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #111111;
        }
        * { box-sizing: border-box; }
        .backdrop {
          position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); backdrop-filter: blur(2px);
          z-index: 2147483645; opacity: 0; pointer-events: none; transition: opacity 0.25s ease;
        }
        .backdrop.open { opacity: 1; pointer-events: auto; }
        .drawer {
          position: fixed; top: 0; right: 0; width: min(475px, 100vw); height: 100vh;
          background: #FFFFFF; color: #111111; border-left: 1px solid #D7D7D7;
          z-index: 2147483646; display: flex; flex-direction: column;
          transform: translateX(104%); transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: -12px 0 40px rgba(0, 0, 0, 0.14);
        }
        .drawer.open { transform: translateX(0); }

        .top-gold-bar {
          height: 3px; width: 100%;
          background: linear-gradient(90deg, #D4AF37, #BB9935, #000000);
        }

        .header {
          padding: 16px 20px; background: #FFFFFF; border-bottom: 1px solid #E5E5E5;
          display: flex; justify-content: space-between; align-items: center;
        }
        .brand { display: flex; align-items: center; gap: 12px; }
        .logo-mark {
          width: 34px; height: 34px; border-radius: 3px;
          background: #000000; color: #D4AF37;
          display: grid; place-items: center; font-size: 16px; font-weight: 700;
          border: 1px solid #BB9935;
        }
        .title {
          font-weight: 700; font-size: 0.94rem; letter-spacing: 0.12em;
          text-transform: uppercase; color: #000000;
        }
        .sub {
          font-size: 0.7rem; color: #6B6B6B; letter-spacing: 0.03em; margin-top: 2px;
        }
        .close-btn {
          background: transparent; color: #111111; border: 1px solid #D7D7D7;
          border-radius: 3px; width: 32px; height: 32px; cursor: pointer;
          font-size: 14px; transition: all 0.18s;
        }
        .close-btn:hover { background: #000000; color: #FFFFFF; border-color: #000000; }

        .body {
          padding: 16px 20px 24px; overflow-y: auto; flex: 1;
          display: flex; flex-direction: column; gap: 14px;
        }

        .card {
          background: #F8F8F8; border: 1px solid #E5E5E5;
          border-radius: 4px; padding: 13px;
        }
        .prod-row { display: flex; gap: 12px; align-items: center; background: #FFFFFF; }
        .prod-img {
          width: 60px; height: 74px; border-radius: 3px; object-fit: cover;
          background: #F5F5F5; border: 1px solid #E5E5E5;
        }
        .prod-brand {
          font-size: 0.66rem; color: #BB9935; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
        }
        .prod-title {
          font-size: 0.88rem; font-weight: 600; color: #111111; margin: 2px 0;
        }
        .prod-price {
          font-size: 0.82rem; font-weight: 700; color: #000000;
        }

        .section-head {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 8px; gap: 8px;
        }
        .section-label {
          font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: #111111;
        }

        /* Filter Tabs (All / Female / Male / My Profiles) */
        .filter-row {
          display: flex; gap: 6px; margin-bottom: 10px; flex-wrap: wrap;
        }
        .filter-chip {
          background: #FFFFFF; color: #555555; border: 1px solid #D7D7D7;
          border-radius: 3px; padding: 4px 9px; font-size: 0.66rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em; cursor: pointer;
        }
        .filter-chip.active {
          background: #000000; color: #D4AF37; border-color: #000000;
        }

        /* Persona Grid */
        .persona-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px;
          max-height: 185px; overflow-y: auto; padding-right: 2px;
        }
        .persona-btn {
          background: #FFFFFF; color: #111111; border: 1px solid #D7D7D7;
          border-radius: 3px; padding: 8px 9px; cursor: pointer; text-align: left;
          display: flex; align-items: center; gap: 9px; transition: all 0.16s;
        }
        .persona-btn:hover { border-color: #BB9935; }
        .persona-btn.active {
          border-color: #BB9935; background: #FAF6EB;
          box-shadow: inset 0 0 0 1px #BB9935;
        }
        .persona-thumb {
          width: 34px; height: 42px; border-radius: 2px; object-fit: cover;
          border: 1px solid #E5E5E5; background: #EFEFEF; flex-shrink: 0;
        }
        .persona-meta { overflow: hidden; }
        .persona-name {
          font-size: 0.75rem; font-weight: 700; color: #000000; display: block;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .persona-detail {
          font-size: 0.64rem; color: #6B6B6B; margin-top: 2px; display: block;
        }
        .persona-badge {
          display: inline-block; font-size: 0.58rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em;
          padding: 1px 5px; border-radius: 2px; background: #EFEFEF; color: #333;
          margin-top: 3px;
        }

        /* Create Custom Profile Form (e.g., Zain Ali) */
        .profile-creator {
          background: #FFFFFF; border: 1px solid #BB9935; border-radius: 3px;
          padding: 12px; margin-bottom: 10px;
        }
        .creator-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;
        }
        .input-field, .select-field {
          width: 100%; padding: 7px 9px; border: 1px solid #D7D7D7; border-radius: 3px;
          font-size: 0.75rem; background: #FAFAFA; color: #111111;
        }

        /* Multi-Photo Strip for Selected Person */
        .photo-strip-box {
          margin-top: 10px; padding-top: 10px; border-top: 1px solid #E5E5E5;
        }
        .photo-strip {
          display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; align-items: center;
        }
        .photo-thumb-btn {
          position: relative; border: 2px solid #D7D7D7; border-radius: 3px;
          padding: 0; background: #FFFFFF; cursor: pointer; flex-shrink: 0;
          width: 54px; height: 68px; overflow: hidden; transition: all 0.15s;
        }
        .photo-thumb-btn.active {
          border-color: #BB9935; box-shadow: 0 0 0 1px #BB9935;
        }
        .photo-thumb-btn img {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .photo-thumb-label {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: rgba(0,0,0,0.68); color: #FFFFFF; font-size: 0.54rem;
          padding: 2px 3px; text-align: center; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis;
        }
        .add-photo-tile {
          width: 54px; height: 68px; border: 1px dashed #BB9935; border-radius: 3px;
          background: #FAF6EB; color: #BB9935; display: flex; flex-direction: column;
          align-items: center; justify-content: center; font-size: 0.62rem;
          font-weight: 700; cursor: pointer; flex-shrink: 0; text-align: center;
          padding: 4px;
        }
        .add-photo-tile:hover { background: #000000; color: #FFFFFF; border-color: #000000; }

        .pinned-bar {
          background: #FAF6EB; border: 1px solid #BB9935;
          border-radius: 3px; padding: 10px 12px; font-size: 0.76rem; color: #111111;
          display: flex; justify-content: space-between; align-items: center;
        }
        .pinned-tag { font-weight: 700; color: #BB9935; text-transform: uppercase; font-size: 0.66rem; display: block; }

        .btn-row { display: flex; flex-direction: column; gap: 8px; }
        .primary-btn {
          width: 100%; padding: 13px 18px; border-radius: 3px;
          border: 1px solid #BB9935; background: #BB9935; color: #FFFFFF;
          font-weight: 600; font-size: 0.8rem; letter-spacing: 0.1em;
          text-transform: uppercase; cursor: pointer; transition: all 0.2s ease;
        }
        .primary-btn:hover { background: #000000; border-color: #000000; }

        .chain-btn {
          width: 100%; padding: 11px 18px; border-radius: 3px;
          border: 1px solid #000000; background: #000000; color: #FFFFFF;
          font-weight: 600; font-size: 0.76rem; letter-spacing: 0.08em;
          text-transform: uppercase; cursor: pointer; transition: all 0.2s ease;
        }
        .chain-btn:hover { background: #BB9935; border-color: #BB9935; }

        .loading-card {
          background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 4px;
          padding: 18px; text-align: center;
        }
        .loading-title {
          font-size: 0.8rem; font-weight: 600; color: #111111;
          letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 10px;
        }
        .shimmer-track {
          width: 100%; height: 3px; background: #ECECEC; overflow: hidden; border-radius: 2px;
        }
        .shimmer-bar {
          width: 45%; height: 100%;
          background: linear-gradient(90deg, #D4AF37, #BB9935, #000000);
          animation: zarrSlide 1.1s infinite ease-in-out;
        }
        @keyframes zarrSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(220%); }
        }

        .result-card {
          background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 4px; overflow: hidden;
        }
        .tools-bar {
          padding: 9px 11px; background: #F8F8F8; border-bottom: 1px solid #E5E5E5;
          display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap;
        }
        .fit-label {
          font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: #BB9935;
        }
        .pill-btn {
          background: #FFFFFF; color: #111111; border: 1px solid #D7D7D7;
          border-radius: 3px; padding: 5px 9px; font-size: 0.66rem; font-weight: 600;
          letter-spacing: 0.04em; text-transform: uppercase; cursor: pointer;
          transition: all 0.15s;
        }
        .pill-btn:hover { background: #000000; color: #FFFFFF; border-color: #000000; }
        .pill-gold { border-color: #BB9935; color: #BB9935; background: #FAF6EB; }
        .pill-gold:hover { background: #BB9935; color: #FFFFFF; border-color: #BB9935; }

        .result-img {
          width: 100%; display: block; max-height: 440px; object-fit: contain; background: #F5F5F5;
        }

        .save-to-profile-bar {
          padding: 9px 12px; background: #FAF6EB; border-top: 1px solid #E5DEC9;
          display: flex; justify-content: space-between; align-items: center; gap: 8px;
        }

        /* Text Command Edit Card */
        .edit-cmd-card {
          background: #F8F8F8; border: 1px solid #E5E5E5; border-radius: 4px; padding: 12px;
        }
        .edit-cmd-row {
          display: flex; gap: 6px; margin-top: 6px;
        }
        .edit-cmd-input {
          flex: 1; padding: 8px 10px; border: 1px solid #D7D7D7; border-radius: 3px;
          font-size: 0.76rem; background: #FFFFFF; color: #111111;
        }
        .edit-cmd-btn {
          padding: 8px 13px; background: #000000; color: #D4AF37; border: 1px solid #000000;
          border-radius: 3px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; cursor: pointer;
        }
        .edit-cmd-btn:hover { background: #BB9935; color: #FFFFFF; border-color: #BB9935; }
        .quick-chips {
          display: flex; gap: 5px; flex-wrap: wrap; margin-top: 8px;
        }
        .quick-chip {
          background: #FFFFFF; border: 1px solid #D7D7D7; border-radius: 2px;
          padding: 3px 7px; font-size: 0.64rem; color: #444444; cursor: pointer;
        }
        .quick-chip:hover { border-color: #BB9935; color: #000000; background: #FAF6EB; }

        .verdict {
          border-radius: 4px; padding: 14px; background: #FAF8F3;
          border: 1px solid #E5DEC9; border-left: 4px solid #008669;
        }
        .verdict.conflict {
          background: #FDF6F6; border-color: #F1D3D3; border-left: 4px solid #971400;
        }
        .verdict-top {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;
        }
        .verdict-tag {
          font-size: 0.64rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.09em; color: #6B6B6B;
        }
        .verdict-score {
          font-size: 0.74rem; font-weight: 700; color: #008669;
          background: rgba(0, 134, 105, 0.1); padding: 2px 7px; border-radius: 3px;
        }
        .verdict.conflict .verdict-score {
          color: #971400; background: rgba(151, 20, 0, 0.1);
        }
        .verdict-head {
          font-weight: 700; font-size: 0.86rem; color: #111111; margin-bottom: 5px;
        }
        .verdict-body {
          font-size: 0.78rem; color: #444444; line-height: 1.48;
        }

        /* Sticky Footer Attribution */
        .footer-bar {
          padding: 10px 20px; background: #FFFFFF; border-top: 1px solid #E5E5E5;
          text-align: center; font-size: 0.68rem; color: #6B6B6B;
          letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
        }
        .footer-bar .gold { color: #BB9935; font-weight: 700; }
        .footer-bar .black { color: #000000; font-weight: 700; }

        .hidden { display: none !important; }
      </style>

      <div class="backdrop" id="ext-backdrop"></div>
      <aside class="drawer" id="ext-drawer">
        <div class="top-gold-bar"></div>
        <div class="header">
          <div class="brand">
            <div class="logo-mark">Z</div>
            <div>
              <div class="title">Virtual Fitting Room</div>
              <div class="sub">Personal Style &amp; Skin Advisor</div>
            </div>
          </div>
          <button class="close-btn" id="ext-close" title="Close">✕</button>
        </div>

        <div class="body">
          <!-- Selected Item Card -->
          <div class="card prod-row">
            <img id="ext-prod-img" class="prod-img" src="" alt="Product" />
            <div style="flex:1;">
              <div id="ext-prod-brand" class="prod-brand"></div>
              <div id="ext-prod-title" class="prod-title"></div>
              <div id="ext-prod-price" class="prod-price"></div>
            </div>
          </div>

          <!-- Pinned Outfit Bar -->
          <div id="ext-pinned-bar" class="pinned-bar hidden">
            <div>
              <span class="pinned-tag">Saved in Your Outfit</span>
              <span id="ext-pinned-label"></span>
            </div>
            <button id="ext-clear-pin" class="pill-btn">Remove</button>
          </div>

          <!-- Model & Custom Profile Selector + Multi-Photo Gallery -->
          <div class="card">
            <div class="section-head">
              <span class="section-label">1. Select Person or Create Profile</span>
              <button id="ext-toggle-creator" class="pill-btn pill-gold" type="button">+ Create Profile</button>
            </div>

            <!-- Inline Custom Profile Creator (e.g., Zain Ali) -->
            <div id="ext-profile-creator" class="profile-creator hidden">
              <div style="font-size:0.72rem;font-weight:700;color:#000000;text-transform:uppercase;letter-spacing:0.06em;">
                Create Person Profile (e.g., Zain Ali)
              </div>
              <div class="creator-grid">
                <input id="ext-new-name" class="input-field" type="text" placeholder="Full Name (e.g., Zain Ali)" />
                <select id="ext-new-gender" class="select-field">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <select id="ext-new-ethnicity" class="select-field">
                  <option value="South Asian">South Asian</option>
                  <option value="Asian">Asian</option>
                  <option value="African">African</option>
                  <option value="American">American</option>
                  <option value="Latin">Latin</option>
                  <option value="Middle Eastern">Middle Eastern</option>
                </select>
                <select id="ext-new-size" class="select-field">
                  <option value="S">Size S</option>
                  <option value="M" selected>Size M</option>
                  <option value="L">Size L</option>
                  <option value="XL">Size XL</option>
                </select>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px;">
                <label class="pill-btn" for="ext-new-profile-photo" style="cursor:pointer;">
                  📷 Upload Initial Photo
                </label>
                <input id="ext-new-profile-photo" type="file" accept="image/*" class="hidden" />
                <span id="ext-new-photo-status" style="font-size:0.66rem;color:#6B6B6B;flex:1;">Optional (can add more later)</span>
                <button id="ext-save-profile-btn" class="pill-btn pill-gold" type="button">Save Profile</button>
              </div>
            </div>

            <!-- Gender / Origin Filter Tabs -->
            <div class="filter-row" id="ext-filter-tabs">
              <button class="filter-chip active" data-filter="all" type="button">All Models (8+)</button>
              <button class="filter-chip" data-filter="female" type="button">Women</button>
              <button class="filter-chip" data-filter="male" type="button">Men</button>
              <button class="filter-chip" data-filter="custom" type="button">My Profiles</button>
            </div>

            <!-- Diverse Personas & Custom Profiles Grid -->
            <div class="persona-grid" id="ext-personas"></div>

            <!-- Multi-Photo Gallery for the Active Person -->
            <div class="photo-strip-box">
              <div class="section-head" style="margin-bottom:6px;">
                <span class="section-label" id="ext-photo-strip-title">2. Choose Photo for Try-On</span>
                <span style="font-size:0.65rem;color:#6B6B6B;">Click a photo to select</span>
              </div>
              <div class="photo-strip" id="ext-photo-strip"></div>
              <input id="ext-add-profile-photo-input" type="file" accept="image/*" class="hidden" />
            </div>
          </div>

          <!-- Manual Try-On Action Buttons (Never Auto-Runs Without User Go-Ahead) -->
          <div class="btn-row">
            <button id="ext-run-btn" class="primary-btn" type="button">✨ Try It On Selected Photo</button>
            <button id="ext-chain-btn" class="chain-btn hidden" type="button">Pair With Saved Outfit</button>
          </div>

          <!-- Shimmer Loading State -->
          <div id="ext-status-msg" class="loading-card hidden">
            <div id="ext-loading-text" class="loading-title">Styling your personalized look...</div>
            <div class="shimmer-track"><div class="shimmer-bar"></div></div>
          </div>

          <!-- Result Display -->
          <div id="ext-result-box" class="hidden" style="display:flex;flex-direction:column;gap:12px;">
            <div class="result-card">
              <div class="tools-bar">
                <span class="fit-label">Styled Preview</span>
                <div style="display:flex;gap:6px;">
                  <button id="ext-compare-btn" class="pill-btn" type="button">Before / After</button>
                  <button id="ext-pin-btn" class="pill-btn pill-gold" type="button">+ Save to Outfit</button>
                </div>
              </div>
              <img id="ext-result-img" class="result-img" src="" alt="Virtual Try-On Look" />
              <!-- Save Generated Try-On Photo into Active Person's Profile Gallery -->
              <div class="save-to-profile-bar">
                <span style="font-size:0.7rem;color:#333333;font-weight:600;" id="ext-save-profile-caption">
                  Reuse this look for future try-ons:
                </span>
                <button id="ext-save-result-to-profile-btn" class="pill-btn pill-gold" type="button">
                  📥 Add Photo to Profile
                </button>
              </div>
            </div>

            <!-- Make Edits by Text Command (Add or Remove Specific Products) -->
            <div class="edit-cmd-card">
              <div class="section-label">Edit Look by Text Command</div>
              <div style="font-size:0.68rem;color:#6B6B6B;margin-top:2px;">
                Ask to remove or add a specific item (e.g., "remove jacket", "add leather boots", "add cashmere scarf")
              </div>
              <div class="edit-cmd-row">
                <input
                  id="ext-edit-cmd-input"
                  class="edit-cmd-input"
                  type="text"
                  placeholder="e.g., Remove current item, or Add leather boots..."
                />
                <button id="ext-edit-cmd-btn" class="edit-cmd-btn" type="button">Apply</button>
              </div>
              <div class="quick-chips" id="ext-quick-chips">
                <button class="quick-chip" data-cmd="Remove last item" type="button">✕ Remove last item</button>
                <button class="quick-chip" data-cmd="Add obsidian leather boots" type="button">+ Add leather boots</button>
                <button class="quick-chip" data-cmd="Add camel cashmere scarf" type="button">+ Add cashmere scarf</button>
                <button class="quick-chip" data-cmd="Add quilted crossbody bag" type="button">+ Add crossbody bag</button>
                <button class="quick-chip" data-cmd="Add wool fedora hat" type="button">+ Add fedora hat</button>
              </div>
            </div>

            <!-- Clean Stylist & Fit Note -->
            <div id="ext-verdict-box" class="verdict">
              <div class="verdict-top">
                <span class="verdict-tag">Stylist Recommendation</span>
                <span id="ext-verdict-score" class="verdict-score">94% Match</span>
              </div>
              <div id="ext-verdict-head" class="verdict-head"></div>
              <div id="ext-verdict-body" class="verdict-body"></div>
            </div>
          </div>
        </div>

        <!-- Required Footer Attribution -->
        <div class="footer-bar">
          Powered by <span class="gold">YouCam</span> &amp; <span class="black">Gemini API</span>
        </div>
      </aside>
    `;

    // Wire Close & Primary Try-On Events
    shadowRoot.getElementById("ext-close").addEventListener("click", closeShadowDrawer);
    shadowRoot.getElementById("ext-backdrop").addEventListener("click", closeShadowDrawer);
    shadowRoot.getElementById("ext-run-btn").addEventListener("click", () => runExtensionTryOn(false));
    shadowRoot.getElementById("ext-chain-btn").addEventListener("click", () => runExtensionTryOn(true));
    shadowRoot.getElementById("ext-pin-btn").addEventListener("click", pinExtensionResult);

    // Filter tabs (All / Women / Men / My Profiles)
    shadowRoot.querySelectorAll("#ext-filter-tabs .filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        extState.genderFilter = chip.getAttribute("data-filter") || "all";
        shadowRoot.querySelectorAll("#ext-filter-tabs .filter-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        renderShadowPersonas();
      });
    });

    // Toggle Custom Profile Creator
    shadowRoot.getElementById("ext-toggle-creator").addEventListener("click", () => {
      const creator = shadowRoot.getElementById("ext-profile-creator");
      creator.classList.toggle("hidden");
    });

    // Upload initial photo inside Custom Profile Creator
    shadowRoot.getElementById("ext-new-profile-photo").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        extState.newProfileDraftPhoto = reader.result;
        shadowRoot.getElementById("ext-new-photo-status").textContent = "✓ Photo attached";
      };
      reader.readAsDataURL(file);
    });

    // Save New Custom Profile (e.g., Zain Ali)
    shadowRoot.getElementById("ext-save-profile-btn").addEventListener("click", () => {
      const nameInput = shadowRoot.getElementById("ext-new-name");
      const name = (nameInput.value || "").trim() || "Zain Ali";
      const gender = shadowRoot.getElementById("ext-new-gender").value || "male";
      const ethnicity = shadowRoot.getElementById("ext-new-ethnicity").value || "South Asian";
      const size = shadowRoot.getElementById("ext-new-size").value || "M";

      const defaultAvatar =
        gender === "male"
          ? `${extState.backendUrl}/static/assets/persona_kenji_full.png`
          : `${extState.backendUrl}/static/assets/persona_maya_full.png`;
      const firstPhotoUrl = extState.newProfileDraftPhoto || defaultAvatar;
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
            label: extState.newProfileDraftPhoto ? "Uploaded Photo 1" : "Default Studio Pose",
            url: firstPhotoUrl,
          },
        ],
      };

      extState.customProfiles = [newProfile, ...(extState.customProfiles || [])];
      extState.selectedPersonaId = newProfile.persona_id;
      extState.selectedPhotoUrl = firstPhotoUrl;
      extState.newProfileDraftPhoto = null;
      nameInput.value = "";
      shadowRoot.getElementById("ext-new-photo-status").textContent = "Optional (can add more later)";
      shadowRoot.getElementById("ext-profile-creator").classList.add("hidden");

      chrome.runtime.sendMessage(
        { type: "SAVE_CUSTOM_PROFILES", customProfiles: extState.customProfiles },
        () => {
          renderShadowPersonas();
          renderProfilePhotoStrip();
        }
      );
    });

    // Add additional photo to the currently selected profile
    shadowRoot.getElementById("ext-add-profile-photo-input").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        addPhotoToActiveProfile(reader.result, `Photo ${(getSelectedProfile().photos || []).length + 1}`);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    });

    // Save Try-On Result Photo into the Active Person's Profile Gallery
    shadowRoot.getElementById("ext-save-result-to-profile-btn").addEventListener("click", () => {
      if (!extState.lastResult) return;
      const fullImg = resolveImageUrl(extState.lastResult.result_image_url);
      const label =
        extState.scrapedProduct && extState.scrapedProduct.title
          ? `Tried: ${extState.scrapedProduct.title.slice(0, 18)}`
          : "Saved Try-On Look";
      const profile = getSelectedProfile();
      addPhotoToActiveProfile(fullImg, label);

      const btn = shadowRoot.getElementById("ext-save-result-to-profile-btn");
      btn.textContent = `✓ Added to ${profile.person_name}'s Photos`;
      setTimeout(() => {
        btn.textContent = `📥 Add to ${profile.person_name}'s Photos`;
      }, 2200);
    });

    // Text Command Edit Submit & Quick Chips
    shadowRoot.getElementById("ext-edit-cmd-btn").addEventListener("click", () => {
      const input = shadowRoot.getElementById("ext-edit-cmd-input");
      const cmd = (input.value || "").trim();
      if (cmd) runTextCommandEdit(cmd);
    });
    shadowRoot.getElementById("ext-edit-cmd-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = (e.target.value || "").trim();
        if (cmd) runTextCommandEdit(cmd);
      }
    });
    shadowRoot.querySelectorAll("#ext-quick-chips .quick-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const cmd = chip.getAttribute("data-cmd");
        shadowRoot.getElementById("ext-edit-cmd-input").value = cmd;
        runTextCommandEdit(cmd);
      });
    });

    shadowRoot.getElementById("ext-clear-pin").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "SAVE_PINNED_LOOK", pinnedLook: null }, () => {
        extState.pinnedLook = null;
        updatePinnedUI();
      });
    });

    shadowRoot.getElementById("ext-compare-btn").addEventListener("click", () => {
      if (!extState.lastResult) return;
      extState.compareBefore = !extState.compareBefore;
      const img = shadowRoot.getElementById("ext-result-img");
      const rawUrl = extState.compareBefore
        ? extState.lastResult.source_image_url
        : extState.lastResult.result_image_url;
      img.src = resolveImageUrl(rawUrl);
    });

    return shadowRoot;
  }

  /**
   * Appends a new photo (either uploaded or a generated try-on result) into the active person's profile
   * and persists it in `chrome.storage.local`.
   */
  function addPhotoToActiveProfile(photoUrl, label) {
    const active = JSON.parse(JSON.stringify(getSelectedProfile()));
    if (!Array.isArray(active.photos) || active.photos.length === 0) {
      active.photos = [
        {
          photo_id: `${active.persona_id}_default`,
          label: "Original Look",
          url: active.full_body_image_url,
        },
      ];
    }
    const newPhoto = {
      photo_id: `ph_${Date.now()}`,
      label: label || `Photo ${active.photos.length + 1}`,
      url: photoUrl,
    };
    active.photos.push(newPhoto);
    extState.selectedPhotoUrl = photoUrl;

    const existingIdx = (extState.customProfiles || []).findIndex(
      (cp) => cp.persona_id === active.persona_id
    );
    if (existingIdx >= 0) {
      extState.customProfiles[existingIdx] = active;
    } else {
      extState.customProfiles = [...(extState.customProfiles || []), active];
    }

    chrome.runtime.sendMessage(
      { type: "SAVE_CUSTOM_PROFILES", customProfiles: extState.customProfiles },
      () => {
        renderShadowPersonas();
        renderProfilePhotoStrip();
      }
    );
  }

  function updatePinnedUI() {
    if (!shadowRoot) return;
    const bar = shadowRoot.getElementById("ext-pinned-bar");
    const chainBtn = shadowRoot.getElementById("ext-chain-btn");
    if (extState.pinnedLook && extState.pinnedLook.product) {
      bar.classList.remove("hidden");
      chainBtn.classList.remove("hidden");
      shadowRoot.getElementById("ext-pinned-label").textContent =
        extState.pinnedLook.product.title.slice(0, 34);
    } else {
      bar.classList.add("hidden");
      chainBtn.classList.add("hidden");
    }
  }

  /**
   * Opens the Virtual Fitting Room drawer when the user clicks "✨ Try It On".
   * NOTE: Does NOT auto-run the try-on command — waits for the user to choose their profile/photo
   * and click "✨ Try It On Selected Photo".
   */
  function openShadowDrawer(product) {
    ensureShadowDrawer();
    extState.scrapedProduct = product;
    shadowRoot.getElementById("ext-prod-img").src = product.image_url;
    shadowRoot.getElementById("ext-prod-brand").textContent = product.brand || "COLLECTION";
    shadowRoot.getElementById("ext-prod-title").textContent = product.title;
    shadowRoot.getElementById("ext-prod-price").textContent = product.price || "";

    // Reset previous loading/result state so user has full control before running
    shadowRoot.getElementById("ext-status-msg").classList.add("hidden");
    shadowRoot.getElementById("ext-result-box").classList.add("hidden");

    shadowRoot.getElementById("ext-drawer").classList.add("open");
    shadowRoot.getElementById("ext-backdrop").classList.add("open");

    renderShadowPersonas();
    renderProfilePhotoStrip();

    chrome.runtime.sendMessage({ type: "GET_PERSONAS" }, (res) => {
      if (res && res.ok) {
        if (Array.isArray(res.personas) && res.personas.length > 0) {
          extState.personas = res.personas;
        }
        extState.customProfiles = Array.isArray(res.customProfiles) ? res.customProfiles : [];
        extState.backendUrl = res.settings.backendUrl;
        extState.pinnedLook = res.settings.pinnedLook;
        renderShadowPersonas();
        renderProfilePhotoStrip();
        updatePinnedUI();
      }
    });
  }

  function renderShadowPersonas() {
    if (!shadowRoot) return;
    const container = shadowRoot.getElementById("ext-personas");
    const allProfiles = getAllProfiles();

    const filtered = allProfiles.filter((p) => {
      if (extState.genderFilter === "female") return p.gender === "female";
      if (extState.genderFilter === "male") return p.gender === "male";
      if (extState.genderFilter === "custom") return Boolean(p.is_custom);
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1;font-size:0.74rem;color:#6B6B6B;padding:10px;text-align:center;">
          No custom profiles yet. Click <strong>"+ Create Profile"</strong> above to add one (e.g., Zain Ali).
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map((p) => {
        const active = p.persona_id === extState.selectedPersonaId ? "active" : "";
        const thumbUrl = resolveImageUrl(
          (p.photos && p.photos[0] && p.photos[0].url) || p.face_image_url || p.full_body_image_url
        );
        const genderLabel = p.gender === "male" ? "Male" : "Female";
        const originLabel = p.ethnicity || (p.is_custom ? "Custom" : "Model");
        const photoCount = Array.isArray(p.photos) ? p.photos.length : 1;
        return `
          <button class="persona-btn ${active}" data-id="${p.persona_id}" type="button">
            <img class="persona-thumb" src="${thumbUrl}" alt="${p.person_name}" />
            <div class="persona-meta">
              <span class="persona-name">${p.person_name}</span>
              <span class="persona-detail">${originLabel} • ${genderLabel} • Size ${p.usual_size}</span>
              <span class="persona-badge">${photoCount} Photo${photoCount > 1 ? "s" : ""}</span>
            </div>
          </button>
        `;
      })
      .join("");

    container.querySelectorAll(".persona-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        extState.selectedPersonaId = btn.getAttribute("data-id");
        const selected = getSelectedProfile();
        const defaultPhoto =
          (selected.photos && selected.photos[0] && selected.photos[0].url) ||
          selected.full_body_image_url;
        extState.selectedPhotoUrl = defaultPhoto;
        renderShadowPersonas();
        renderProfilePhotoStrip();
      });
    });
  }

  function renderProfilePhotoStrip() {
    if (!shadowRoot) return;
    const profile = getSelectedProfile();
    if (!profile) return;

    const titleEl = shadowRoot.getElementById("ext-photo-strip-title");
    titleEl.textContent = `2. ${profile.person_name}'s Photos (Choose One)`;

    const saveBtn = shadowRoot.getElementById("ext-save-result-to-profile-btn");
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

    if (!extState.selectedPhotoUrl || !photos.some((ph) => ph.url === extState.selectedPhotoUrl)) {
      extState.selectedPhotoUrl = photos[0].url;
    }

    const strip = shadowRoot.getElementById("ext-photo-strip");
    strip.innerHTML =
      photos
        .map((ph) => {
          const isActive = ph.url === extState.selectedPhotoUrl ? "active" : "";
          const resolved = resolveImageUrl(ph.url);
          return `
            <button class="photo-thumb-btn ${isActive}" data-url="${ph.url}" title="${ph.label}" type="button">
              <img src="${resolved}" alt="${ph.label}" />
              <span class="photo-thumb-label">${ph.label}</span>
            </button>
          `;
        })
        .join("") +
      `
        <label class="add-photo-tile" for="ext-add-profile-photo-input" title="Upload another photo of ${profile.person_name}">
          <span style="font-size:14px;">＋</span>
          <span>Add Photo</span>
        </label>
      `;

    strip.querySelectorAll(".photo-thumb-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        extState.selectedPhotoUrl = btn.getAttribute("data-url");
        renderProfilePhotoStrip();
      });
    });
  }

  function closeShadowDrawer() {
    if (!shadowRoot) return;
    shadowRoot.getElementById("ext-drawer").classList.remove("open");
    shadowRoot.getElementById("ext-backdrop").classList.remove("open");
  }

  function getActivePersonaPayload() {
    const base = getSelectedProfile();
    const clone = JSON.parse(JSON.stringify(base));
    const chosenUrl = resolveImageUrl(extState.selectedPhotoUrl || clone.full_body_image_url);
    clone.full_body_image_url = chosenUrl;
    clone.face_image_url = chosenUrl;
    return clone;
  }

  function displayCompletedTryOnResult(data) {
    const statusMsg = shadowRoot.getElementById("ext-status-msg");
    const resultBox = shadowRoot.getElementById("ext-result-box");
    statusMsg.classList.add("hidden");
    extState.lastResult = data;
    resultBox.classList.remove("hidden");

    const imgUrl = resolveImageUrl(data.result_image_url);
    shadowRoot.getElementById("ext-result-img").src = imgUrl;

    const vBox = shadowRoot.getElementById("ext-verdict-box");
    vBox.className = `verdict ${data.agent_verdict.status_badge === "conflict" ? "conflict" : ""}`;
    shadowRoot.getElementById("ext-verdict-score").textContent =
      `${data.agent_verdict.match_score}% Match`;
    shadowRoot.getElementById("ext-verdict-head").textContent = cleanShopperText(
      data.agent_verdict.verdict_headline
    );
    shadowRoot.getElementById("ext-verdict-body").textContent = cleanShopperText(
      data.agent_verdict.actionable_advice
    );
  }

  function runExtensionTryOn(isChained) {
    const statusMsg = shadowRoot.getElementById("ext-status-msg");
    const loadingText = shadowRoot.getElementById("ext-loading-text");
    const resultBox = shadowRoot.getElementById("ext-result-box");
    statusMsg.classList.remove("hidden");
    const profile = getSelectedProfile();
    loadingText.textContent = isChained
      ? `Pairing outfit on ${profile.person_name}...`
      : `Styling ${extState.scrapedProduct.title.slice(0, 28)} on ${profile.person_name}...`;
    resultBox.classList.add("hidden");
    extState.compareBefore = false;

    const persona = getActivePersonaPayload();
    extState.originalPersonImageUrl = persona.full_body_image_url;
    extState.activeOutfitItems =
      isChained && extState.pinnedLook
        ? [extState.pinnedLook.product, extState.scrapedProduct]
        : [extState.scrapedProduct];

    const payload =
      isChained && extState.pinnedLook
        ? {
            type: "CHAIN_TRYON",
            previous_task_id: extState.pinnedLook.task_id,
            base_result_image_url: extState.pinnedLook.result_image_url,
            pinned_product: extState.pinnedLook.product,
            second_product: extState.scrapedProduct,
            persona,
          }
        : {
            type: "START_TRYON",
            product: extState.scrapedProduct,
            persona,
          };

    chrome.runtime.sendMessage(payload, async (startRes) => {
      if (!startRes || !startRes.ok) {
        loadingText.textContent = "Fitting room is temporarily offline. Please try again.";
        return;
      }
      const taskId = startRes.data.task_id;

      for (let attempt = 0; attempt < 22; attempt++) {
        const pollRes = await new Promise((resolve) =>
          chrome.runtime.sendMessage({ type: "POLL_STATUS", taskId }, resolve)
        );
        if (pollRes && pollRes.ok && pollRes.data) {
          const data = pollRes.data;
          if (data.status === "completed" || data.status === "failed") {
            displayCompletedTryOnResult(data);
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 900));
      }
    });
  }

  /**
   * Executes a natural-language text command edit on the current try-on result
   * (e.g., "remove jacket", "add leather boots", "add cashmere scarf").
   */
  function runTextCommandEdit(commandText) {
    if (!extState.lastResult) return;
    const statusMsg = shadowRoot.getElementById("ext-status-msg");
    const loadingText = shadowRoot.getElementById("ext-loading-text");
    statusMsg.classList.remove("hidden");
    loadingText.textContent = `Applying edit: "${commandText}"...`;

    const persona = getActivePersonaPayload();
    const currentResultUrl = resolveImageUrl(extState.lastResult.result_image_url);
    const originalUrl = extState.originalPersonImageUrl || persona.full_body_image_url;

    const isRemove = /\b(remove|delete|without|take off|undo|clear)\b/i.test(commandText);
    if (isRemove && extState.activeOutfitItems.length > 0) {
      extState.activeOutfitItems = extState.activeOutfitItems.slice(0, -1);
    }

    chrome.runtime.sendMessage(
      {
        type: "EDIT_TRYON",
        command_text: commandText,
        previous_task_id: extState.lastResult.task_id,
        current_result_image_url: currentResultUrl,
        original_person_image_url: originalUrl,
        current_items: extState.activeOutfitItems,
        persona,
      },
      async (startRes) => {
        if (!startRes || !startRes.ok) {
          loadingText.textContent = "Could not apply edit right now. Please try again.";
          return;
        }
        const taskId = startRes.data.task_id;
        for (let attempt = 0; attempt < 22; attempt++) {
          const pollRes = await new Promise((resolve) =>
            chrome.runtime.sendMessage({ type: "POLL_STATUS", taskId }, resolve)
          );
          if (pollRes && pollRes.ok && pollRes.data) {
            const data = pollRes.data;
            if (data.status === "completed" || data.status === "failed") {
              displayCompletedTryOnResult(data);
              shadowRoot.getElementById("ext-edit-cmd-input").value = "";
              break;
            }
          }
          await new Promise((r) => setTimeout(r, 850));
        }
      }
    );
  }

  function pinExtensionResult() {
    if (!extState.lastResult || !extState.scrapedProduct) return;
    const fullImg = resolveImageUrl(extState.lastResult.result_image_url);

    const pinnedLook = {
      task_id: extState.lastResult.task_id,
      result_image_url: fullImg,
      product: extState.scrapedProduct,
    };
    chrome.runtime.sendMessage({ type: "SAVE_PINNED_LOOK", pinnedLook }, () => {
      extState.pinnedLook = pinnedLook;
      updatePinnedUI();
      const pinBtn = shadowRoot.getElementById("ext-pin-btn");
      pinBtn.textContent = "✓ Saved";
      setTimeout(() => {
        pinBtn.textContent = "+ Save to Outfit";
      }, 1600);
    });
  }

  findAndInjectTryItButtons();
  const observer = new MutationObserver(() => findAndInjectTryItButtons());
  observer.observe(document.body, { childList: true, subtree: true });
})();
