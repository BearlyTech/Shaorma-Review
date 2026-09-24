# Shaorma.review

Platformă statică, în română, pentru reviewuri personale de kebab și shaormă din București. Site-ul public are o listă pe niveluri (S–D) sincronizată cu o hartă MapLibre. Editarea se face doar local.

## Ce vezi pe site

- **Listă pe niveluri** — S (9–10), A (8–8,9), B (7–7,9), C (6–6,9), D (1–5,9), din ultimul review datat
- **Hartă** — markere, popup-uri și centrare pe localul selectat
- **Căutare și filtre** — text, ingredient, tip și notă minimă
- **Istoric** — ultimul review e implicit, cele vechi rămân în accordion

Datele din `src/data/kebab-places.json` sunt marcate ca **Date demo** până le înlocuiești din studio.

## Setup local

1. Instalează Node.js 22+.
2. Copiază `.env.example` în `.env` și pune cheia MapTiler:

```env
VITE_MAPTILER_KEY=cheia_ta_publica
```

3. Instalează dependințele și pornește aplicația:

```bash
npm install
npm run dev
```

Site-ul public: `http://localhost:5173`  
**Studio de reviewuri:** `http://localhost:5173/admin`

## Studio de reviewuri (doar local)

Studioul există doar pe serverul Vite de dezvoltare. Build-ul de GitHub Pages nu include ruta `/admin` și nici endpoint-ul de scriere.

Flux:

1. Pornește `npm run dev` și deschide `/admin`.
2. Caută un local în București (POI MapTiler) sau click pe hartă pentru geocodare inversă (`poi,address`).
3. Corectează numele, adresa și coordonatele dacă e nevoie.
4. Completează data vizitei, descrierea, nota generală (1–10) și ingredientele prezente.
5. Un ingredient neselectat înseamnă „nu a fost prezent”, nu nota 0.
6. Poți adăuga ingrediente și tipuri noi; se salvează în catalogul global.
7. **Salvează localul și reviewul** — scrie `src/data/kebab-places.json`.
8. Folosește export/import JSON ca backup.
9. Previzualizează site-ul public, apoi commite JSON-ul. GitHub Pages reface site-ul.

## MapTiler

Cheia e vizibilă în browser (`VITE_MAPTILER_KEY`). În [MapTiler Cloud](https://cloud.maptiler.com/account/keys/) restricționează-o la:

- `http://localhost:5173`
- domeniul GitHub Pages (`https://<user>.github.io`)

Harta folosește stilul Streets v2 și păstrează atribuirea MapTiler / OpenStreetMap.

## GitHub Pages

1. În repo, Settings → Pages → **GitHub Actions**.
2. Adaugă secretul `VITE_MAPTILER_KEY`.
3. Push pe `main`. Workflow-ul din `.github/workflows/deploy.yml` rulează lint, teste, build și publică `dist` (doar când se schimbă codul aplicației, nu doar README).

### Workflow-uri

| Workflow | Când rulează |
| -------- | -------------- |
| [ci.yml](.github/workflows/ci.yml) | Pull request — lint, teste, build |
| [preview.yml](.github/workflows/preview.yml) | Pull request — artefact `dist` + comentariu pe PR |
| [deploy.yml](.github/workflows/deploy.yml) | Push pe `main` (path filter) sau manual |
| [dependabot.yml](.github/dependabot.yml) | Actualizări săptămânale npm și GitHub Actions |

**Branch protection (recomandat):** Pentru repo **privat**, regulile pe `main` cer GitHub **Team** (org) sau **Pro** (cont personal), sau fă repo-ul **public** (Free). Settings → Branches / Rulesets → require status check **CI / verify** după primul PR cu CI verde.

**Repo org:** [BearlyTech/Shaorma-Review](https://github.com/BearlyTech/Shaorma-Review). Remote local:

```bash
git remote set-url origin git@github.com:BearlyTech/Shaorma-Review.git
```

După transfer, re-activează Pages → **GitHub Actions** (secretul `VITE_MAPTILER_KEY` e deja în org).

**Preview live (opțional):** setează variabila `CF_PAGES_PROJECT_NAME` și secretele `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` pentru deploy Cloudflare Pages la PR.

## Scripturi

```bash
npm run dev      # site + studio local
npm run build    # build static, fără editor
npm test
npm run lint
```
