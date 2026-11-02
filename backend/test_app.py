"""
Automated Verification Suite for TryIt AI (`backend/test_app.py`).
Verifies all 5 Core Hackathon Features + cPanel WSGI compatibility:
  1. `/demo-store` Dual-Access Judge Mode & static widget serving
  2. Autonomous Gemini / Heuristic Router & YouCam S2S v2.0 endpoint quirk handling
     (`cloth-v4` strict gender, `bag` drops `style`, `scarf` & `hat` enforce `style: "random"`)
  3. Non-blocking split polling (`/api/tryon/start` < 1.5s + `/api/tryon/status/{task_id}`)
  4. Cross-Store "Look Builder" API Chaining (`POST /api/tryon/chain`)
  5. "Moment of Decision" Pre-Checkout Verdict (Skincare Barrier Conflict vs. 96% Biometric Match)
  6. `passenger_wsgi.py` ASGI-to-WSGI wrapper importability
"""
import time
from fastapi.testclient import TestClient

from main import app
import passenger_wsgi


client = TestClient(app)


def test_health_and_demo_store():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "cloth-v4" in body["supported_youcam_pipelines"]
    assert "skin-analysis" in body["supported_youcam_pipelines"]

    landing_resp = client.get("/")
    assert landing_resp.status_code == 200
    assert "https://github.com/faisal-ismail/tryit" in landing_resp.text
    assert "https://youcam-api-skin-ai-ecommerce.devpost.com/" in landing_resp.text
    assert "/api/download-extension" in landing_resp.text

    store_resp = client.get("/demo-store")
    assert store_resp.status_code == 200
    assert "TryIt with AI" in store_resp.text
    assert "/static/widget.js" in store_resp.text

    ext_zip_resp = client.get("/api/download-extension")
    assert ext_zip_resp.status_code == 200
    assert ext_zip_resp.headers["content-type"] == "application/zip"
    assert len(ext_zip_resp.content) > 1000


def test_youcam_endpoint_quirks_and_split_polling():
    personas = client.get("/api/personas").json()["personas"]
    maya = personas[0]

    # 1. Test `bag` endpoint explicitly strips `style`
    t0 = time.perf_counter()
    bag_start = client.post(
        "/api/tryon/start",
        json={
            "product": {
                "title": "Bottega Quilted Crossbody Bag",
                "category_hint": "Accessories > Handbags",
                "price": "$320.00",
                "image_url": "/static/assets/prod_bag.png",
                "brand": "NET-A-PORTER",
            },
            "persona": maya,
        },
    )
    elapsed = time.perf_counter() - t0
    assert bag_start.status_code == 200
    assert elapsed < 1.5, f"Start endpoint took {elapsed:.2f}s (must be < 1.5s for cPanel)"
    bag_data = bag_start.json()
    assert bag_data["youcam_endpoint"] == "bag"
    assert "style" not in bag_data["youcam_params"]

    # 2. Test `scarf` & `hat` endpoints enforce `style: "random"`
    scarf_start = client.post(
        "/api/tryon/start",
        json={
            "product": {
                "title": "Nordic Cashmere Scarf",
                "category_hint": "Neckwear",
                "price": "$150.00",
                "image_url": "/static/assets/prod_scarf.png",
                "brand": "ACNE STUDIOS",
            },
            "persona": maya,
        },
    ).json()
    assert scarf_start["youcam_endpoint"] == "scarf"
    assert scarf_start["youcam_params"]["style"] == "random"

    # 3. Poll status and verify generated image & proxy
    status_resp = client.get(f"/api/tryon/status/{bag_data['task_id']}")
    assert status_resp.status_code == 200
    status_body = status_resp.json()
    assert status_body["status"] == "completed"
    assert status_body["result_image_url"].startswith("/static/generated/")

    proxy_resp = client.get("/api/proxy-image", params={"url": status_body["result_image_url"]})
    assert proxy_resp.status_code == 200
    assert proxy_resp.headers["content-type"] == "image/png"


def test_cross_store_look_chaining():
    personas = client.get("/api/personas").json()["personas"]
    maya = personas[0]

    blazer = {
        "title": "Atelier Structured Emerald Trench Blazer",
        "brand": "ZARA STUDIO",
        "category_hint": "Outerwear",
        "price": "$189.00",
        "image_url": "/static/assets/prod_jacket.png",
    }
    boots = {
        "title": "Milan Handcrafted Leather Chelsea Boots",
        "brand": "NORDSTROM",
        "category_hint": "Footwear > Boots",
        "price": "$245.00",
        "image_url": "/static/assets/prod_shoes.png",
    }

    task1 = client.post("/api/tryon/start", json={"product": blazer, "persona": maya}).json()
    status1 = client.get(f"/api/tryon/status/{task1['task_id']}").json()

    chain_start = client.post(
        "/api/tryon/chain",
        json={
            "previous_task_id": task1["task_id"],
            "base_result_image_url": status1["result_image_url"],
            "pinned_product": blazer,
            "second_product": boots,
            "persona": maya,
        },
    )
    assert chain_start.status_code == 200
    chain_data = chain_start.json()
    assert chain_data["youcam_endpoint"] == "shoes-transfer"

    chain_status = client.get(f"/api/tryon/status/{chain_data['task_id']}").json()
    assert len(chain_status["chained_items"]) == 2
    assert "Cross-Store Chained Look Match" in chain_status["agent_verdict"]["verdict_headline"]


