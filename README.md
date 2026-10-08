# Fade Hub 021

Sajt barber shopa **Fade Hub 021** — Bulevar Jovana Dučića 1, Novo naselje, Novi Sad.
Statički sajt (HTML + CSS + JS, bez frameworka i bez build koraka).

## Struktura

```
fade-hub/
├── index.html              # cela stranica (intro, hero, 01–05 sekcije, footer, SEO/JSON-LD)
├── assets/
│   ├── css/style.css       # svi stilovi
│   ├── js/main.js          # sva logika (intro, galerija, utisci, WhatsApp forma)
│   ├── logo.jpg            # kvadratni logo (deljenje linka / Open Graph)
│   ├── logo-wide.png       # logo za navigaciju, hero i footer
│   ├── logo-intro-600.png  # veliki logo za intro
│   ├── favicon.png         # ikonica taba
│   └── gallery/
│       └── rad-1.jpg … rad-8.jpg   # fotografije radova (1200×1600)
└── tests/run-tests.mjs     # automatski test (Playwright)
```

Da zameniš sliku, otpremi novu sa istim nazivom (preko GitHub-a ili pošalji Claude-u).

## Podešavanja (vrh `assets/js/main.js`)

| Konstanta | Šta je |
| :-- | :-- |
| `WHATSAPP_NUMBER` | broj na koji stižu zahtevi za termin (`381638584999`) |
| `GOOGLE_PLACE_ID` | Google Place ID za „Napiši recenziju” — unesi kad napraviš Google Business profil |
| `SERVICE_NAMES` | nazivi usluga u WhatsApp poruci (moraju da prate `<select id="service">` u `index.html`) |

Cene se menjaju u `index.html` (sekcija `#usluge`), u `<select id="service">` i u JSON-LD bloku u `<head>`.

## Pokretanje lokalno

```bash
python3 -m http.server 8000
# otvori http://localhost:8000
```

## Testovi

```bash
npm i -D playwright && npx playwright install chromium   # samo prvi put
node tests/run-tests.mjs
```

Testira desktop (1440), telefon (390) i mali telefon (320): intro, sva „Zakaži termin” dugmad,
validaciju forme, WhatsApp poruku za svih 5 usluga, specijalne znakove, nedelju/prošli datum,
popup blokator, galeriju, utiske, horizontalni scroll i JS greške.

> Test potvrđuje da se WhatsApp otvara sa ispravnom porukom na 063 858 4999, ali ne može da potvrdi
> da je poruka stigla salonu — za to pošalji jedan probni zahtev sa pravog telefona.

## Objavljivanje (GitHub Pages)

Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → Save.
Sajt će biti na `https://<korisnik>.github.io/fade-hub/`.
