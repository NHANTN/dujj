# Jingjing Du — Personal Resume Website

A modern, responsive personal resume website with bilingual (中文 / English) support and dual-mode (Architecture / Project Manager) content switching.

## ✨ Features

- 🌓 **Light & Dark themes** — system-preference aware, one-click toggle
- 🌐 **Bilingual** — Chinese / English, all content fully translated
- 🎯 **Dual mode** — Infrastructure Engineer ↔ Project Manager switch (Arch emphasizes technical depth, PM emphasizes stakeholder/management)
- 📱 **Responsive** — desktop / tablet / mobile breakpoints
- 📄 **PDF export** — 4 PDFs auto-generated (CN/EN × Arch/PM), smart download based on current mode + language
- ⚡ **Zero dependencies** — pure HTML + CSS + Vanilla JS, no build step
- 🎨 **Customizable** — all colors via CSS variables, easy theme tweaking

## 🏗️ Architecture

```
resume-website/
├── index.html              # Main page
├── assets/
│   ├── css/style.css       # Theme + components (CSS variables for both modes)
│   ├── js/main.js          # i18n + dynamic rendering + interactions
│   ├── data/               # JSON content (4 files: arch-zh/en, pm-zh/en)
│   └── pdf/                # 4 generated resume PDFs
└── README.md
```

## 🔄 State Matrix (8 states)

| Mode | Lang | Loads | PDF |
|------|------|-------|-----|
| arch | zh | `arch-zh.json` | `Jingjing-Du-Infrastructure-Engineer-CN.pdf` |
| arch | en | `arch-en.json` | `Jingjing-Du-Infrastructure-Engineer-EN.pdf` |
| pm   | zh | `pm-zh.json`   | `Jingjing-Du-Project-Manager-CN.pdf` |
| pm   | en | `pm-en.json`   | `Jingjing-Du-Project-Manager-EN.pdf` |

Theme is independent (light / dark) — making 8 visual states total.

## 🚀 Local development

```bash
# Just open index.html in a browser, or run a static server:
python3 -m http.server 8000
# → http://localhost:8000
```

## 📝 Updating content

All content lives in `assets/data/*.json`. To regenerate PDFs after editing the `.md` source files, run:

```bash
python3 ../path/to/build_pdf.py
```

## 🌐 Deploy

This is a pure static site. Deploy anywhere:

- **Cloudflare Pages** — connect repo, build settings: `Build command` empty, `Output dir` `/`
- **Vercel** — `vercel --prod`
- **Netlify** — `netlify deploy --prod --dir=.`
- **GitHub Pages** — Settings → Pages → Source: `main` branch, `/` root
- **Any static host** — just upload the directory

## 🔧 Tech

- HTML5 + CSS3 + Vanilla JavaScript (ES6+)
- Google Fonts (Inter, JetBrains Mono, Noto Sans SC)
- No frameworks, no build tools, no dependencies
