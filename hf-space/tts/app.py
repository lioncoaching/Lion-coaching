"""Sawtak TTS Space — Cairo-TTS (Egyptian Arabic + English), Chatterbox Multilingual (22 more
languages) and NLLB translation, behind a small Gradio API that the static site calls.

Models load lazily on first use so the Space boots fast on the free CPU tier. If the Space runs
on ZeroGPU, the `spaces` decorator moves generation to a GPU slice automatically."""
from __future__ import annotations

import os
import tempfile
import threading

import gradio as gr

try:  # ZeroGPU hardware exposes this module; on CPU the decorator is a no-op
    import spaces
    gpu = spaces.GPU
except Exception:  # noqa: BLE001
    def gpu(fn=None, **_):
        return fn if fn else (lambda f: f)

MAX_CHARS = int(os.getenv("MAX_CHARS", "1500"))
CAIRO_LANGS = {"ar-EG", "en"}
CHATTERBOX_LANGS = {"ar", "da", "de", "el", "en", "es", "fi", "fr", "he", "hi", "it", "ja", "ko", "ms",
                    "nl", "no", "pl", "pt", "ru", "sv", "sw", "tr", "zh"}
NLLB_CODES = {"ar-EG": "arz_Arab", "ar": "arb_Arab", "en": "eng_Latn", "fr": "fra_Latn", "de": "deu_Latn",
              "es": "spa_Latn", "it": "ita_Latn", "pt": "por_Latn", "tr": "tur_Latn", "ru": "rus_Cyrl",
              "hi": "hin_Deva", "zh": "zho_Hans", "ja": "jpn_Jpan", "ko": "kor_Hang", "nl": "nld_Latn",
              "pl": "pol_Latn", "sv": "swe_Latn", "el": "ell_Grek", "he": "heb_Hebr", "ms": "zsm_Latn",
              "sw": "swh_Latn", "da": "dan_Latn", "fi": "fin_Latn", "no": "nob_Latn"}

_lock = threading.Lock()
_models: dict[str, object] = {}


def _cairo():
    with _lock:
        if "cairo" not in _models:
            from cairo_tts import CairoTTS
            _models["cairo"] = CairoTTS.from_pretrained()
        return _models["cairo"]


def _chatterbox():
    with _lock:
        if "cb" not in _models:
            import torch
            from chatterbox.mtl_tts import ChatterboxMultilingualTTS
            device = "cuda" if torch.cuda.is_available() else "cpu"
            _models["cb"] = ChatterboxMultilingualTTS.from_pretrained(device=device)
        return _models["cb"]


def _nllb():
    with _lock:
        if "nllb" not in _models:
            from transformers import pipeline
            _models["nllb"] = pipeline("translation", model="facebook/nllb-200-distilled-600M")
        return _models["nllb"]


def _check(text: str) -> str:
    text = (text or "").strip()
    if not text:
        raise gr.Error("اكتب النص الأول")
    if len(text) > MAX_CHARS:
        raise gr.Error(f"النص أطول من {MAX_CHARS} حرف، قسّمه على جزئين")
    return text


@gpu(duration=120)
def speak(text: str, reference_audio: str | None, lang: str = "ar-EG"):
    """text + 10–60 s voice sample -> wav in that voice. Cairo for ar-EG/en, Chatterbox otherwise."""
    text = _check(text)
    out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    if lang in CAIRO_LANGS:
        _cairo().save(text, out, voice=reference_audio or None)
        return out
    if lang not in CHATTERBOX_LANGS:
        raise gr.Error(f"اللغة {lang} غير مدعومة")
    import torchaudio
    model = _chatterbox()
    wav = model.generate(text, language_id=lang, audio_prompt_path=reference_audio or None,
                         exaggeration=0.5, cfg_weight=0.5)
    torchaudio.save(out, wav, model.sr)
    return out


def translate(text: str, src: str = "ar-EG", tgt: str = "en") -> str:
    """Free translation (NLLB-200). Egyptian Arabic is a real target/source (arz)."""
    text = _check(text)
    if src == tgt:
        return text
    res = _nllb()(text, src_lang=NLLB_CODES.get(src, "arz_Arab"), tgt_lang=NLLB_CODES.get(tgt, "eng_Latn"),
                  max_length=1024)
    return res[0]["translation_text"]


langs = sorted(CAIRO_LANGS | CHATTERBOX_LANGS)
with gr.Blocks(title="Sawtak TTS — صوتك مجاناً") as demo:
    gr.Markdown("# 🎙️ Sawtak TTS\nاستنساخ صوت مجاني: Cairo-TTS للعامية والإنجليزي، Chatterbox لباقي اللغات، NLLB للترجمة.")
    with gr.Tab("Speak"):
        t = gr.Textbox(label="النص", lines=5)
        a = gr.Audio(label="عينة صوتك (10–60 ثانية)", type="filepath")
        lg = gr.Dropdown(langs, value="ar-EG", label="اللغة")
        o = gr.Audio(label="الناتج", type="filepath")
        gr.Button("ولّد", variant="primary").click(speak, [t, a, lg], o, api_name="predict")
    with gr.Tab("Translate"):
        t2 = gr.Textbox(label="النص", lines=5)
        s2 = gr.Dropdown(list(NLLB_CODES), value="ar-EG", label="من")
        d2 = gr.Dropdown(list(NLLB_CODES), value="en", label="إلى")
        o2 = gr.Textbox(label="الترجمة", lines=5)
        gr.Button("ترجم", variant="primary").click(translate, [t2, s2, d2], o2, api_name="translate")

if __name__ == "__main__":
    demo.queue(max_size=30).launch()
