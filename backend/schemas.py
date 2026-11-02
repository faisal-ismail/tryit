"""
Pydantic v2 Schemas for TryIt AI.
Defines structured data contracts for DOM product scraping, Gemini 2.5 Flash routing,
YouCam S2S v2.0 API tasks, Cross-Store Look Chaining, Text-Command Edits, and Verdicts.
"""
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


YouCamEndpointType = Literal[
    "cloth-v4",
    "shoes-transfer",
    "bag",
    "scarf",
    "hat",
    "makeup-vto",
    "skin-analysis",
]


class ScrapedProduct(BaseModel):
    title: str = Field(..., description="Scraped product title from JSON-LD, OpenGraph, or DOM")
    category_hint: Optional[str] = Field(default="", description="Breadcrumb or category meta tag")
    price: Optional[str] = Field(default="", description="Formatted product price string")
    image_url: str = Field(..., description="High-resolution product image URL")
    ingredients: Optional[str] = Field(
        default="",
        description="Scraped active ingredients list for skincare/beauty items or fabric/material notes",
    )
    brand: Optional[str] = Field(default="ZARR", description="Brand or store name")
    page_url: Optional[str] = Field(default="", description="Originating store URL")
    selected_shade_hex: Optional[str] = Field(default="#D96B70", description="Selected makeup shade hex if beauty VTO")


class PersonaPhotoItem(BaseModel):
    photo_id: str
    label: str = "Photo"
    url: str


class UserPersonaInput(BaseModel):
    persona_id: str = Field(default="maya", description="Pre-loaded or custom profile ID")
    person_name: Optional[str] = Field(default="Maya Lin", description="Display name of the shopper profile")
    ethnicity: Optional[str] = Field(default="Asian", description="Demographic / heritage label")
    gender: Literal["female", "male"] = Field(
        default="female",
        description="Strict YouCam cloth-v4 gender mapping ('female' or 'male')",
    )
    full_body_image_url: str = Field(..., description="Selected active photo URL or base64 data URI")
    face_image_url: str = Field(..., description="Close-up facial photo URL or base64 data URI for Skin AI / Makeup")
    photos: Optional[List[PersonaPhotoItem]] = Field(default_factory=list, description="All photos saved under this profile")
    undertone: Optional[str] = Field(default="Warm Olive", description="Baseline skin undertone")
    skin_type: Optional[str] = Field(default="Combination / Sensitive", description="Baseline skin type")
    usual_size: Optional[str] = Field(default="M", description="Shopper's standard apparel size")
    baseline_skin_scores: Optional[Dict[str, int]] = Field(
        default_factory=lambda: {
            "moisture": 68,
            "redness": 41,
            "acne": 78,
            "pores": 72,
            "wrinkles": 88,
            "texture": 75,
        }
    )


class GeminiClassificationResult(BaseModel):
    category: str = Field(..., description="Normalized category, e.g., 'outerwear', 'top', 'dress', 'footwear', 'bag', 'scarf', 'hat', 'skincare', 'makeup'")
    youcam_endpoint: YouCamEndpointType = Field(..., description="Selected YouCam S2S v2.0 endpoint")
    youcam_params: Dict[str, Any] = Field(
        default_factory=dict,
        description="Endpoint-specific YouCam parameters with quirk handling applied",
    )
    reasoning: str = Field(..., description="Brief explanation of why Gemini routed the product to this pipeline")


class AgentTraceStep(BaseModel):
    step: int
    stage: str
    detail: str
    timestamp_ms: int


class SkinScores(BaseModel):
    moisture: int = Field(..., ge=0, le=100, description="Skin hydration level (higher is better)")
    redness: int = Field(..., ge=0, le=100, description="Skin calmness/redness score (lower means more redness sensitivity)")
    acne: int = Field(..., ge=0, le=100, description="Blemish clarity score")
    pores: int = Field(..., ge=0, le=100, description="Pore refinement score")
    wrinkles: int = Field(..., ge=0, le=100, description="Smoothness / fine lines score")
    texture: int = Field(..., ge=0, le=100, description="Overall skin surface texture score")
    overall_score: int = Field(..., ge=0, le=100, description="Composite YouCam Skin AI score")


class AgentVerdict(BaseModel):
    match_score: int = Field(..., ge=0, le=100, description="0-100% compatibility score")
    status_badge: Literal["optimal", "caution", "conflict"] = Field(
        default="optimal",
        description="Visual badge state for the UI card",
    )
    verdict_headline: str = Field(..., description="Headline summarizing fit, undertone, or skin barrier compatibility")
    actionable_advice: str = Field(..., description="Specific sizing recommendation or skincare ingredient conflict advice")
    key_factors: List[str] = Field(default_factory=list, description="Bullet points backing the verdict")
    agent_trace: List[AgentTraceStep] = Field(default_factory=list, description="Full transparent agent trace")


class TryOnStartRequest(BaseModel):
    product: ScrapedProduct
    persona: UserPersonaInput
    override_youcam_key: Optional[str] = None
    override_gemini_key: Optional[str] = None


class TryOnStartResponse(BaseModel):
    task_id: str
    status: Literal["processing", "completed", "failed"]
    category: str
    youcam_endpoint: YouCamEndpointType
    youcam_params: Dict[str, Any]
    initial_agent_trace: List[AgentTraceStep]
    mode: Literal["live_youcam", "resilient_simulation"]


class TryOnStatusResponse(BaseModel):
    task_id: str
    status: Literal["processing", "completed", "failed"]
    progress: int = Field(default=100, ge=0, le=100)
    category: str
    youcam_endpoint: YouCamEndpointType
    source_image_url: str
    product_image_url: str
    result_image_url: Optional[str] = None
    skin_scores: Optional[SkinScores] = None
    agent_verdict: Optional[AgentVerdict] = None
    chained_items: List[ScrapedProduct] = Field(default_factory=list)
    mode: Literal["live_youcam", "resilient_simulation"] = "resilient_simulation"
    error_message: Optional[str] = None


class ChainTryOnRequest(BaseModel):
    previous_task_id: Optional[str] = Field(default=None, description="Previous VTO task ID whose output image will be chained")
    base_result_image_url: str = Field(..., description="Rendered output URL from Task #1 to use as source person image for Task #2")
    pinned_product: ScrapedProduct = Field(..., description="First product already worn in the base image")
    second_product: ScrapedProduct = Field(..., description="New product from Store B to layer onto the look")
    persona: UserPersonaInput
    override_youcam_key: Optional[str] = None
    override_gemini_key: Optional[str] = None


class EditTryOnCommandRequest(BaseModel):
    command_text: str = Field(..., description="Natural language edit instruction, e.g., 'remove the boots' or 'add a cashmere scarf'")
    previous_task_id: Optional[str] = Field(default=None, description="Current task ID being edited")
    current_result_image_url: Optional[str] = Field(default=None, description="Current rendered image URL")
    original_person_image_url: str = Field(..., description="Original base photo of the selected person")
    current_items: List[ScrapedProduct] = Field(default_factory=list, description="Products currently applied in the look")
    persona: UserPersonaInput
    override_youcam_key: Optional[str] = None
    override_gemini_key: Optional[str] = None
