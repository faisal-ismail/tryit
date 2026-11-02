# ✨ TryIt AI — Universal Agentic eCommerce VTO & Skin AI Orchestrator

> **Built for the [YouCam API Skin AI & eCommerce VTO Hackathon](https://youcam-api-skin-ai-ecommerce.devpost.com/)**  
> **Tracks Covered:** **eCommerce VTO** + **Skin AI** + **Combined Agentic AI Workflow**  
> **Repository:** [https://github.com/faisal-ismail/tryit](https://github.com/faisal-ismail/tryit) • **Live Demo Store:** [https://tryit-ai-165171821863.us-central1.run.app/demo-store](https://tryit-ai-165171821863.us-central1.run.app/demo-store) • **API Docs:** [https://tryit-ai-165171821863.us-central1.run.app/docs](https://tryit-ai-165171821863.us-central1.run.app/docs)  
> **Judging Contact / Submission:** Public open-source repository (MIT Licensed), 
---

## 📸 Project Showcase & Screenshots

### 🌟 Project Cover & Overview
![TryIt AI Cover Showcase](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/005/776/579/datas/gallery.jpg)

### 👗 Virtual Try-On Engine (cloth-v4, shoes-transfer & bag)
![Virtual Dress Try-On Screenshot](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/005/776/950/datas/gallery.jpg)

### 🔬 Clinical Skin AI & Dermal Barrier Analysis (skin-analysis)
![Skin Analysis Telemetry Screenshot](https://d112y698adiu2z.cloudfront.net/photos/production/software_photos/005/777/326/datas/gallery.jpg)

---

## 💡 Overview & Value Proposition

Online fashion and beauty shopping has a persistent problem: **guesswork**. Shoppers face uncertain sizing charts (driving apparel return rates over 30%) and frequently risk adverse skin reactions from purchasing active chemical skincare ingredients that directly conflict with their skin barrier.

**TryIt AI** solves this by unifying an agentic browser extension and a cloud-native fitting room:

* **For Consumers:** Delivers instant, photorealistic virtual try-ons across multi-category outfits (apparel, footwear, bags, headwear) and clinical pre-checkout skin compatibility checks right beside the *Add to Cart* button on any website.
* **For Retailers & Brands:** Eliminates purchase hesitation, increases cart conversion, and drastically lowers reverse logistics costs caused by fit-related returns—all with zero custom integration code required from store merchants.

---

## 🌟 Core Features & Technical Innovations

### 1. Universal DOM Button Injection (`extension/content.js`)
* Automatically detects product pages on **any** eCommerce website across the web (including live stores like [ZARR (zarr.com.pk)](https://zarr.com.pk/), [Edenrobe (edenrobe.com)](https://edenrobe.com/), Zara, Sephora, Amazon, and Shopify storefronts).
* Injects a sleek dark-mode **`✨ TryIt with AI`** button directly beside native *"Add to Cart"* / *"Buy Now"* buttons.
* Automatically scrapes product title, breadcrumb category, price, high-resolution product imagery, and active cosmetic ingredients using Schema.org JSON-LD (`application/ld+json`), OpenGraph (`og:image`), and semantic DOM selectors.

### 2. Autonomous Gemini 2.5 Flash Router & Multi-Endpoint YouCam S2S v2.0 Integration
Classifies scraped products in under 1.5 seconds and routes them to the exact YouCam S2S v2.0 pipeline while automatically sanitizing known endpoint parameter nuances:

| YouCam Pipeline | Product Categories | Built-In S2S v2.0 Parameter Quirk Handling |
| :--- | :--- | :--- |
| **`cloth-v4`** | Tops, Bottoms, Dresses, Outerwear | Strictly maps `gender` to `"male"` or `"female"` and infers `garment_category` (`upper_body`, `lower_body`, `full_body`). |
| **`shoes-transfer`** | Sneakers, Boots, Heels, Loafers | Passes gender-calibrated foot perspective parameters (`fitting_mode: "auto_perspective"`). |
| **`bag`** | Handbags, Crossbody, Totes | **Explicitly omits `style`** (since the YouCam `bag` endpoint rejects `style` with HTTP 400). |
| **`scarf` & `hat`** | Scarves, Shawls, Berets, Caps | **Explicitly enforces `style: "random"`** for natural draping and headwear tilt. |
| **`makeup-vto`** | Lipsticks, Lip Tints, Blush | Transfers pigment hex (`selected_shade_hex`) and evaluates undertone harmony. |
| **`skin-analysis`** | Serums, Acids, Retinoids, Creams | Evaluates 6 quantitative dermal biomarkers (`Moisture`, `Redness`, `Acne`, `Pores`, `Wrinkles`, `Texture`) against active ingredients. |

### 3. Cross-Store "Look Builder" API Chaining (`POST /api/tryon/chain`)
* Shoppers can click **`📌 Pin to Look`** on a garment from Store A (e.g., an emerald trench blazer from ZARR or Zara) and then browse to Store B (e.g., *Nordstrom Chelsea Boots* or *Net-a-Porter Crossbody Bag*) and click **`⛓️ Chain Combined Look`**.
* The backend pipes the rendered high-resolution output image URL from **YouCam Task #1** directly as the source person image into **YouCam Task #2**, creating a unified head-to-toe cross-store virtual try-on!

### 4. "Moment of Decision" Agentic Pre-Checkout Verdict
Synthesizes the user's YouCam Skin Analysis telemetry with the scraped product data to output a structured decision card right before checkout:
* `match_score` (0–100%)
* `verdict_headline` (e.g., `⚠️ Barrier Conflict Warning: High-Potency Exfoliant vs. Your Redness Score of 41/100` or `✅ 96% Skin Telemetry Match: Ideal Barrier Support`)
* `actionable_advice` (Tailored sizing advice for apparel or ingredient buffer/swap advice for skincare)
* `agent_trace` (Full step-by-step trace from DOM scrape → Gemini 2.5 Flash routing → YouCam S2S v2.0 parameters → Verdict synthesis).

### 5. Custom Person Profiles, Multi-Photo Galleries & NLP Text Edits
* **8 Diverse Pre-Built Studio Models:** Male and female models across **Asian** (*Maya Lin*, *Kenji Sato*), **African** (*Zara Okafor*, *Malik Mensah*), **American** (*Claire Bennett*, *Liam Vance*), and **Latin** (*Sofia Morales*, *Mateo Rivera*) backgrounds.
* **Custom Person Profiles:** Create custom shopper profiles, upload multiple photos, choose specific photos before running Try-On, and click **`📥 Add to Photos`** on any generated try-on result to save that look back into the person's profile gallery.
* **Edit Look by Text Command (`POST /api/tryon/edit-command`):** Modify any rendered look using natural-language commands such as `"Remove last item"`, `"Add obsidian leather boots"`, `"Add camel cashmere scarf"`, or `"Add quilted crossbody bag"`.

### 6. Dual-Access Architecture (Works With OR Without Extension)
* **Mode A (Hosted `/demo-store` Web Sandbox):** Served at `GET /demo-store` with `widget.js` pre-embedded, 8 diverse models, custom profile creator, and live webcam capture.
* **Mode B (Universal Chrome Extension):** Load `extension/` unpacked in Chrome to inject TryIt AI onto any live eCommerce store across the web.

---

## 📱 What's Next: Cross-Platform Flutter Mobile App (Android & iOS)

As an experienced Flutter developer, my immediate next development roadmap includes launching the official **TryIt AI Mobile App** for Android and iOS using Flutter:
* **Mobile In-App Browser:** An integrated mobile shopping browser that automatically injects the TryIt AI fitting room modal onto mobile eCommerce sites.
* **Native AR Camera Integration:** Instant real-time face, undertone, and full-body scans using native camera hardware.
* **Synchronized Lookbook:** Cloud-synced user wardrobe and chained outfits accessible across browser extension and mobile app.
* **1-Click Multi-Store Cart:** Consolidating multi-store outfit items into a single checkout flow.

---

## 🏗️ Repository Structure

```text
tryit-ai/
├── backend/
│   ├── main.py                  # FastAPI application serving API endpoints & /demo-store
│   ├── youcam_client.py         # Complete YouCam S2S v2.0 REST client + studio fallback compositor
│   ├── agent_orchestrator.py    # Gemini 2.5 Flash classifier, cosmetic chemist & stylist agent
│   ├── schemas.py               # Pydantic v2 models for all requests, tasks, and verdicts
│   ├── Dockerfile               # Production container image for Google Cloud Run
│   ├── requirements.txt         # fastapi, uvicorn, httpx, pydantic, google-genai, pillow
│   ├── .env.example             # YOUCAM_API_KEY, GEMINI_API_KEY, DEMO_FALLBACK_MODE
│   ├── test_app.py              # Automated pytest suite verifying endpoints, quirks & chaining
│   └── static/
│       ├── demo_store.html      # Interactive multi-store eCommerce showcase
│       └── widget.js            # Slide-over fitting room UI script used by /demo-store
├── extension/
│   ├── manifest.json            # Chrome Extension Manifest V3
│   ├── config.js                # Backend URL configuration (Cloud Run or localhost)
│   ├── background.js            # Service worker for CORS-free API calls & cross-tab look state
│   ├── content.js               # Universal "Add to Cart" detector, JSON-LD/OG scraper & Shadow DOM drawer
│   ├── styles.css               # Dark-mode glassmorphic UI styling
│   ├── popup.html               # Extension popup for configuration & pinned looks
│   └── popup.js                 # Popup state controller
├── index.html                   # Standalone client page pre-configured with Cloud Run backend
└── README.md                    # Project documentation & hackathon judging guide
```

---

## 🚀 Quick Start (Local Development)

### 1. Start the FastAPI Backend & `/demo-store`
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Copy .env.example to .env and add your keys (or run in resilient studio fallback mode)
cp .env.example .env

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Open **[http://localhost:8000/demo-store](http://localhost:8000/demo-store)** in your browser!

### 2. Load the Chrome Extension (Manifest V3)
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `extension/` folder.
4. Visit any product page (e.g. [zarr.com.pk](https://zarr.com.pk/) or [edenrobe.com](https://edenrobe.com/)) and click **"✨ Try It On"** beside Add to Cart!

### 3. Run the Automated Test Suite
```bash
DEMO_FALLBACK_MODE=true PYTHONPATH=backend python3 backend/test_app.py
```

---

## ☁️ Production Deployment (Google Cloud Run)

The production backend is containerized with Docker and deployed on **Google Cloud Run**:
* **Live Service URL:** [https://tryit-ai-165171821863.us-central1.run.app](https://tryit-ai-165171821863.us-central1.run.app)
* **Demo Store:** [https://tryit-ai-165171821863.us-central1.run.app/demo-store](https://tryit-ai-165171821863.us-central1.run.app/demo-store)
* **Interactive Docs:** [https://tryit-ai-165171821863.us-central1.run.app/docs](https://tryit-ai-165171821863.us-central1.run.app/docs)

Deploy command:
```bash
gcloud run deploy tryit-ai --source backend --region us-central1 --project "your-cloud-project" --allow-unauthenticated
```

---

## 📄 License & Open-Source Compliance

This repository is publicly available under the **MIT License**.  
All necessary source code, assets, extension manifests, test suites, and deployment configurations are fully contained within this repository for hackathon judging and testing.
