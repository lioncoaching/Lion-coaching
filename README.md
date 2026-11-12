# Lion Coaching — Static Website

Static landing page and subscription checkout for Coach Ahmed Amin (Coach LION). It needs no backend and no build step.

## Structure
```
index.html        Landing page: hero, about, features, steps, plans, FAQ, checkout modal
policy.html       Terms, refund, freeze and privacy policy
assets/config.js  WhatsApp number, payment numbers, plans and prices (edit here only)
assets/main.js    Plans rendering, checkout flow, WhatsApp message builder
assets/style.css  All styles (RTL, mobile-first)
assets/*.webp/png Coach, gym background, lion icon
```

## Checkout flow
1. The client picks a plan and clicks "اشترك".
2. Step 1: name, age, level, goal.
3. Step 2: amount and payment numbers (with copy buttons), plus a required checkbox agreeing to the policy.
4. Step 3: opens `wa.me/<number>` with a prefilled message (plan, amount, method, client data). The client attaches the transfer screenshot and sends it.

Deep link: `index.html?plan=1m` / `?plan=3m` / `?plan=6m` opens checkout with that plan already selected.

## Deploy (GitHub Pages)
Push to a repo, go to Settings → Pages, choose Deploy from branch → `main` / root.
The site also works as-is on Netlify, Vercel or Cloudflare Pages (drag & drop the folder).

## صوتك (voice/) — تطبيق ستاتيك لتوليد صوت بصوتك مجاناً
يتنشر مع الموقع على GitHub Pages في `/voice/`. بدون سيرفر: بيكلّم Spaces مجانية على Hugging Face (المجلد `hf-space/`) أو ElevenLabs بمفتاحك من متصفحك. التفاصيل في `hf-space/README.md`.
