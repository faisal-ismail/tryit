"""
FastAPI Backend & cPanel Orchestrator for TryIt AI.
Provides:
  - Non-blocking split polling endpoints (`/api/tryon/start`, `/api/tryon/status/{task_id}`)
    engineered to respond in < 1.5s for shared cPanel Phusion Passenger WSGI hosting.
  - Cross-Store "Look Builder" API Chaining (`POST /api/tryon/chain`).
  - Natural-Language Text Command Editing (`POST /api/tryon/edit-command`) to add/remove items.
  - 8 Diverse Pre-Loaded Models of both genders across Asian, African, American, and Latin backgrounds.
  - CORS-safe image proxy (`GET /api/proxy-image?url=...`).
  - Hosted `/demo-store` Dual-Access Judge Mode storefront (`GET /demo-store`).
"""
from contextlib import asynccontextmanager
import io
import os
from typing import Any, Dict, List

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageDraw

from agent_orchestrator import AgentOrchestrator
from schemas import (
    ChainTryOnRequest,
    EditTryOnCommandRequest,
    ScrapedProduct,
    TryOnStartRequest,
    TryOnStartResponse,
    TryOnStatusResponse,
)
from youcam_client import YouCamClient, _load_clean_font

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
GENERATED_DIR = os.path.join(STATIC_DIR, "generated")
ASSETS_DIR = os.path.join(STATIC_DIR, "assets")

os.makedirs(GENERATED_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)

REAL_STUDIO_PHOTO_URLS: Dict[str, str] = {
    # Asian (Female & Male)
    "persona_maya_body.png": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=85",
    "persona_maya_face.png": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=85",
    "persona_kenji_body.png": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=85",
    "persona_kenji_face.png": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=85",
    # African (Female & Male)
    "persona_zara_body.png": "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=85",
    "persona_zara_face.png": "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=800&q=85",
    "persona_malik_body.png": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=85",
    "persona_malik_face.png": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=85",
    # American / Caucasian (Female & Male)
    "persona_claire_body.png": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=85",
    "persona_claire_face.png": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=85",
    "persona_liam_body.png": "https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=800&q=85",
    "persona_liam_face.png": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=85",
    # Latin / Hispanic (Female & Male)
    "persona_sofia_body.png": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=85",
    "persona_sofia_face.png": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=85",
    "persona_mateo_body.png": "https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?auto=format&fit=crop&w=800&q=85",
    "persona_mateo_face.png": "https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=800&q=85",
    # Products
    "prod_jacket.png": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=700&q=85",
    "prod_dress.png": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=700&q=85",
    "prod_shoes.png": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=700&q=85",
    "prod_bag.png": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=700&q=85",
    "prod_scarf.png": "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=700&q=85",
    "prod_hat.png": "https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?auto=format&fit=crop&w=700&q=85",
    "prod_lipstick.png": "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=700&q=85",
    "prod_acid_serum.png": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=700&q=85",
    "prod_cica_cream.png": "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=700&q=85",
}


