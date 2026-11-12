# Hugging Face Spaces (free engines for the static app in `/voice/`)

| Folder | Space | Hardware | Endpoints |
|---|---|---|---|
| `tts/` | Sawtak TTS: Cairo-TTS (ar-EG, en) + Chatterbox Multilingual (22 langs) + NLLB translation | CPU basic (free) or ZeroGPU | `predict(text, sample, lang)`, `translate(text, src, tgt)` |
| `lipsync/` | Sawtak Lipsync: Wav2Lip | CPU basic (slow) or ZeroGPU | `predict(face, audio)` |

## Create each Space (2 minutes)
1. huggingface.co → New → Space → name it (e.g. `sawtak-tts`), SDK **Gradio**, hardware **CPU basic** (or **ZeroGPU** if offered), visibility public.
2. Upload the three files of the folder (`README.md`, `requirements.txt`, `app.py`) with "Add file → Upload files".
3. Wait for the build (first build ~10 min), then copy the Space URL `https://<user>-<name>.hf.space` into the app's settings.

Tip: keep the Spaces public so the static site can call them; the models only ever receive the text and sample you send.