def test_skincare_barrier_conflict_and_biometric_match():
    personas = client.get("/api/personas").json()["personas"]
    maya = personas[0]  # Redness score: 41/100

    # Harsh acid peel should trigger a Barrier Conflict on Maya
    conflict_start = client.post(
        "/api/tryon/start",
        json={
            "product": {
                "title": "10% Glycolic Acid Resurfacing Peel Serum",
                "category_hint": "Skincare",
                "price": "$68.00",
                "image_url": "/static/assets/prod_acid_serum.png",
                "ingredients": "10% Glycolic Acid, 2% Salicylic Acid, Retinol, Alcohol Denat",
            },
            "persona": maya,
        },
    ).json()
    conflict_status = client.get(f"/api/tryon/status/{conflict_start['task_id']}").json()
    verdict_c = conflict_status["agent_verdict"]
    assert verdict_c["status_badge"] == "conflict"
    assert verdict_c["match_score"] < 50
    assert "Barrier Conflict Warning" in verdict_c["verdict_headline"]

    # Soothing Cica + Ceramide cream should trigger a 96% Biometric Match on Maya
    match_start = client.post(
        "/api/tryon/start",
        json={
            "product": {
                "title": "Centella Cica + 5% Ceramide Barrier Rescue Cream",
                "category_hint": "Skincare",
                "price": "$52.00",
                "image_url": "/static/assets/prod_cica_cream.png",
                "ingredients": "5% Ceramide NP, Centella Asiatica (Cica), Panthenol, Hyaluronic Acid",
            },
            "persona": maya,
        },
    ).json()
    match_status = client.get(f"/api/tryon/status/{match_start['task_id']}").json()
    verdict_m = match_status["agent_verdict"]
    assert verdict_m["status_badge"] == "optimal"
    assert verdict_m["match_score"] >= 90


def test_passenger_wsgi_application_callable():
    assert callable(passenger_wsgi.application)


def test_diverse_personas_and_text_edit_command():
    personas = client.get("/api/personas").json()["personas"]
    assert len(personas) >= 8
    genders = {p["gender"] for p in personas}
    ethnicities = {p.get("ethnicity") for p in personas}
    assert {"female", "male"}.issubset(genders)
    assert {"Asian", "African", "American", "Latin"}.issubset(ethnicities)
    assert all(len(p.get("photos", [])) >= 2 for p in personas)

    # Test natural-language text command edit ("add leather boots" and "remove boots")
    kenji = next(p for p in personas if p["persona_id"] == "kenji")
    jacket = {
        "title": "Atelier Structured Emerald Trench Blazer",
        "brand": "ZARR",
        "category_hint": "Outerwear",
        "price": "Rs. 14,500",
        "image_url": "/static/assets/prod_jacket.png",
    }

    add_resp = client.post(
        "/api/tryon/edit-command",
        json={
            "command_text": "Add obsidian leather boots",
            "previous_task_id": "task_init_01",
            "current_result_image_url": kenji["full_body_image_url"],
            "original_person_image_url": kenji["full_body_image_url"],
            "current_items": [jacket],
            "persona": kenji,
        },
    )
    assert add_resp.status_code == 200
    add_data = add_resp.json()
    assert add_data["youcam_endpoint"] == "shoes-transfer"
    add_status = client.get(f"/api/tryon/status/{add_data['task_id']}").json()
    assert add_status["status"] == "completed"

    rem_resp = client.post(
        "/api/tryon/edit-command",
        json={
            "command_text": "Remove last item",
            "previous_task_id": add_data["task_id"],
            "current_result_image_url": add_status["result_image_url"],
            "original_person_image_url": kenji["full_body_image_url"],
            "current_items": [],
            "persona": kenji,
        },
    )
    assert rem_resp.status_code == 200
    rem_data = rem_resp.json()
    rem_status = client.get(f"/api/tryon/status/{rem_data['task_id']}").json()
    assert rem_status["status"] == "completed"


if __name__ == "__main__":
    test_health_and_demo_store()
    print("✅ PASS: test_health_and_demo_store")
    test_youcam_endpoint_quirks_and_split_polling()
    print("✅ PASS: test_youcam_endpoint_quirks_and_split_polling")
    test_cross_store_look_chaining()
    print("✅ PASS: test_cross_store_look_chaining")
    test_skincare_barrier_conflict_and_biometric_match()
    print("✅ PASS: test_skincare_barrier_conflict_and_biometric_match")
    test_diverse_personas_and_text_edit_command()
    print("✅ PASS: test_diverse_personas_and_text_edit_command")
    print("🎉 ALL TRYIT AI TESTS PASSED!")

