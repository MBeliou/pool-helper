# renderfast — integration feedback

Notes captured while wiring renderfast into the App Store screenshot pipeline
(`template.ts` / `frame.ts`). Goal: turn raw simulator screenshots into framed
marketing shots via the REST API. Written as we go — newest findings appended.

Base URL: `https://renderfa.st/api` · Auth: `Authorization: Bearer <API key>`.

## What works well
- **Auth + template CRUD**: `GET/POST /api/templates`, `GET /api/templates/{id}`
  all clean. Template `jsonData` = `{ canvas, layers, variables }`; layers carry
  `{ id, name, type, zIndex, content|src, position:{x,y}, dimensions:{w,h}, style, borderRadius }`.
- **Text layer overrides**: `POST /api/generate` with
  `layers: { <layerName>: { text: "..." } }` works reliably, keyed by **layer name**
  (no `variables` entry needed). Multi-line via `\n` respected. Fonts (Archivo Black,
  Inter) render correctly.
- **Gradient backgrounds**: `canvas.background: "linear-gradient(158deg, #1f86c4, #0b5a92)"`
  renders correctly — nice.
- **Custom layer ids**: server preserves ids you supply on create (e.g. `id: "headline"`).

## Rough edges / bugs
1. **Undocumented override contract.** OpenAPI (`/api/openapi/json`) types
   `generate.layers` as `patternProperties: { "^(.*)$": {} }` — i.e. `any`. The real
   contract (key = layer name; `{ text }` for text, `{ image_url, objectFit, objectPosition }`
   for image) is only discoverable by example. Please document per-layer-type value shapes.
2. **`content` vs `text` mismatch.** A text layer is *stored* as `content`, but the
   generate *override* field is `text`. Passing `{ content }` returns HTTP 200 but silently
   renders the default (no error). Passing a bare string (`{ layer: "txt" }`) returns
   **500 "Failed to generate image"** with no detail. Confusing; align the names or document.
3. **CSRF on uploads.** `POST /api/uploads` returns **403 "Cross-site POST form submissions
   are forbidden"** unless an `Origin: https://renderfa.st` header is sent. A server-to-server
   API authenticated by Bearer token shouldn't apply browser CSRF form protection. This is a
   trap for any non-browser client.
4. **Uploaded assets aren't usable by the renderer (the big one).** `POST /api/uploads`
   succeeds, but the only URLs it yields (`/api/uploads/{id}/file`, and `/{id}/url` which just
   points back to `/file`) are **401 without auth**. The render engine fetches `image_url`
   over the public internet with no auth, so **you cannot feed an uploaded image into a
   render**. There's no public/CDN URL and no `?token=` on the upload. This makes the uploads
   endpoint effectively useless for API-driven rendering — the exact use case. (Investigating
   whether a public `image_url` or data URI is the intended path — see log below.)
5. **Silent image failures.** When an image layer can't load its `image_url`, the render
   succeeds (HTTP 200) with the image simply **absent** (blank). No warning in the response.
   Hard to debug; a `warnings: []` array in the generate response would help a lot.

## 🚩 BLOCKER: image layers do not render at all (via the API)
After isolating every variable, **no image layer renders through the API**, regardless of
URL type or endpoint. Text layers and gradient backgrounds render correctly in the same
template — only images are dropped, silently (HTTP 200, no warning).

Minimal repro (fully self-contained):
```
POST /api/templates  { name, jsonData: {
  canvas: { width:600, height:600, background:"#222" },
  layers: [{ id:"pic", name:"pic", type:"image", zIndex:1,
             src:"https://raw.githubusercontent.com/github/explore/main/topics/javascript/javascript.png",
             position:{x:100,y:100}, dimensions:{width:400,height:400},
             borderRadius:{topLeft:0,topRight:0,bottomLeft:0,bottomRight:0} }],
  variables: [] }}
→ then either:
POST /api/generate { templateId }                 // no override, uses the layer's own src
GET  /api/render?templateId=...&layers={...}       // override pic.image_url
```
Both return a valid PNG that is **just the #222 background** — the image never appears.
The `src` above is a confirmed direct `200 image/png` (checked with redirect:"manual").

Image URLs tried, all blank:
- `via.placeholder.com` (down), `picsum.photos` / `loremflickr` / `cataas` (302 redirects),
- `raw.githubusercontent.com/...png` (**direct 200 image/png**), `upload.wikimedia.org/...png` (direct 200),
- `data:image/png;base64,...` (≈1.1 MB), `/api/uploads/{id}/file` (own upload, 401 to renderer).

Editor-made templates (e.g. "Product Hunt - Gallery Hero") also show blank image areas via
the API — but their layers point at the dead `via.placeholder.com`, so that's consistent with
the same bug rather than a counter-example. Could not find any template whose image actually
renders through the API.

**Impact:** blocks the entire "frame a screenshot" use case — the core reason to call the API.
Text-only OG images work; anything with a photo/screenshot/logo does not.

**Asks:**
- Fix image-layer rendering in the API render path (both `/generate` and `/render`).
- Until then, surface a `warnings` array when an image layer fails to load, instead of 200-blank.
- Provide a public (or token-signed) URL for `/api/uploads` assets so uploads can feed renders.
- Clarify whether `data:` URIs are supported (ideal for server-side pipelines with local images).
</content>