def _ensure_local_studio_assets() -> None:
    """
    Generates crisp, TrueType-rendered studio portrait & product PNG assets in `static/assets/`
    so `/demo-store` and offline automated tests always have valid local images.
    """
    font_title = _load_clean_font(size=16, bold=True)
    font_sub = _load_clean_font(size=13, bold=False)

    personas_spec = [
        ("persona_maya_body.png", (30, 41, 59), (217, 179, 145), (187, 153, 53), "MAYA LIN | ASIAN (F)", "Warm Olive | Size M"),
        ("persona_maya_face.png", (30, 41, 59), (217, 179, 145), (187, 153, 53), "MAYA LIN | PORTRAIT", "Warm Olive | Size M"),
        ("persona_kenji_body.png", (20, 30, 48), (210, 172, 138), (187, 153, 53), "KENJI SATO | ASIAN (M)", "Warm Neutral | Size L"),
        ("persona_kenji_face.png", (20, 30, 48), (210, 172, 138), (187, 153, 53), "KENJI SATO | PORTRAIT", "Warm Neutral | Size L"),
        ("persona_zara_body.png", (24, 24, 37), (141, 85, 58), (187, 153, 53), "ZARA OKAFOR | AFRICAN (F)", "Rich Warm | Size S"),
        ("persona_zara_face.png", (24, 24, 37), (141, 85, 58), (187, 153, 53), "ZARA OKAFOR | PORTRAIT", "Rich Warm | Size S"),
        ("persona_malik_body.png", (18, 22, 34), (118, 72, 48), (187, 153, 53), "MALIK MENSAH | AFRICAN (M)", "Deep Warm | Size L"),
        ("persona_malik_face.png", (18, 22, 34), (118, 72, 48), (187, 153, 53), "MALIK MENSAH | PORTRAIT", "Deep Warm | Size L"),
        ("persona_claire_body.png", (28, 36, 52), (238, 208, 188), (187, 153, 53), "CLAIRE BENNETT | AMERICAN (F)", "Cool Fair | Size M"),
        ("persona_claire_face.png", (28, 36, 52), (238, 208, 188), (187, 153, 53), "CLAIRE BENNETT | PORTRAIT", "Cool Fair | Size M"),
        ("persona_liam_body.png", (15, 23, 42), (229, 194, 166), (187, 153, 53), "LIAM VANCE | AMERICAN (M)", "Cool Neutral | Size L"),
        ("persona_liam_face.png", (15, 23, 42), (229, 194, 166), (187, 153, 53), "LIAM VANCE | PORTRAIT", "Cool Neutral | Size L"),
        ("persona_sofia_body.png", (32, 28, 44), (198, 148, 112), (187, 153, 53), "SOFIA MORALES | LATIN (F)", "Golden Tan | Size S"),
        ("persona_sofia_face.png", (32, 28, 44), (198, 148, 112), (187, 153, 53), "SOFIA MORALES | PORTRAIT", "Golden Tan | Size S"),
        ("persona_mateo_body.png", (22, 28, 40), (186, 136, 102), (187, 153, 53), "MATEO RIVERA | LATIN (M)", "Warm Bronze | Size M"),
        ("persona_mateo_face.png", (22, 28, 40), (186, 136, 102), (187, 153, 53), "MATEO RIVERA | PORTRAIT", "Warm Bronze | Size M"),
    ]
    for fname, bg, skin, accent, title, subtitle in personas_spec:
        fpath = os.path.join(ASSETS_DIR, fname)
        if not os.path.exists(fpath):
            w, h = 720, 920
            img = Image.new("RGBA", (w, h), (*bg, 255))
            draw = ImageDraw.Draw(img)
            draw.ellipse((w // 2 - 280, h // 2 - 320, w // 2 + 280, h // 2 + 320), fill=(bg[0] + 16, bg[1] + 20, bg[2] + 28, 255))
            if "face" in fname:
                draw.rounded_rectangle((w // 2 - 190, 560, w // 2 + 190, 900), radius=80, fill=(*accent, 210))
                draw.ellipse((w // 2 - 145, 210, w // 2 + 145, 575), fill=(*skin, 255), outline=(255, 255, 255, 90), width=3)
                draw.ellipse((w // 2 - 65, 355, w // 2 - 35, 375), fill=(30, 41, 59, 220))
                draw.ellipse((w // 2 + 35, 355, w // 2 + 65, 375), fill=(30, 41, 59, 220))
                draw.arc((w // 2 - 42, 450, w // 2 + 42, 495), start=10, end=170, fill=(190, 85, 95, 230), width=4)
            else:
                draw.ellipse((w // 2 - 62, 130, w // 2 + 62, 260), fill=(*skin, 255))
                draw.rounded_rectangle((w // 2 - 145, 270, w // 2 + 145, 580), radius=48, fill=(51, 65, 85, 255), outline=(*accent, 180), width=3)
                draw.rounded_rectangle((w // 2 - 115, 565, w // 2 - 12, 820), radius=24, fill=(30, 41, 59, 255))
                draw.rounded_rectangle((w // 2 + 12, 565, w // 2 + 115, 820), radius=24, fill=(30, 41, 59, 255))
            draw.rounded_rectangle((36, 825, w - 36, 895), radius=14, fill=(11, 15, 25, 220), outline=(*accent, 200), width=2)
            draw.text((58, 838), title, fill=(248, 250, 252, 255), font=font_title)
            draw.text((58, 864), subtitle, fill=(148, 163, 184, 255), font=font_sub)
            img.convert("RGB").save(fpath, format="PNG")

    products_spec = [
        ("prod_jacket.png", (187, 153, 53), "garment", "ATELIER EMERALD TRENCH BLAZER"),
        ("prod_dress.png", (236, 72, 153), "dress", "SILK MIDI SLIP DRESS"),
        ("prod_shoes.png", (245, 158, 11), "shoes", "MILAN LEATHER CHELSEA BOOTS"),
        ("prod_bag.png", (16, 185, 129), "bag", "QUILTED CROSSBODY SATCHEL"),
        ("prod_scarf.png", (56, 189, 248), "scarf", "CASHMERE HERRINGBONE WRAP SCARF"),
        ("prod_hat.png", (168, 85, 247), "hat", "PARISIAN WOOL FELT BERET"),
        ("prod_lipstick.png", (225, 29, 72), "makeup", "VELVET ROSE LIP & CHEEK TINT"),
        ("prod_acid_serum.png", (239, 68, 68), "skincare", "10% GLYCOLIC + 2% BHA RESURFACING PEEL"),
        ("prod_cica_cream.png", (16, 185, 129), "skincare", "CICA + 5% CERAMIDE BARRIER REPAIR CREAM"),
    ]
    for fname, color, shape, label in products_spec:
        fpath = os.path.join(ASSETS_DIR, fname)
        if not os.path.exists(fpath):
            w, h = 520, 520
            img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            if shape == "garment":
                draw.polygon([(140, 90), (380, 90), (450, 240), (385, 275), (355, 195), (355, 440), (165, 440), (165, 195), (135, 275), (70, 240)], fill=(*color, 235), outline=(255, 255, 255, 220))
            elif shape == "dress":
                draw.polygon([(195, 80), (325, 80), (390, 450), (130, 450)], fill=(*color, 235), outline=(255, 255, 255, 220))
            elif shape == "shoes":
                draw.rounded_rectangle((95, 230, 245, 410), radius=28, fill=(*color, 240), outline=(255, 255, 255, 220), width=3)
                draw.rounded_rectangle((275, 230, 425, 410), radius=28, fill=(*color, 240), outline=(255, 255, 255, 220), width=3)
            elif shape == "bag":
                draw.arc((185, 95, 335, 250), start=180, end=360, fill=(255, 255, 255, 230), width=8)
                draw.rounded_rectangle((135, 190, 385, 415), radius=34, fill=(*color, 240), outline=(255, 255, 255, 220), width=3)
            elif shape == "scarf":
                draw.rounded_rectangle((120, 145, 400, 260), radius=45, fill=(*color, 240), outline=(255, 255, 255, 220), width=3)
                draw.rounded_rectangle((270, 220, 365, 430), radius=22, fill=(*color, 225), outline=(255, 255, 255, 200), width=2)
            elif shape == "hat":
                draw.ellipse((95, 230, 425, 325), fill=(*color, 240), outline=(255, 255, 255, 220), width=3)
                draw.ellipse((145, 140, 375, 285), fill=(*color, 245), outline=(255, 255, 255, 220), width=3)
            else:
                draw.rounded_rectangle((220, 85, 300, 155), radius=12, fill=(226, 232, 240, 255))
                draw.rounded_rectangle((175, 155, 345, 435), radius=32, fill=(*color, 240), outline=(255, 255, 255, 230), width=3)
                draw.rounded_rectangle((195, 225, 325, 355), radius=14, fill=(15, 23, 42, 225))
            draw.rounded_rectangle((40, 445, w - 40, 500), radius=12, fill=(15, 23, 42, 230), outline=(*color, 220), width=2)
            draw.text((58, 463), label[:34], fill=(248, 250, 252, 255), font=font_sub)
            img.save(fpath, format="PNG")


async def _upgrade_assets_with_real_photos_if_online() -> None:
    """
    When running with internet access, upgrades small local placeholder PNGs (< 20 KB)
    with real studio portrait & product photography.
    """
    try:
        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
            for fname, url in REAL_STUDIO_PHOTO_URLS.items():
                fpath = os.path.join(ASSETS_DIR, fname)
                if not os.path.exists(fpath) or os.path.getsize(fpath) < 20000:
                    resp = await client.get(url)
                    if resp.status_code == 200 and len(resp.content) > 15000:
                        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
                        img.save(fpath, format="PNG")
    except Exception:
        pass


_ensure_local_studio_assets()

PRELOADED_PERSONAS: List[Dict[str, Any]] = [
    {
        "persona_id": "maya",
        "person_name": "Maya Lin",
        "ethnicity": "Asian",
        "badge": "Asian • Female • Warm Olive",
        "gender": "female",
        "undertone": "Warm Olive",
        "skin_type": "Combination / Redness-Prone",
        "usual_size": "M",
        "full_body_image_url": "/static/assets/persona_maya_body.png",
        "face_image_url": "/static/assets/persona_maya_face.png",
        "photos": [
            {"photo_id": "maya_full", "label": "Full-Body Look", "url": "/static/assets/persona_maya_body.png"},
            {"photo_id": "maya_face", "label": "Close-Up Portrait", "url": "/static/assets/persona_maya_face.png"},
        ],
        "baseline_skin_scores": {
            "moisture": 68,
            "redness": 41,
            "acne": 78,
            "pores": 72,
            "wrinkles": 88,
            "texture": 75,
        },
    },
    {
        "persona_id": "kenji",
        "person_name": "Kenji Sato",
        "ethnicity": "Asian",
        "badge": "Asian • Male • Warm Neutral",
        "gender": "male",
        "undertone": "Warm Neutral",
        "skin_type": "Normal / Balanced",
        "usual_size": "L",
        "full_body_image_url": "/static/assets/persona_kenji_body.png",
        "face_image_url": "/static/assets/persona_kenji_face.png",
        "photos": [
            {"photo_id": "kenji_full", "label": "Full-Body Look", "url": "/static/assets/persona_kenji_body.png"},
            {"photo_id": "kenji_face", "label": "Close-Up Portrait", "url": "/static/assets/persona_kenji_face.png"},
        ],
        "baseline_skin_scores": {
            "moisture": 72,
            "redness": 80,
            "acne": 84,
            "pores": 74,
            "wrinkles": 89,
            "texture": 81,
        },
    },
    {
        "persona_id": "zara",
        "person_name": "Zara Okafor",
        "ethnicity": "African",
        "badge": "African • Female • Rich Warm",
        "gender": "female",
        "undertone": "Rich Warm",
        "skin_type": "Hydrated / Resilient",
        "usual_size": "S",
        "full_body_image_url": "/static/assets/persona_zara_body.png",
        "face_image_url": "/static/assets/persona_zara_face.png",
        "photos": [
            {"photo_id": "zara_full", "label": "Full-Body Look", "url": "/static/assets/persona_zara_body.png"},
            {"photo_id": "zara_face", "label": "Close-Up Portrait", "url": "/static/assets/persona_zara_face.png"},
        ],
        "baseline_skin_scores": {
            "moisture": 82,
            "redness": 84,
            "acne": 89,
            "pores": 80,
            "wrinkles": 92,
            "texture": 86,
        },
    },
    {
        "persona_id": "malik",
        "person_name": "Malik Mensah",
        "ethnicity": "African",
        "badge": "African • Male • Deep Warm",
        "gender": "male",
        "undertone": "Deep Warm",
        "skin_type": "Balanced / Resilient",
        "usual_size": "L",
        "full_body_image_url": "/static/assets/persona_malik_body.png",
        "face_image_url": "/static/assets/persona_malik_face.png",
        "photos": [
            {"photo_id": "malik_full", "label": "Full-Body Look", "url": "/static/assets/persona_malik_body.png"},
            {"photo_id": "malik_face", "label": "Close-Up Portrait", "url": "/static/assets/persona_malik_face.png"},
        ],
        "baseline_skin_scores": {
            "moisture": 78,
            "redness": 86,
            "acne": 85,
            "pores": 79,
            "wrinkles": 91,
            "texture": 84,
        },
    },
    {
        "persona_id": "claire",
        "person_name": "Claire Bennett",
        "ethnicity": "American",
        "badge": "American • Female • Cool Fair",
        "gender": "female",
        "undertone": "Cool Fair",
        "skin_type": "Dry / Delicate",
        "usual_size": "M",
        "full_body_image_url": "/static/assets/persona_claire_body.png",
        "face_image_url": "/static/assets/persona_claire_face.png",
        "photos": [
            {"photo_id": "claire_full", "label": "Full-Body Look", "url": "/static/assets/persona_claire_body.png"},
            {"photo_id": "claire_face", "label": "Close-Up Portrait", "url": "/static/assets/persona_claire_face.png"},
        ],
        "baseline_skin_scores": {
            "moisture": 62,
            "redness": 58,
            "acne": 86,
            "pores": 77,
            "wrinkles": 84,
            "texture": 78,
        },
    },
    {
        "persona_id": "liam",
        "person_name": "Liam Vance",
        "ethnicity": "American",
        "badge": "American • Male • Cool Neutral",
        "gender": "male",
        "undertone": "Cool Neutral",
        "skin_type": "Normal / Balanced",
        "usual_size": "L",
        "full_body_image_url": "/static/assets/persona_liam_body.png",
        "face_image_url": "/static/assets/persona_liam_face.png",
        "photos": [
            {"photo_id": "liam_full", "label": "Full-Body Look", "url": "/static/assets/persona_liam_body.png"},
            {"photo_id": "liam_face", "label": "Close-Up Portrait", "url": "/static/assets/persona_liam_face.png"},
        ],
        "baseline_skin_scores": {
            "moisture": 64,
            "redness": 76,
            "acne": 82,
            "pores": 70,
            "wrinkles": 85,
            "texture": 79,
        },
    },
    {
        "persona_id": "sofia",
        "person_name": "Sofia Morales",
        "ethnicity": "Latin",
        "badge": "Latin • Female • Golden Tan",
        "gender": "female",
        "undertone": "Golden Tan",
        "skin_type": "Combination / Radiant",
        "usual_size": "S",
        "full_body_image_url": "/static/assets/persona_sofia_body.png",
        "face_image_url": "/static/assets/persona_sofia_face.png",
        "photos": [
            {"photo_id": "sofia_full", "label": "Full-Body Look", "url": "/static/assets/persona_sofia_body.png"},
            {"photo_id": "sofia_face", "label": "Close-Up Portrait", "url": "/static/assets/persona_sofia_face.png"},
        ],
        "baseline_skin_scores": {
            "moisture": 75,
            "redness": 74,
            "acne": 83,
            "pores": 76,
            "wrinkles": 90,
            "texture": 82,
        },
    },
    {
        "persona_id": "mateo",
        "person_name": "Mateo Rivera",
        "ethnicity": "Latin",
        "badge": "Latin • Male • Warm Bronze",
        "gender": "male",
        "undertone": "Warm Bronze",
        "skin_type": "Normal / Hydrated",
        "usual_size": "M",
        "full_body_image_url": "/static/assets/persona_mateo_body.png",
        "face_image_url": "/static/assets/persona_mateo_face.png",
        "photos": [
            {"photo_id": "mateo_full", "label": "Full-Body Look", "url": "/static/assets/persona_mateo_body.png"},
            {"photo_id": "mateo_face", "label": "Close-Up Portrait", "url": "/static/assets/persona_mateo_face.png"},
        ],
        "baseline_skin_scores": {
            "moisture": 74,
            "redness": 79,
            "acne": 81,
            "pores": 75,
            "wrinkles": 88,
            "texture": 80,
        },
    },
]

DEMO_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "zara-emerald-blazer",
        "title": "Atelier Structured Emerald Trench Blazer",
        "brand": "ZARA STUDIO",
        "category_hint": "Apparel > Outerwear > Blazers",
        "price": "$189.00",
        "image_url": "/static/assets/prod_jacket.png",
        "ingredients": "78% Virgin Wool, 22% Mulberry Silk Lining. Tailored structured shoulder.",
        "youcam_pipeline": "cloth-v4",
        "store_tag": "Store A • Fashion Apparel",
    },
    {
        "id": "milan-chelsea-boots",
        "title": "Milan Handcrafted Leather Chelsea Boots",
        "brand": "NORDSTROM",
        "category_hint": "Footwear > Boots > Leather Shoes",
        "price": "$245.00",
        "image_url": "/static/assets/prod_shoes.png",
        "ingredients": "100% Full-Grain Italian Calfskin Leather, Goodyear Welted Sole.",
        "youcam_pipeline": "shoes-transfer",
        "store_tag": "Store B • Footwear (Chainable)",
    },
    {
        "id": "quilted-crossbody-bag",
        "title": "Bottega Quilted Emerald Crossbody Bag",
        "brand": "NET-A-PORTER",
        "category_hint": "Accessories > Handbags > Crossbody Bag",
        "price": "$320.00",
        "image_url": "/static/assets/prod_bag.png",
        "ingredients": "Supple Lambskin Intrecciato Weave, Brushed Gold Hardware.",
        "youcam_pipeline": "bag",
        "store_tag": "Store C • Handbags (No `style` Quirk)",
    },
    {
        "id": "cashmere-drape-scarf",
        "title": "Nordic Pure Cashmere Herringbone Scarf",
        "brand": "ACNE STUDIOS",
        "category_hint": "Accessories > Neckwear > Scarf",
        "price": "$150.00",
        "image_url": "/static/assets/prod_scarf.png",
        "ingredients": "100% Grade-A Inner Mongolian Cashmere (`style: random` draping).",
        "youcam_pipeline": "scarf",
        "store_tag": "Store D • Scarf (`style: random`)",
    },
    {
        "id": "parisian-wool-beret",
        "title": "Montmartre Sculpted Wool Felt Beret Hat",
        "brand": "MAISON MICHEL",
        "category_hint": "Accessories > Headwear > Hat",
        "price": "$115.00",
        "image_url": "/static/assets/prod_hat.png",
        "ingredients": "100% Merino Wool Felt (`style: random` natural tilt).",
        "youcam_pipeline": "hat",
        "store_tag": "Store E • Headwear (`style: random`)",
    },
    {
        "id": "velvet-rose-lip-tint",
        "title": "Velvet Blur Lip & Cheek Multi-Tint (#D94E64)",
        "brand": "SEPHORA COLLECTION",
        "category_hint": "Beauty > Makeup > Lipstick & Blush",
        "price": "$34.00",
        "image_url": "/static/assets/prod_lipstick.png",
        "ingredients": "Squalane, Rosehip Seed Oil, Vitamin E, Satin Mineral Pigments.",
        "selected_shade_hex": "#D94E64",
        "youcam_pipeline": "makeup-vto",
        "store_tag": "Store F • Makeup VTO",
    },
    {
        "id": "glycolic-10-peel-serum",
        "title": "10% Glycolic Acid + 2% Salicylic BHA Resurfacing Peel Serum",
        "brand": "DERMALOGICA LABS",
        "category_hint": "Skincare > Treatments > Exfoliating Acid Serum",
        "price": "$68.00",
        "image_url": "/static/assets/prod_acid_serum.png",
        "ingredients": "10% Glycolic Acid (AHA), 2% Salicylic Acid (BHA), Retinol Ester, Alcohol Denat, Witch Hazel.",
        "youcam_pipeline": "skin-analysis",
        "store_tag": "Skincare • Triggers Barrier Conflict on Maya",
    },
    {
        "id": "cica-ceramide-barrier-cream",
        "title": "Centella Cica + 5% Ceramide NP Barrier Rescue Cream",
        "brand": "DR. JART+ CLINICAL",
        "category_hint": "Skincare > Moisturizers > Barrier Repair Cream",
        "price": "$52.00",
        "image_url": "/static/assets/prod_cica_cream.png",
        "ingredients": "5% Ceramide NP, Centella Asiatica (Cica), 2% Panthenol, Hyaluronic Acid, Squalane, Colloidal Oat.",
        "youcam_pipeline": "skin-analysis",
        "store_tag": "Skincare • 96% Biometric Match for Maya",
    },
]

orchestrator = AgentOrchestrator()
youcam_client = YouCamClient(orchestrator=orchestrator, generated_dir=GENERATED_DIR)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    import asyncio
    asyncio.create_task(_upgrade_assets_with_real_photos_if_online())
    yield


app = FastAPI(
    title="TryIt AI — YouCam API Skin AI & eCommerce VTO Orchestrator",
    description=(
        "Universal Agentic eCommerce Chrome Extension & Web Sandbox Storefront powered by "
        "YouCam S2S v2.0 REST APIs + Google Gemini 2.5 Flash."
    ),
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
@app.get("/index.html", response_class=HTMLResponse, include_in_schema=False)
async def serve_landing_page(request: Request):
    accept = request.headers.get("accept", "")
    if "application/json" in accept and "text/html" not in accept:
        return Response(
            content='{"service":"TryIt AI","domain":"https://tryit.sineix.com","status":"online","demo_store_url":"/demo-store","docs_url":"/docs"}',
            media_type="application/json",
        )
    html_path = os.path.join(STATIC_DIR, "demo_store.html")
    if os.path.isfile(html_path):
        with open(html_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>TryIt AI is online. Loading landing page...</h1>", status_code=200)


@app.get("/demo-store", response_class=HTMLResponse)
async def serve_demo_store():
    html_path = os.path.join(STATIC_DIR, "demo_store.html")
    if os.path.isfile(html_path):
        with open(html_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    raise HTTPException(status_code=404, detail="demo_store.html not found")


@app.get("/api/download-extension")
async def download_chrome_extension():
    """
    Serves the pre-packaged Chrome Extension (Manifest V3) .zip archive
    pre-configured for https://tryit.sineix.com.
    """
    static_zip_path = os.path.join(STATIC_DIR, "tryit-chrome-extension.zip")

    if os.path.isfile(static_zip_path):
        with open(static_zip_path, "rb") as f:
            data = f.read()
        return Response(
            content=data,
            media_type="application/zip",
            headers={
                "Content-Disposition": 'attachment; filename="tryit-chrome-extension.zip"',
                "Cache-Control": "no-cache",
            },
        )

    # Fallback: package from extension/ directory if present
    import io
    import zipfile

    for cand_dir in [
        os.path.abspath(os.path.join(BASE_DIR, "extension")),
        os.path.abspath(os.path.join(BASE_DIR, "..", "extension")),
    ]:
        if os.path.isdir(cand_dir):
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
                for root_dir, _, files in os.walk(cand_dir):
                    for file in files:
                        if file.startswith("."):
                            continue
                        full_path = os.path.join(root_dir, file)
                        rel_path = os.path.relpath(full_path, cand_dir)
                        zf.write(full_path, arcname=f"tryit-extension/{rel_path}")
            zip_bytes = buf.getvalue()
            try:
                with open(static_zip_path, "wb") as f:
                    f.write(zip_bytes)
            except Exception:
                pass
            return Response(
                content=zip_bytes,
                media_type="application/zip",
                headers={
                    "Content-Disposition": 'attachment; filename="tryit-chrome-extension.zip"',
                    "Cache-Control": "no-cache",
                },
            )

    raise HTTPException(status_code=404, detail="Extension package not found")


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "app": "TryIt AI",
        "cpanel_wsgi_ready": True,
        "supported_youcam_pipelines": [
            "cloth-v4",
            "shoes-transfer",
            "bag",
            "scarf",
            "hat",
            "makeup-vto",
            "skin-analysis",
        ],
        "fallback_mode": youcam_client.fallback_mode,
        "gemini_model": orchestrator.model_name,
    }


@app.get("/api/personas")
async def list_personas():
    return {"personas": PRELOADED_PERSONAS}


@app.get("/api/catalog")
async def list_demo_catalog():
    return {"products": DEMO_CATALOG, "personas": PRELOADED_PERSONAS}


@app.post("/api/tryon/start", response_model=TryOnStartResponse)
async def start_tryon(req: TryOnStartRequest):
    return await youcam_client.start_tryon_task(
        product=req.product,
        persona=req.persona,
        override_youcam_key=req.override_youcam_key,
        override_gemini_key=req.override_gemini_key,
    )


@app.get("/api/tryon/status/{task_id}", response_model=TryOnStatusResponse)
async def get_tryon_status(task_id: str):
    try:
        return await youcam_client.poll_task_status(task_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/tryon/chain", response_model=TryOnStartResponse)
async def chain_tryon_look(req: ChainTryOnRequest):
    existing_chain = [req.pinned_product]
    if req.previous_task_id and req.previous_task_id in youcam_client.tasks:
        prev_items = youcam_client.tasks[req.previous_task_id].get("chained_items")
        if prev_items:
            existing_chain = list(prev_items)

    combined_items = existing_chain + [req.second_product]

    return await youcam_client.start_tryon_task(
        product=req.second_product,
        persona=req.persona,
        override_youcam_key=req.override_youcam_key,
        override_gemini_key=req.override_gemini_key,
        chained_items=combined_items,
        source_image_override=req.base_result_image_url,
    )


def _find_catalog_item(item_id: str) -> dict:
    return next((it for it in DEMO_CATALOG if it.get("id") == item_id), DEMO_CATALOG[0])


def _match_catalog_or_virtual_product(command_text: str) -> ScrapedProduct:
    """
    Matches a natural-language text command (e.g., 'add leather boots', 'add cashmere scarf',
    'add quilted bag', 'add beret hat', 'add blazer') to a rich product specification.
    """
    cmd = command_text.lower()
    if any(k in cmd for k in ["boot", "shoe", "sneaker", "heel", "loafer", "footwear"]):
        ref = _find_catalog_item("milan-chelsea-boots")
    elif any(k in cmd for k in ["bag", "purse", "tote", "crossbody", "handbag", "clutch"]):
        ref = _find_catalog_item("quilted-crossbody-bag")
    elif any(k in cmd for k in ["scarf", "shawl", "wrap", "dupatta", "stole"]):
        ref = _find_catalog_item("cashmere-drape-scarf")
    elif any(k in cmd for k in ["hat", "beret", "cap", "beanie"]):
        ref = _find_catalog_item("parisian-wool-beret")
    elif any(k in cmd for k in ["lip", "blush", "tint", "makeup", "shade"]):
        ref = _find_catalog_item("velvet-matte-lipstick-crimson")
    elif any(k in cmd for k in ["serum", "cream", "moisturizer", "cica", "ceramide"]):
        ref = _find_catalog_item("cica-ceramide-barrier-cream")
    elif any(k in cmd for k in ["dress", "gown", "slip", "kurti", "eastern"]):
        return ScrapedProduct(
            title="Silk Midi Slip Dress",
            brand="ZARR LUXE",
            category_hint="Apparel > Dresses",
            price="$165.00",
            image_url="/static/assets/prod_dress.png",
            ingredients="100% Mulberry Silk",
        )
    else:
        ref = _find_catalog_item("zara-emerald-blazer")

    return ScrapedProduct(
        title=ref["title"],
        brand=ref["brand"],
        category_hint=ref["category_hint"],
        price=ref["price"],
        image_url=ref["image_url"],
        ingredients=ref["ingredients"],
        selected_shade_hex=ref.get("selected_shade_hex", "#D94E64"),
    )


@app.post("/api/tryon/edit-command", response_model=TryOnStartResponse)
async def edit_tryon_by_command(req: EditTryOnCommandRequest):
    """
    Executes natural-language text edits on the current virtual try-on look:
      - "remove [item]" / "undo" / "take off ..." -> Removes the matching item (or last item) and re-renders.
      - "add [item]" / "pair with ..." / "wear ..." -> Layers the requested item onto the current look.
    """
    cmd = req.command_text.strip().lower()
    items = list(req.current_items or [])
    if not items and req.previous_task_id and req.previous_task_id in youcam_client.tasks:
        items = list(youcam_client.tasks[req.previous_task_id].get("chained_items") or [])

    is_remove = any(w in cmd for w in ["remove", "delete", "take off", "without", "undo", "clear", "drop"])

    if is_remove:
        if len(items) > 1:
            # Try to remove the specific item mentioned in the text command
            remaining = [
                it for it in items
                if not any(
                    word in f"{it.title} {it.category_hint or ''} {it.brand or ''}".lower()
                    for word in cmd.split()
                    if len(word) >= 3 and word not in ("remove", "the", "from", "look", "item", "last", "take", "off", "without")
                )
            ]
            if len(remaining) == len(items) or not remaining:
                # Default to removing the most recently added item
                remaining = items[:-1]
            target_product = remaining[-1]
            return await youcam_client.start_tryon_task(
                product=target_product,
                persona=req.persona,
                override_youcam_key=req.override_youcam_key,
                override_gemini_key=req.override_gemini_key,
                chained_items=remaining,
                source_image_override=req.original_person_image_url,
            )
        else:
            # Removing the only item: re-run on the base persona photo cleanly or with a neutral studio check
            fallback_prod = items[0] if items else _match_catalog_or_virtual_product("blazer")
            return await youcam_client.start_tryon_task(
                product=fallback_prod,
                persona=req.persona,
                override_youcam_key=req.override_youcam_key,
                override_gemini_key=req.override_gemini_key,
                chained_items=[fallback_prod],
                source_image_override=req.original_person_image_url,
            )

    # Otherwise: "add" / "swap" / "style with" command
    new_product = _match_catalog_or_virtual_product(cmd)
    updated_items = items + [new_product]
    base_img = req.current_result_image_url or req.original_person_image_url

    return await youcam_client.start_tryon_task(
        product=new_product,
        persona=req.persona,
        override_youcam_key=req.override_youcam_key,
        override_gemini_key=req.override_gemini_key,
        chained_items=updated_items,
        source_image_override=base_img,
    )


@app.get("/api/proxy-image")
async def proxy_image(url: str = Query(..., description="Image URL or local static path to proxy with CORS headers")):
    if "/static/" in url:
        rel_path = url.split("/static/", 1)[1].split("?", 1)[0]
        local_file = os.path.join(STATIC_DIR, rel_path)
        if os.path.isfile(local_file):
            return FileResponse(
                local_file,
                media_type="image/png",
                headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600"},
            )

    if url.startswith("http://") or url.startswith("https://"):
        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                resp = await client.get(url, headers={"User-Agent": "TryItAI-Proxy/2.0"})
                resp.raise_for_status()
                content_type = resp.headers.get("content-type", "image/png")
                return Response(
                    content=resp.content,
                    media_type=content_type,
                    headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600"},
                )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Upstream image proxy failed: {exc}") from exc

    raise HTTPException(status_code=400, detail="Unsupported image URL format")


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
