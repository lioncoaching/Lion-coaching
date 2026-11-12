/* صوتك — static voice-cloning app. No backend: talks to a Hugging Face Space (free engine)
   or to ElevenLabs with the user's own key, straight from the browser. */
const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toast = (m, err = false) => { const t = $("#toast"); t.textContent = m; t.className = "toast" + (err ? " err" : ""); t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, 4500); };

// ---------- settings (localStorage) ----------
const DEFAULTS = { hfUrl: "", lipUrl: "", elKey: "", elVoice: "", elModel: "eleven_multilingual_v2", stab: 0.5, sim: 0.85, style: 0.25, engine: "hf" };
const settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem("sawtak_settings") || "{}") };
const saveSettings = () => localStorage.setItem("sawtak_settings", JSON.stringify(settings));

// ---------- tiny IndexedDB wrapper (sample + generated files) ----------
const db = {
  open: () => new Promise((res, rej) => { const r = indexedDB.open("sawtak", 1); r.onupgradeneeded = () => r.result.createObjectStore("files", { keyPath: "id" }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }),
  async put(rec) { const d = await this.open(); return new Promise((res, rej) => { const t = d.transaction("files", "readwrite"); t.objectStore("files").put(rec); t.oncomplete = res; t.onerror = () => rej(t.error); }); },
  async get(id) { const d = await this.open(); return new Promise(res => { const r = d.transaction("files").objectStore("files").get(id); r.onsuccess = () => res(r.result); }); },
  async all() { const d = await this.open(); return new Promise(res => { const r = d.transaction("files").objectStore("files").getAll(); r.onsuccess = () => res(r.result || []); }); },
  async del(id) { const d = await this.open(); return new Promise(res => { const t = d.transaction("files", "readwrite"); t.objectStore("files").delete(id); t.oncomplete = res; }); },
};

// ---------- tabs ----------
$("#tabs").onclick = e => { const b = e.target.closest("button"); if (!b) return; document.querySelectorAll("#tabs button").forEach(x => x.classList.toggle("active", x === b)); document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.id === "tab-" + b.dataset.tab)); if (b.dataset.tab === "library") renderLibrary(); };

// ---------- voice sample ----------
async function setSample(blob, name) {
  await db.put({ id: "sample", kind: "sample", name, blob, at: Date.now() });
  showSample();
  toast("✓ العينة اتحفظت");
}
async function showSample() {
  const s = await db.get("sample");
  $("#samplePreview").hidden = !s;
  if (!s) return;
  $("#sampleAudio").src = URL.createObjectURL(s.blob);
  $("#sampleMeta").textContent = `${s.name} · ${(s.blob.size / 1024).toFixed(0)} KB`;
}
$("#sampleFile").onchange = e => { const f = e.target.files[0]; if (f) setSample(f, f.name); };
$("#clearSample").onclick = async () => { await db.del("sample"); showSample(); };
let rec, chunks = [];
$("#recBtn").onclick = async () => {
  if (rec?.state === "recording") { rec.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    rec = new MediaRecorder(stream); chunks = [];
    rec.ondataavailable = e => chunks.push(e.data);
    rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); setSample(new Blob(chunks, { type: rec.mimeType }), "recording.webm"); $("#recBtn").textContent = "🔴 تسجيل من المايك"; $("#recStatus").textContent = ""; };
    rec.start(); $("#recBtn").textContent = "⏹ إيقاف التسجيل"; $("#recStatus").textContent = "بيسجّل… اتكلمي 30 ثانية بشكل طبيعي";
  } catch { toast("مفيش إذن للمايك (الموقع لازم يكون HTTPS)", true); }
};

