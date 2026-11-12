---
title: Sawtak Lipsync
emoji: 🎬
colorFrom: blue
colorTo: purple
sdk: gradio
sdk_version: 5.49.1
app_file: app.py
pinned: false
license: mit
---

# Sawtak Lipsync — free Wav2Lip

Photo or video of a face + audio → lip-synced MP4. Open-source Wav2Lip (GAN checkpoint).
CPU tier works for short clips (a 20 s reel from a photo takes a few minutes); ZeroGPU makes it ~30 s.
API endpoint: `predict(face_file, audio_file)`.
