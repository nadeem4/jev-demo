"""Laya, Convai's open-source decision model, run locally.

`pip install laya` ships only the code. The 2.3 GB weights come from Hugging Face
and are downloaded once into a plain folder (LAYA_PATH, default models/laya).
Hugging Face's own cache uses symlinks, which fail on Windows without Developer Mode.
"""
from pathlib import Path

REPO = "convaiinnovations/laya"


def _hf_download(**kwargs):
    from huggingface_hub import snapshot_download
    return snapshot_download(**kwargs)


def ensure_weights(path, download=_hf_download):
    path = Path(path)
    if not (path / "model.safetensors").exists():
        download(repo_id=REPO, local_dir=str(path))


class LayaAgent:
    """`model` is a loaded laya.Agent."""
    name = "laya"

    def __init__(self, model):
        self.model = model

    def decide(self, state, questions):
        return self.model.predict(state, questions)["answers"]


def load(path, checkpoint=None):
    """Checkpoints: None (English), "multilingual", "typed-decisions"."""
    ensure_weights(path)
    import laya  # heavy import (torch); only needed when Laya actually runs
    return LayaAgent(laya.load(path, subfolder=checkpoint) if checkpoint else laya.load(path))
