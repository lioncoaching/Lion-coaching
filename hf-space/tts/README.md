---
title: Sawtak TTS
emoji: 🎙️
colorFrom: purple
colorTo: blue
sdk: gradio
sdk_version: 5.49.1
app_file: app.py
pinned: false
license: mit
---

# Sawtak TTS — free voice cloning + translation

- **Cairo-TTS** for Egyptian Arabic (`ar-EG`) and English (`en`): natural عامية, zero-shot cloning, CPU-friendly.
- **Chatterbox Multilingual** (MIT) for 22 more languages — same cloned voice speaking French, Turkish, Hindi…
- **NLLB-200** translation with Egyptian Arabic (`arz`) as a first-class language.

Hardware: works on the free CPU tier (slow for Chatterbox); pick **ZeroGPU** if your account allows it (free accounts
30+ days old get 2 ZeroGPU Spaces). API endpoints: `predict(text, reference_audio, lang)`, `translate(text, src, tgt)`.
