from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..auth import current_user
from ..config import settings
from ..db import get_db
from ..engines import LANGUAGES, get_tts
from ..models import User, Voice
from ..schemas import VoiceOut
from ..services import credits
from ..services.storage import AUDIO_EXT, VIDEO_EXT, save_upload, user_dir

router = APIRouter(prefix="/api/voices", tags=["voices"])


def voice_out(v: Voice) -> VoiceOut:
    return VoiceOut(id=v.id, name=v.name, language=v.language, engine=v.engine,
                    description=v.description, created_at=v.created_at.isoformat())


@router.get("", response_model=list[VoiceOut])
def list_voices(user: User = Depends(current_user)):
    return [voice_out(v) for v in user.voices]


@router.get("/languages")
def languages():
    return LANGUAGES


@router.post("", response_model=VoiceOut)
async def clone_voice(
    name: str = Form(...),
    language: str = Form("ar"),
    description: str = Form(""),
    engine: str = Form(""),
    sample: UploadFile = File(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    plan = credits.plan_of(user)
    if len(user.voices) >= plan["max_voices"]:
        raise HTTPException(402, f"باقتك تسمح بـ {plan['max_voices']} صوت. رقّي الباقة لإضافة المزيد.")
    cost = settings.CREDITS_PER_VOICE_CLONE
    credits.require(db, user, cost)
    path = await save_upload(sample, user_dir(user.id, "samples"), AUDIO_EXT | VIDEO_EXT)
    engine_name = engine or settings.TTS_ENGINE
    try:
        ref = get_tts(engine_name).clone(path, name, description)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"فشل استنساخ الصوت: {e}")
    v = Voice(user_id=user.id, name=name, language=language, engine=engine_name, engine_ref=ref,
              sample_path=str(path), description=description)
    db.add(v)
    db.commit()
    credits.charge(db, user, cost, "voice_clone")
    return voice_out(v)


@router.get("/remote")
def remote_voices(user: User = Depends(current_user)):
    """Voices that already exist on the connected ElevenLabs account (cloned/generated)."""
    import httpx
    from ..engines.tts.elevenlabs import API
    hdr = {"xi-api-key": settings.ELEVENLABS_API_KEY or "proxy-injected"}
    r = httpx.get(f"{API}/voices", headers=hdr, timeout=30)
    if r.status_code >= 400:
        raise HTTPException(502, "تعذر الاتصال بـ ElevenLabs")
    return [{"voice_id": v["voice_id"], "name": v["name"], "category": v.get("category")}
            for v in r.json().get("voices", []) if v.get("category") in {"cloned", "generated", "professional"}]


@router.post("/import", response_model=VoiceOut)
def import_voice(voice_id: str = Form(...), name: str = Form(...), language: str = Form("ar"),
                 user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Link an existing ElevenLabs voice to this account (no cloning cost)."""
    plan = credits.plan_of(user)
    if len(user.voices) >= plan["max_voices"]:
        raise HTTPException(402, f"باقتك تسمح بـ {plan['max_voices']} صوت.")
    v = Voice(user_id=user.id, name=name, language=language, engine="elevenlabs", engine_ref=voice_id,
              description="imported")
    db.add(v)
    db.commit()
    return voice_out(v)


@router.delete("/{voice_id}")
def delete_voice(voice_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    v = db.get(Voice, voice_id)
    if not v or v.user_id != user.id:
        raise HTTPException(404, "الصوت غير موجود")
    try:
        get_tts(v.engine).delete_voice(v.engine_ref)
    except Exception:  # noqa: BLE001
        pass
    db.delete(v)
    db.commit()
    return {"ok": True}
