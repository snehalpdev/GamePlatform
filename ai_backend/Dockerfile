# 1. Use the official PyTorch CUDA runtime as the universal hardware-agnostic foundation layer
FROM pytorch/pytorch:2.2.1-cuda12.1-cudnn8-runtime

WORKDIR /app

# 2. Configure system environmental parameters
# PYTHONUNBUFFERED=1 forces Python to output logs instantly without buffering (crucial for container debug checks)
# PIP_DEFAULT_TIMEOUT prevents pip from timing out on slower network connections during package extraction passes
ENV PYTHONUNBUFFERED=1 \
    PIP_DEFAULT_TIMEOUT=100 \
    HF_HOME=/app/cache

# 3. Install core Linux dependencies required for graphic processing and pixel translation matrix tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 4. Ingest and build Python library requirements modules
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. UNIVERSAL MODEL PRE-CACHING ROUTINE
# We drop the variant="fp16" parameter from the fetch routine here.
# This downloads the full-precision model architecture weights.
# - If an NVIDIA GPU is found: launch_server.py safely converts them to FP16 to minimize VRAM footprints.
# - If fallback to CPU occurs: The script processes standard FP32 arrays without causing compatibility crashes.
RUN python3 -c "from diffusers import AutoPipelineForImage2Image; AutoPipelineForImage2Image.from_pretrained('stabilityai/sdxl-turbo')"

# 6. Finalize app directory data arrays
COPY launch_server.py .

EXPOSE 7860

CMD ["python3", "launch_server.py"]
