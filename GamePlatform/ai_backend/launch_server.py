import io
import os
import base64
import torch
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
from diffusers import AutoPipelineForImage2Image, EulerAncestralDiscreteScheduler

app = FastAPI(title="ChefRPG Style Imagination Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HISTORY_LOG_DIR = "./app_history_logs"
os.makedirs(HISTORY_LOG_DIR, exist_ok=True)

# ─── HARDWARE AUTO-DETECTION SYSTEM ──────────────────────────────────────────
if torch.cuda.is_available():
    device = "cuda"
    torch_dtype = torch.float16
    print("🚀 NVIDIA Graphics Card Detected! Mapping AI generation routines to CUDA layers.")
else:
    device = "cpu"
    torch_dtype = torch.float32
    torch.set_num_threads(os.cpu_count())
    print("⚠️ No NVIDIA GPU found. Activating multi-threaded CPU generation mode.")

print("📦 Loading local SDXL-Turbo generative checkpoint pipelines into memory...")
MODEL_ID = "stabilityai/sdxl-turbo"

try:
    pipeline = AutoPipelineForImage2Image.from_pretrained(
        MODEL_ID, torch_dtype=torch_dtype, variant="fp16" if device == "cuda" else None
    )
    pipeline.to(device)
    pipeline.scheduler = EulerAncestralDiscreteScheduler.from_config(pipeline.scheduler.config)
    print("✅ Local AI pipeline successfully compiled and running.")
except Exception as init_error:
    print(f"❌ Critical error loading model files into system memory: {init_error}")
    pipeline = None

THEME_DICTIONARY = {
    "cozy_tavern": "masterpiece, ultra-detailed professional 2D pixel art, warm medieval wooden tavern interior, stone hearth fireplace, cozy lighting fields, chef rpg style",
    "cyberpunk_cafe": "masterpiece, ultra-detailed professional 2D pixel art, neon cyberpunk sushi restaurant counters, wire clusters, glowing ambient highlights, chef rpg style",
    "forest_market": "masterpiece, ultra-detailed professional 2D pixel art, village merchant stalls, packed-dirt paths, tree canopy dappled lighting shadows, chef rpg style",
    "steampunk_greenhouse": "masterpiece, ultra-detailed professional 2D pixel art, industrial glass greenhouse, copper pipe boiler loops, vibrant potted foliage sheets, chef rpg style",
    "haunted_manor": "masterpiece, ultra-detailed professional 2D pixel art, decayed Victorian manor parlor, velvet chairs, cracked tiles, streaming pale moonlight, chef rpg style",
    "coastal_beach_grill": "masterpiece, ultra-detailed professional 2D pixel art, tropical bamboo beach bar counters, white sand tiles, warm sunny morning lighting, chef rpg style",
    "ancient_temple": "masterpiece, ultra-detailed professional 2D pixel art, overgrown mossy stone brick temple ruins, runic carvings, glowing blue magic crystals, chef rpg style",
    "alpine_snowy_lodge": "masterpiece, ultra-detailed professional 2D pixel art, mountain timber ski cabin lodge, thick rugs over floorboards, warm fire glow illumination, chef rpg style",
    "retro_arcade": "masterpiece, ultra-detailed professional 2D pixel art, 1980s retro arcade room space, checkered neon carpets, glowing game cabinets, synthwave style, chef rpg style",
    "dwarven_brewery": "masterpiece, ultra-detailed professional 2D pixel art, cave brewery carved in bedrock stone, copper fermentation vats, boiling magma fluid illumination channels, chef rpg style",
    "japanese_village": "masterpiece, ultra-detailed professional 2D pixel art, traditional Japanese mountain village, elegant dark Kawara clay roof tiles, weathered timber storefronts, glowing red paper chōchin lanterns, stone paths, blooming pink cherry blossom petals casting shadows, chef rpg style",
    "scandinavian_town": "masterpiece, ultra-detailed professional 2D pixel art, Nordic coastal country town, dark wooden stave architecture, deep crimson-painted buildings, stone piers overlooking cold water channels, warm interior lighting through frosted windows, chef rpg style",
    "moroccan_bazaar": "masterpiece, ultra-detailed professional 2D pixel art, bustling desert country marketplace, intricate geometric tile patterns, plaster archways, vibrant hanging woven textiles, open-air spice stalls with colorful conical mounds, glowing brass lamps, warm sun shafts, chef rpg style",
    "cyberpunk_market": "masterpiece, ultra-detailed professional 2D pixel art, rainy futuristic neon street market, crowded alleys, glowing neon signs in kanji, high-tech ramen stalls, cybernetic vending machines, reflective dark wet asphalt, puddle reflections, chef rpg style",
    "rainy_neon_alley": "masterpiece, ultra-detailed professional 2D pixel art, cinematic dark cyberpunk city back-alley, downpour rainfall conditions, dramatic steaming pipe vents, glowing blue and pink neon strip lights, trash containers, gritty futuristic atmosphere, chef rpg style",
    "volcanic_wasteland": "masterpiece, ultra-detailed professional 2D pixel art, hostile scorched volcanic wasteland, cracked black obsidian earth tiles, rivers of glowing molten orange lava channels providing intense ambient under-lighting, smoke vents, dark jagged basalt rock structures, chef rpg style"
}

class IngestionPayload(BaseModel):
    image: str
    theme: str
    custom_prompt_extension: str = ""

def decode_base64_to_img(b64_str: str) -> Image.Image:
    if "data:image" in b64_str:
        b64_str = b64_str.split(",")[-1]
    return Image.open(io.BytesIO(base64.b64decode(b64_str))).convert("RGB")

def encode_img_to_base64(img: Image.Image) -> str:
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode('utf-8')}"

@app.post("/api/enhance")
async def enhance_user_drawing(payload: IngestionPayload):
    if pipeline is None:
        raise HTTPException(status_code=500, detail="Local AI generation core is currently offline.")
    try:
        input_canvas_sketch = decode_base64_to_img(payload.image)
        if payload.theme == "custom_override_flag":
            positive_prompt = f"{payload.custom_prompt_extension}, masterpiece, ultra-detailed 2D pixel art, clean borders, highly stylized textures, chef rpg aesthetic"
        else:
            positive_prompt = THEME_DICTIONARY.get(payload.theme, THEME_DICTIONARY["cozy_tavern"])

        negative_prompt = "blurry, smooth, photorealistic, 3D render, anti-aliasing artifacts, texts, color gradients"
        inference_steps = 3 if device == "cuda" else 1
        denoising_strength = 0.50 if device == "cuda" else 0.35

        torch_generator = torch.Generator(device=device).manual_seed(101)
        ai_output = pipeline(
            prompt=positive_prompt, negative_prompt=negative_prompt, image=input_canvas_sketch,
            num_inference_steps=inference_steps, strength=denoising_strength, guidance_scale=0.0, generator=torch_generator
        ).images[0]

        ai_output = ai_output.resize(input_canvas_sketch.size, Image.Resampling.NEAREST)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_path_name = os.path.join(HISTORY_LOG_DIR, f"RenderArchive_{payload.theme}_{timestamp}.png")
        ai_output.save(file_path_name, "PNG")

        return {"enhancedImage": encode_img_to_base64(ai_output)}
    except Exception as api_exec_error:
        raise HTTPException(status_code=500, detail=f"Generation pipeline failure: {str(api_exec_error)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
