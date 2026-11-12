"""Sawtak Lipsync Space — Wav2Lip behind a Gradio API.
First start clones the Wav2Lip repo and downloads the GAN checkpoint + face detector (~500 MB)."""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import gradio as gr
from huggingface_hub import hf_hub_download

try:
    import spaces
    gpu = spaces.GPU
except Exception:  # noqa: BLE001
    def gpu(fn=None, **_):
        return fn if fn else (lambda f: f)

ROOT = Path(__file__).parent / "Wav2Lip"
# Mirror of the original checkpoints; override with env vars if you host your own copies.
CKPT_REPO = os.getenv("WAV2LIP_HF_REPO", "camenduru/Wav2Lip")
CKPT_FILE = os.getenv("WAV2LIP_HF_FILE", "checkpoints/wav2lip_gan.pth")
S3FD_FILE = os.getenv("WAV2LIP_S3FD_FILE", "checkpoints/s3fd.pth")
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def setup() -> None:
    if not ROOT.exists():
        subprocess.run(["git", "clone", "--depth", "1", "https://github.com/Rudrabha/Wav2Lip.git", str(ROOT)], check=True)
    ckpt = ROOT / "checkpoints" / "wav2lip_gan.pth"
    if not ckpt.exists():
        ckpt.parent.mkdir(exist_ok=True)
        shutil.copy(hf_hub_download(CKPT_REPO, CKPT_FILE), ckpt)
    s3fd = ROOT / "face_detection" / "detection" / "sfd" / "s3fd.pth"
    if not s3fd.exists():
        shutil.copy(hf_hub_download(CKPT_REPO, S3FD_FILE), s3fd)


setup()


@gpu(duration=180)
def lipsync(face: str, audio: str):
    if not face or not audio:
        raise gr.Error("ارفع صورة/فيديو للوش وملف الصوت")
    out = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False).name
    is_image = Path(face).suffix.lower() in IMAGE_EXT
    cmd = [sys.executable, "inference.py", "--checkpoint_path", "checkpoints/wav2lip_gan.pth",
           "--face", face, "--audio", audio, "--outfile", out, "--pads", "0", "15", "0", "0",
           "--resize_factor", "1" if is_image else "2", "--nosmooth"]
    if is_image:
        cmd.append("--static")
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if p.returncode != 0:
        raise gr.Error("Wav2Lip failed: " + p.stderr[-600:])
    return out


demo = gr.Interface(
    fn=lipsync,
    inputs=[gr.File(label="صورة أو فيديو لوشك", type="filepath"), gr.Audio(label="الصوت", type="filepath")],
    outputs=gr.Video(label="الفيديو"),
    title="Sawtak Lipsync — مزامنة شفاه مجانية",
    description="Wav2Lip مفتوح المصدر. الـ API مفتوح للموقع الستاتيك.",
    api_name="predict",
    flagging_mode="never",
)

if __name__ == "__main__":
    demo.queue(max_size=10).launch()