// ---------- engine: Hugging Face Space (Gradio REST API, no SDK needed) ----------
const hf = {
  base: () => settings.hfUrl.replace(/\/+$/, ""),
  async upload(blob, name, base = this.base()) {
    const fd = new FormData(); fd.append("files", blob, name);
    const r = await fetch(`${base}/gradio_api/upload`, { method: "POST", body: fd });
    if (!r.ok) throw new Error("فشل رفع العينة للـ Space");
    const [path] = await r.json();
    return { path, orig_name: name, meta: { _type: "gradio.FileData" } };
  },
  async predict(endpoint, data, onStatus, base = this.base()) {
    const r = await fetch(`${base}/gradio_api/call/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
    if (!r.ok) throw new Error(`الـ Space رفض الطلب (${r.status})`);
    const { event_id } = await r.json();
    const s = await fetch(`${base}/gradio_api/call/${endpoint}/${event_id}`);
    const reader = s.body.getReader(); const dec = new TextDecoder(); let buf = "", ev = "";
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i; while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (line.startsWith("event:")) ev = line.slice(6).trim();
        else if (line.startsWith("data:")) {
          const payload = JSON.parse(line.slice(5));
          if (ev === "complete") return payload;
          if (ev === "error") throw new Error(payload?.message || payload || "خطأ في الـ Space");
          if (ev === "heartbeat" || ev === "generating") onStatus?.("جاري التوليد… (المحرك المجاني بطيء شوية)");
        }
      }
    }
    throw new Error("الاتصال اتقطع قبل ما الناتج يوصل");
  },
  fileUrl: (f, base = hf.base()) => f?.url || `${base}/gradio_api/file=${f?.path}`,
  async translate(text, src, tgt) {
    const out = await this.predict("translate", [text, src, tgt]); return out[0];
  },
  async lipsync(faceBlob, faceName, audioBlob, onStatus) {
    const base = settings.lipUrl.replace(/\/+$/, ""); if (!base) throw new Error("حطي رابط Space مزامنة الشفاه في الإعدادات");
    onStatus("بيرفع الصورة والصوت…");
    const face = await this.upload(faceBlob, faceName, base), audio = await this.upload(audioBlob, "audio.wav", base);
    onStatus("بيعمل مزامنة الشفاه… (دقايق على CPU)");
    const out = await this.predict("predict", [face, audio], onStatus, base);
    const v = out[0]?.video || out[0]; const r = await fetch(this.fileUrl(v, base)); return r.blob();
  },
  async tts(text, sampleBlob, lang, onStatus) {
    onStatus("بيرفع العينة…");
    const ref = await this.upload(sampleBlob, "sample.wav");
    onStatus("في الطابور… أول طلب بعد سكون بياخد دقيقة لتحميل الموديل");
    const out = await this.predict("predict", [text, ref, lang], onStatus);
    const r = await fetch(this.fileUrl(out[0])); return r.blob();
  },
  async test() {
    const r = await fetch(`${this.base()}/gradio_api/info`); if (!r.ok) throw new Error(r.status);
    const info = await r.json(); return Object.keys(info.named_endpoints || {}).join(", ");
  },
};

// ---------- engine: ElevenLabs (user's own key, browser-direct) ----------
const el = {
  h: () => ({ "xi-api-key": settings.elKey }),
  async voices() {
    const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: this.h() });
    if (!r.ok) throw new Error("المفتاح غير صحيح");
    return (await r.json()).voices.filter(v => ["cloned", "generated", "professional"].includes(v.category));
  },
  async clone(blob, name) {
    const fd = new FormData(); fd.append("name", name); fd.append("files", blob, "sample.webm");
    const r = await fetch("https://api.elevenlabs.io/v1/voices/add", { method: "POST", headers: this.h(), body: fd });
    if (!r.ok) throw new Error((await r.json()).detail?.message || "الاستنساخ محتاج خطة Starter أو أعلى");
    return (await r.json()).voice_id;
  },
  async tts(text, voiceId) {
    const body = { text, model_id: settings.elModel, voice_settings: { stability: +settings.stab, similarity_boost: +settings.sim, style: +settings.style, use_speaker_boost: !settings.elModel.includes("v3") } };
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, { method: "POST", headers: { ...this.h(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error((await r.json()).detail?.message || `ElevenLabs ${r.status}`);
    return r.blob();
  },
};

// ---------- generate ----------
let lastBlob = null, lastText = "";
const LANGS = { ar: "Arabic", en: "English", fr: "French", de: "German", es: "Spanish", it: "Italian", pt: "Portuguese", tr: "Turkish", ru: "Russian", hi: "Hindi", zh: "Chinese", ja: "Japanese", ko: "Korean", nl: "Dutch", pl: "Polish", sv: "Swedish", el: "Greek", he: "Hebrew", ms: "Malay", sw: "Swahili", da: "Danish", fi: "Finnish", no: "Norwegian" };
function engineHint() {
  $("#engineHint").textContent = $("#engine").value === "hf"
    ? "مجاني بالكامل. استنساخ من عينتك بدون تدريب. اختاري لغة النص." : "بيستخدم رصيد حسابك على ElevenLabs. 29 لغة، بيكتشف اللغة تلقائياً.";
  $("#langRow").hidden = $("#engine").value !== "hf";
}
$("#engine").value = settings.engine; engineHint();
$("#engine").onchange = () => { settings.engine = $("#engine").value; saveSettings(); engineHint(); };
$("#text").oninput = () => { const n = $("#text").value.length; $("#charCount").textContent = n; $("#estTime").textContent = `≈ ${Math.ceil(n / 14)} ثانية كلام`; };
$("#genBtn").onclick = async () => {
  const text = $("#text").value.trim(); if (!text) return toast("اكتبي النص الأول", true);
  const btn = $("#genBtn"); btn.disabled = true; const st = m => $("#genStatus").textContent = m;
  try {
    if ($("#engine").value === "hf") {
      if (!settings.hfUrl) throw new Error("حطي رابط الـ Space في الإعدادات");
      const s = await db.get("sample"); if (!s) throw new Error("سجّلي أو ارفعي عينة صوتك الأول");
      lastBlob = await hf.tts(text, s.blob, $("#lang").value, st);
    } else {
      if (!settings.elKey) throw new Error("حطي مفتاح ElevenLabs في الإعدادات");
      const vid = $("#elVoices").value || settings.elVoice; if (!vid) throw new Error("اختاري صوتك من تبويب صوتي");
      st("بيولّد…"); lastBlob = await el.tts(text, vid);
    }
    lastText = text; $("#result").hidden = false; $("#resultAudio").src = URL.createObjectURL(lastBlob);
    $("#downloadBtn").href = $("#resultAudio").src; $("#downloadBtn").download = `sawtak_${Date.now()}.${lastBlob.type.includes("wav") ? "wav" : "mp3"}`;
    st("✓ جاهز"); $("#resultAudio").play().catch(() => {});
  } catch (e) { st(""); toast(e.message, true); } finally { btn.disabled = false; }
};
$("#saveBtn").onclick = async () => { if (!lastBlob) return; await db.put({ id: "gen_" + Date.now(), kind: "audio", name: lastText.slice(0, 60), blob: lastBlob, at: Date.now() }); toast("اتحفظ في ملفاتي"); };

// ---------- translate ----------
$("#trBtn").onclick = async () => {
  const text = $("#text").value.trim(); if (!text) return toast("اكتبي النص الأول", true);
  if (!settings.hfUrl) return toast("حطي رابط الـ Space في الإعدادات", true);
  $("#trBtn").disabled = true;
  try { $("#text").value = await hf.translate(text, $("#lang").value, $("#trTarget").value); $("#lang").value = $("#trTarget").value; $("#text").dispatchEvent(new Event("input")); toast("✓ اتترجم، راجعي النص وولّدي"); }
  catch (e) { toast(e.message, true); } finally { $("#trBtn").disabled = false; }
};

// ---------- video / lipsync ----------
async function fillVideoAudio() {
  const items = (await db.all()).filter(x => x.kind === "audio").sort((a, b) => b.at - a.at);
  $("#videoAudio").innerHTML = '<option value="last">آخر صوت ولّدته</option>' + items.map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("");
}
$("#videoBtn").onclick = async () => {
  const f = $("#faceFile").files[0]; if (!f) return toast("ارفعي صورتك أو فيديوك", true);
  let audio = lastBlob; const sel = $("#videoAudio").value;
  if (sel !== "last") audio = (await db.get(sel))?.blob;
  if (!audio) return toast("ولّدي صوت الأول من تبويب ولّد", true);
  const btn = $("#videoBtn"); btn.disabled = true; const st = m => $("#videoStatus").textContent = m;
  try {
    const blob = await hf.lipsync(f, f.name, audio, st);
    $("#videoResult").hidden = false; const url = URL.createObjectURL(blob); $("#resultVideo").src = url; $("#videoDownload").href = url; st("✓ جاهز");
    await db.put({ id: "vid_" + Date.now(), kind: "video", name: "ريلز " + new Date().toLocaleString("ar-EG"), blob, at: Date.now() });
  } catch (e) { st(""); toast(e.message, true); } finally { btn.disabled = false; }
};
document.querySelector('#tabs [data-tab="video"]').addEventListener("click", fillVideoAudio);

// ---------- library ----------
async function renderLibrary() {
  const items = (await db.all()).filter(x => x.kind !== "sample").sort((a, b) => b.at - a.at);
  $("#libraryList").innerHTML = items.length ? items.map(x => `<div class="item"><b>${esc(x.name)}</b><div class="meta">${new Date(x.at).toLocaleString("ar-EG")} · ${(x.blob.size / 1024).toFixed(0)} KB</div>
    ${x.kind === "video" ? `<video controls playsinline src="${URL.createObjectURL(x.blob)}"></video>` : `<audio controls src="${URL.createObjectURL(x.blob)}"></audio>`}<div class="row"><a class="btn" download="${esc(x.id)}.${x.kind === "video" ? "mp4" : x.blob.type.includes("wav") ? "wav" : "mp3"}" href="${URL.createObjectURL(x.blob)}">⬇️</a><button class="link" data-del="${esc(x.id)}">حذف</button></div></div>`).join("") : '<p class="hint">مفيش ملفات لسه.</p>';
  $("#libraryList").onclick = async e => { const id = e.target.dataset.del; if (id) { await db.del(id); renderLibrary(); } };
}

// ---------- ElevenLabs voices UI ----------
async function loadElVoices() {
  if (!settings.elKey) return;
  try {
    const vs = await el.voices();
    $("#elVoices").innerHTML = vs.map(v => `<option value="${esc(v.voice_id)}">${esc(v.name)} (${esc(v.category)})</option>`).join("") || "<option value=''>مفيش أصوات مستنسخة في حسابك</option>";
    if (settings.elVoice) $("#elVoices").value = settings.elVoice;
  } catch (e) { toast(e.message, true); }
}
$("#elVoices").onchange = () => { settings.elVoice = $("#elVoices").value; saveSettings(); };
$("#elRefresh").onclick = loadElVoices;
$("#elClone").onclick = async () => {
  const s = await db.get("sample"); if (!s) return toast("ارفعي عينة الأول", true);
  if (!settings.elKey) return toast("حطي مفتاح ElevenLabs في الإعدادات", true);
  const name = prompt("اسم الصوت على ElevenLabs:", "صوتي"); if (!name) return;
  try { settings.elVoice = await el.clone(s.blob, name); saveSettings(); toast("✓ اتعمل الصوت"); loadElVoices(); } catch (e) { toast(e.message, true); }
};

// ---------- settings UI ----------
["hfUrl", "lipUrl", "elKey", "elModel"].forEach(k => $("#" + k).value = settings[k]);
["stab", "sim", "style"].forEach(k => { $("#" + k).value = settings[k]; $("#" + k + "V").textContent = settings[k]; $("#" + k).oninput = () => $("#" + k + "V").textContent = $("#" + k).value; });
$("#saveSettings").onclick = () => { ["hfUrl", "lipUrl", "elKey", "elModel", "stab", "sim", "style"].forEach(k => settings[k] = $("#" + k).value.trim ? $("#" + k).value.trim() : $("#" + k).value); saveSettings(); toast("✓ اتحفظت"); loadElVoices(); };
$("#hfTest").onclick = async () => { settings.hfUrl = $("#hfUrl").value.trim(); saveSettings(); $("#hfStatus").textContent = "…"; try { $("#hfStatus").textContent = "✓ متصل · endpoints: " + await hf.test(); } catch (e) { $("#hfStatus").textContent = "✗ مش متصل (" + e.message + ")"; } };

// ---------- boot ----------
showSample(); loadElVoices();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
