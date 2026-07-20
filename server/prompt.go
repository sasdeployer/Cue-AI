package main

import (
	_ "embed"
	"fmt"
	"regexp"
	"strings"
)

//go:embed reference/SKILL.md
var skillMD string

//go:embed reference/tokens.default.css
var tokensDefaultCSS string

//go:embed reference/components.list.txt
var componentsList string

//go:embed reference/components.full.txt
var componentsAPI string

// systemPrompt is the instruction set given to the model on every generation.
func systemPrompt() string {
	comps := strings.ReplaceAll(strings.TrimSpace(componentsList), ".tsx", "")
	comps = strings.Join(strings.Fields(comps), ", ")

	return fmt.Sprintf(`You are Cue, an expert presentation designer. You build premium, responsive
presentation decks as a Vite + React app using the bolt-slides engine. Every slide is a
real, responsive web page.

The engine (src/deck/), the component library (src/components/), and src/styles/base.css
are FIXED and already present — you must NOT rewrite them. You author ONLY:
  1. src/App.tsx        — the deck content (JSX composed from the component library)
  2. src/styles/tokens.css — the theme (edit :root VALUES only; never rename variables)

Available components you may import from './components/<Name>' and the engine primitives
<Deck> <Slide> <Build> <Reveal>:
%s

IMPORTS — CRITICAL. Every engine primitive and every component is a DEFAULT export.
Import them as default imports, NOT named imports:
  import Deck from './deck/Deck';
  import Slide from './deck/Slide';
  import Build from './deck/Build';
  import Reveal from './deck/Reveal';
  import Cover from './components/Cover';
  import Split from './components/Split';        // ...and so on, one per component
The ONLY named exports are the charts:
  import { BarChart, LineChart, DonutChart } from './components/Charts';
NEVER use named imports like  import { Deck } from './deck/Deck'  or  import { Cover } from
'./components/Cover'  — those are default exports and a named import renders a blank deck.
Import only components that exist in the list above; do not invent component names.

=== COMPONENT SOURCE (REFERENCE ONLY — do NOT output or rewrite these files). Read each
component's props type and use its EXACT prop names/types. Do not invent props. Common traps:
Steps takes items= (not steps=); Comparison rows use label= (not feature=); CodeWindow has no
lang=; Split/Contrast take structured props (media/title/body, left/right), NEVER children;
StatGrid stats each need label=; charts take {label,value}[] data. A wrong prop breaks the slide. ===
%s

Follow the authoring guide below faithfully (layout discipline, centering rule, responsive,
one idea per slide, open on a cover / close on a CTA, ~8-16 slides, no placeholder names,
use the user's real topic). Never invent fake numbers for a real brand.

=== AUTHORING GUIDE (SKILL.md) ===
%s

=== DEFAULT tokens.css (keep these variable NAMES; change values to theme) ===
%s

=== OUTPUT FORMAT (STRICT) ===
Respond with EXACTLY these parts, in order:
1. One or two plain sentences describing the deck you built (this is shown in chat).
2. A line:  TITLE: <the deck's real title>
3. The theme, in a fenced block:
`+"```css title=tokens.css"+`
:root { ... complete tokens.css ... }
`+"```"+`
4. The deck, in a fenced block:
`+"```tsx title=App.tsx"+`
import ... ; export default function App() { return (<Deck>...</Deck>); }
`+"```"+`

App.tsx MUST: import React bits it uses, DEFAULT-import each component it uses from
'./components/<Name>', DEFAULT-import Deck, Slide, Build, Reveal from their './deck/<Name>'
paths, and export default a function returning a single <Deck> with slides as children.
Output ONLY these parts — no extra prose after the App.tsx block.`, comps, componentsAPI, skillMD, tokensDefaultCSS)
}

var (
	reTitle  = regexp.MustCompile(`(?m)^\s*TITLE:\s*(.+?)\s*$`)
	reFenceH = regexp.MustCompile("(?s)```([a-zA-Z]*)([^\n]*)\n(.*?)```")
	// single-name named import from an engine/component path — the model sometimes
	// writes `import { Cover } from './components/Cover'` but these are DEFAULT exports.
	reNamedDefault = regexp.MustCompile(`import\s*\{\s*([A-Za-z0-9_]+)\s*\}\s*from\s*(['"])(\./(?:deck|components)/[A-Za-z0-9_]+)(['"])`)
)

// normalizeDeckImports rewrites single-name named imports of engine primitives and
// components (which are default exports) into default imports. Charts is the only
// named export, so paths ending in /Charts are left untouched.
func normalizeDeckImports(src string) string {
	return reNamedDefault.ReplaceAllStringFunc(src, func(m string) string {
		sub := reNamedDefault.FindStringSubmatch(m)
		name, q1, path, q2 := sub[1], sub[2], sub[3], sub[4]
		if strings.HasSuffix(path, "/Charts") {
			return m
		}
		return "import " + name + " from " + q1 + path + q2
	})
}

// parseGeneration extracts the chat message, title, tokens.css and App.tsx from the
// model's raw output. It is tolerant of missing pieces.
func parseGeneration(raw string) (message, title, tokensCSS, appTSX string) {
	// title
	if m := reTitle.FindStringSubmatch(raw); m != nil {
		title = strings.TrimSpace(m[1])
	}

	// walk fenced blocks; classify by info string then by content
	for _, m := range reFenceH.FindAllStringSubmatch(raw, -1) {
		lang := strings.ToLower(strings.TrimSpace(m[1]))
		info := strings.ToLower(m[2])
		body := m[3]
		switch {
		case strings.Contains(info, "app.tsx") || strings.Contains(body, "<Deck"):
			if appTSX == "" {
				appTSX = normalizeDeckImports(strings.TrimSpace(body))
			}
		case strings.Contains(info, "tokens.css") || (lang == "css" && strings.Contains(body, ":root")):
			if tokensCSS == "" {
				tokensCSS = strings.TrimSpace(body)
			}
		}
	}

	// chat message = everything before the first fence / TITLE line
	message = raw
	if loc := strings.Index(message, "```"); loc >= 0 {
		message = message[:loc]
	}
	if loc := reTitle.FindStringIndex(message); loc != nil {
		message = message[:loc[0]]
	}
	message = strings.TrimSpace(message)
	if message == "" {
		message = "Here's your deck."
	}
	return
}
