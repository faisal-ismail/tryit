# ROLE & OBJECTIVE
You are a Principal Full-Stack AI Engineer and Chrome Extension Architect. Build a complete, production-ready, winning hackathon project called **"TryIt AI"** for the **YouCam API Skin AI & eCommerce VTO Hackathon**.

"TryIt AI" is a universal, agentic eCommerce Chrome Extension (Manifest V3) AND a live Web Sandbox Storefront backed by a FastAPI + Gemini 2.5 Flash + YouCam REST API orchestrator designed specifically for **zero-timeout deployment on cPanel (Phusion Passenger WSGI via `a2wsgi`)**.

---

# CORE HACKATHON WINNING FEATURES (IMPLEMENT ALL 5)

1. **Universal DOM Button Injection (`extension/content.js`):**
   - Automatically detects product pages on ANY eCommerce website (Amazon, Sephora, Zara, Shopify, WooCommerce, and our built-in `/demo-store`).
   - Injects a sleek dark-mode **"✨ TryIt with AI"** button directly beside the native "Add to Cart" / "Buy Now" button.
   - Scrapes product title, category hints, price, high-res product image URL, and active ingredients using JSON-LD (`application/ld+json`), OpenGraph (`og:image`), and DOM selectors.

2. **Autonomous Gemini 2.5 Flash Router & Multi-Endpoint YouCam Integration:**
   - Classifies any scraped product and routes it to the exact YouCam API pipeline (with real workarounds for known YouCam API quirks):
     - **`cloth-v4` (Tops, Bottoms, Dresses, Outerwear):** Maps gender strictly to `"male"` or `"female"`.
     - **`shoes-transfer` (Footwear):** Passes gender-specific fitting parameters.
     - **`bag` (Handbags/Accessories):** Calls the YouCam bag endpoint *without* the `style` parameter (since the `bag` endpoint rejects `style`).
     - **`scarf` & `hat`:** Explicitly passes `style: "random"` for natural draping.
     - **`makeup-vto` & `skin-analysis` (Beauty & Skincare):** Runs YouCam AI Skin Analysis (returning quantitative scores for Moisture, Redness, Acne, Pores, Wrinkles, Texture) + evaluates ingredient safety.

3. **Cross-Store "Look Builder" API Chaining:**
   - Users can click **"📌 Pin to Look"** on a garment from Store A (e.g., a Jacket) and then switch to another product (e.g., Shoes, Bag, Scarf, or Makeup) and click **"✨ Chain Combined Look"**.
   - The backend passes the rendered output URL from YouCam Task #1 directly as the source person image into YouCam Task #2, creating a unified head-to-toe cross-store try-on!

4. **"Moment of Decision" Agentic Pre-Checkout Verdict:**
   - Gemini 2.5 Flash synthesizes the user's YouCam Skin Analysis / Undertone telemetry with the scraped product data to output a structured verdict card:
     - `match_score` (0–100%)
     - `verdict_headline` (e.g., "✅ 94% Warm Undertone & Fit Match" or "⚠️ Barrier Conflict Warning: 10% Glycolic Acid vs. Your Current Redness Score of 41/100")
     - `actionable_advice` (Sizing advice for apparel or routine conflict swap for skincare)
     - `agent_trace` (Step-by-step trace of DOM scrape -> Gemini classification -> YouCam endpoint & parameters -> Verdict synthesis).

5. **Dual-Access "Judge Mode" (Works With OR Without Installing the Extension):**
   - **Mode A (Chrome Extension):** Works on any store via the injected Shadow DOM slide-over drawer.
   - **Mode B (Hosted `/demo-store` on cPanel):** The FastAPI backend serves a sleek, interactive eCommerce showcase at `GET /demo-store` that has the **TryIt AI Drawer script pre-embedded directly in the webpage**. This guarantees that even if a hackathon judge only clicks your live cPanel link without installing the Chrome extension, they can test all 3 pipelines (Apparel VTO, Cross-Store Chaining, and Skincare Barrier Check) live in their browser!
   - Includes **3 Pre-Loaded Demo Personas** (with pre-configured full-body & facial photos + baseline skin scores) plus Live Webcam & Custom Photo Upload.

---

# CPANEL-COMPATIBLE ARCHITECTURE (CRITICAL)
Shared cPanel hosting uses Phusion Passenger (WSGI) and drops single HTTP requests that hang for more than 20 seconds. Therefore, you MUST implement:
1. **`backend/passenger_wsgi.py`:** Wraps the FastAPI `app` using `a2wsgi.ASGIMiddleware(app)` so cPanel's "Setup Python App" runs FastAPI natively.
2. **Non-Blocking Split Polling Endpoints:**
   - `POST /api/tryon/start` -> Runs Gemini classification + initiates the YouCam task (or instant fallback simulation) and returns `{ task_id, category, youcam_endpoint, initial_agent_trace }` in `< 1.5s`.
   - `GET /api/tryon/status/{task_id}` -> Polls YouCam (`GET /s2s/v2.0/task/...`) and returns `{ status, result_image_url, skin_scores, agent_verdict }`.
   - `POST /api/tryon/chain` -> Chains a previously rendered VTO image with a second pinned product.
   - `GET /api/proxy-image?url=...` -> Proxies YouCam CDN images as a clean blob/stream to prevent browser CORS download issues.

---

# REPOSITORY STRUCTURE TO GENERATE
Generate every single file below completely with zero `TODO`s or placeholders:

```text
tryit-ai/
├── backend/
│   ├── passenger_wsgi.py        # cPanel Phusion Passenger entry point using a2wsgi
│   ├── .htaccess                # CORS headers & Passenger routing rules for cPanel
│   ├── main.py                  # FastAPI app serving API endpoints + /demo-store static storefront
│   ├── youcam_client.py         # Complete YouCam S2S v2.0 REST client + automatic resilient fallback mode
│   ├── agent_orchestrator.py    # Gemini 2.5 Flash classifier, skincare chemist & stylist agent
│   ├── schemas.py               # Pydantic v2 models for all requests, tasks, and verdicts
│   ├── requirements.txt         # fastapi, uvicorn, a2wsgi, httpx, pydantic, google-genai, python-dotenv
│   ├── .env.example             # YOUCAM_API_KEY, GEMINI_API_KEY, DEMO_FALLBACK_MODE, PUBLIC_BASE_URL
│   └── static/
│       ├── demo_store.html      # Full interactive eCommerce demo store with embedded TryIt AI drawer
│       └── widget.js            # Shared drawer UI script used by /demo-store so judges can test via URL
├── extension/
│   ├── manifest.json            # Chrome Extension Manifest V3
│   ├── config.js                # Single config file for BACKEND_URL (defaults to localhost:8000, easily swapped to [https://tryit.yourdomain.com](https://tryit.yourdomain.com))
│   ├── background.js            # Service worker for cross-origin API calls & cross-tab pinned items
│   ├── content.js               # Universal "Add to Cart" button detector, JSON-LD/OG scraper & Shadow DOM drawer
│   ├── styles.css               # Dark-mode glassmorphic UI (#0B0F19 base, #8B5CF6 primary, #10B981 emerald badges)
│   ├── popup.html               # Extension popup to configure cPanel Backend URL, API keys, and Pinned Look items
│   └── popup.js                 # Popup state controller
└── README.md                    # Complete Hackathon Submission README + cPanel deployment guide + 3-minute video script