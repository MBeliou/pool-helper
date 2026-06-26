# marketing

The marketing website. Built as a **config-driven, reusable template**: all content lives in one
typed config, and the section components are product-agnostic.

## Reuse for a new product

To re-skin the entire site for a different product, edit just two things — no component changes:

1. **`src/lib/config/site.ts`** — the single source of truth for all copy (brand name/tagline, nav,
   hero, stats, features, pricing, screenshots, testimonials, FAQ, CTA, footer, SEO). The shape is
   typed in `src/lib/config/types.ts`.
2. **The brand assets** — the droplet/logo comes from `@my-pool/shared/assets/`, and the design
   tokens (palette, gradient, fonts) from `@my-pool/shared/styles/tokens.css`.

Sections live in `src/lib/components/marketing/` (composed in `src/routes/+page.svelte`). Screenshots
use `AppScreenshot.svelte`, a placeholder panel that accepts a real `src` when you have one. New
feature icons: add the lucide icon to the `ICONS` map in `Features.svelte`.

---

Powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv@0.16.1 create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" playwright tailwindcss="plugins:none" sveltekit-adapter="adapter:vercel" paraglide="languageTags:en, fr+demo:no" storybook mcp="ide:claude-code+setup:remote" experimental="versions:kit+features:async,remoteFunctions,explicitEnvironmentVariables,handleRenderingErrors" --install pnpm ./marketing
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
