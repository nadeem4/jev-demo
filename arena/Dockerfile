# Arena API: runs Jev (over HTTP) and Laya (locally, on CPU) and streams episodes to the UI.
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /usr/local/bin/uv
ENV UV_LINK_MODE=copy UV_COMPILE_BYTECODE=1 UV_NO_CACHE=1 PYTHONUNBUFFERED=1 VIRTUAL_ENV=/app/.venv PATH=/app/.venv/bin:$PATH
WORKDIR /app

# PyTorch comes from the CPU index: GPU containers need a newer NVIDIA driver, and
# the lockfile's CUDA build would pull ~2.5 GB of NVIDIA libraries. Everything else
# is installed at the exact versions in uv.lock, minus those CUDA-only packages.
COPY pyproject.toml uv.lock ./
RUN uv venv && \
    uv pip install --index-url https://download.pytorch.org/whl/cpu "torch==2.14.0" && \
    uv export --frozen --no-dev --no-hashes --no-emit-project --no-emit-package torch \
      | grep -v -i -E "^(nvidia|triton|cuda)" > /tmp/requirements.txt && \
    uv pip install -r /tmp/requirements.txt

COPY arena ./arena

# Laya's weights download here on first start (a named volume keeps them).
ENV LAYA_PATH=/models/laya
EXPOSE 8000
CMD ["python", "-m", "arena.server", "--host", "0.0.0.0"]
