<div align="center">

# ⚡ Bolt Slides

**Presentation decks that are working web apps.**

One prompt in — your agent builds a deck where every slide is a live, responsive web page.
3D, live data, working prototypes, and whatever you can prompt.

[![Open in Bolt](https://img.shields.io/badge/Open_in-⚡_Bolt-1a1a2e?style=flat-square)](https://bolt.new/github.com/stackblitz/bolt-slides)
[![Open in StackBlitz](https://img.shields.io/badge/Open_in-StackBlitz-1389fd?style=flat-square)](https://stackblitz.com/github/stackblitz/bolt-slides)
[![License: MIT](https://img.shields.io/badge/License-MIT-c8f56e?style=flat-square)](./LICENSE)

<img src=".github/assets/cover.png" alt="Bolt Slides — cover slide with the floating dock" width="820" />

</div>

---

Slides have been static for forty years. Bolt Slides makes them software:

- **Make your slides work for you.** Selling a house? Add a 3D walkthrough, a mortgage calculator, an interactive neighborhood map.
- **Make the room build on them.** Your team drops ideas onto a shared whiteboard, live, while you present.
- **Make the data answer questions.** Filter the table, sort the chart, spin a 3D model, drill into the number that matters — mid-presentation.
- **Every screen is a front row seat.** Slides are responsive web layouts, not a fixed 1080p canvas — the audience can follow along from their phones.

Under the hood it's a classic paged deck — Slidev-style dock, thumbnail sidebar, grid overview, click-builds, annotations, synced presenter mode — where each slide is a plain React component. If you can build it for the web, you can present it.

## Quick start

**With an agent (the fun way).** Open the repo in [Bolt](https://bolt.new/github.com/stackblitz/bolt-slides) and prompt it:

> Build me a deck pitching «your thing» to «your audience».

The bundled skill ([`.bolt/skills/slides/SKILL.md`](./.bolt/skills/slides/SKILL.md)) teaches the agent how to theme, compose, and write the deck — including setting the tab title and favicon — so a single prompt returns a finished, presentable app.

**By hand.**

```bash
git clone https://github.com/stackblitz/bolt-slides
cd bolt-slides
npm install
npm run dev
```

The dev server opens a 26-slide demo that exercises every component. Delete the demo slides in [`src/App.tsx`](./src/App.tsx) and author your own.

## Authoring

Each top-level child of `<Deck>` is one slide. Compose them from the component library, or write plain JSX:

```tsx
<Deck>
  <Cover
    kicker="Acme · Series A"
    title={<span className="accent-text">Acme</span>}
    subtitle="Answers, not dashboards."
    notes="Welcome — set up the problem, then hold a beat."
  />

  <Slide center nav="Thesis">
    <h2 className="headline">
      Dashboards are everywhere. <span className="accent-text">Insight isn't.</span>
    </h2>
    <Build at={1}>
      <p className="subhead">Acme turns raw events into answers — automatically.</p>
    </Build>
  </Slide>

  <Agenda
    kicker="Agenda"
    title="What we'll cover."
    items={['The problem', 'How it works', { title: 'Pricing & the ask', hint: '5 min' }]}
  />
</Deck>
```

- **`<Build at={n}>`** reveals content on the nth click — arrow keys step through builds before advancing slides, forward *and* back.
- **`notes="…"`** on any slide shows up in presenter mode; notes you edit while presenting persist locally.
- Slides are ordinary React — fetch live data, mount a 3D scene, embed your actual product.

## Presenting

<img src=".github/assets/grid-view.png" alt="Grid view of every slide" width="820" />

| Key | Action |
| --- | --- |
| `→` `↓` `Space` | Next (reveals builds first) |
| `←` `↑` | Previous (rewinds builds) |
| `Home` / `End` | First / last slide |
| `S` | Sidebar — thumbnail rail |
| `G` | Grid view — every slide at once |
| `A` | Annotate — pen, highlighter, shapes, eraser |
| `F` | Fullscreen |
| `P` | Presenter mode — synced new tab |
| `H` | Hide the UI |
| `Esc` | Close overlays |

- **Presenter mode** opens in a second tab with a timer, next-slide preview, and editable notes — kept in sync with the audience tab via `BroadcastChannel`.
- **Annotations are content-anchored**: a circle drawn around a stat on a laptop rings the same stat on a phone, wherever the layout moved it. Drawings persist per slide.
- **Deep links**: the URL hash tracks the slide (`/#7`), so you can share a link straight to a slide.

## Component library

| | Components |
| --- | --- |
| **Structure** | `Cover` `Agenda` `Section` `Split` `Bento` `Slide` |
| **Data** | `Charts` (bar · line · donut) `Table` `StatGrid` `BigNumber` `CountUp` `VisualDashboard` |
| **Story** | `Quote` `Contrast` `Comparison` `Timeline` `Steps` `Chat` |
| **Product** | `CodeWindow` `BrowserFrame` `Pricing` `Team` |
| **Flair** | `Globe` `TiltCard` `SpotlightCard` `Marquee` `Accordion` `Tabs` |

All of them are demoed in the bundled starter deck, and all of them are responsive.

## Theming

Every color, font, radius, and shadow lives in the `:root` block of [`src/styles/tokens.css`](./src/styles/tokens.css). Change `--primary` and the entire deck — chrome included — recolors. Nine ready-made theme directions are documented in the skill, from editorial luxury to dark technical.

## Project structure

```
.bolt/skills/slides/   the agent-facing authoring guide (the skill)
src/deck/              engine + chrome — Deck, Slide, Build, Reveal, Annotator
src/components/        the slide component library
src/styles/            tokens.css (theme) + base.css (system styles)
src/App.tsx            your deck (ships with the component demo)
```

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md). `npm run dev` to hack, `npx tsc --noEmit && npm run build` before you push.

## License

[MIT](./LICENSE) © StackBlitz
