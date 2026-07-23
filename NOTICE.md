# Third-party notices

Cue's slide-rendering engine and component library originated as a fork of
[bolt-slides](https://github.com/stackblitz/bolt-slides) by StackBlitz,
released under the MIT License:

```
MIT License

Copyright (c) 2026 StackBlitz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

That inherited code lives in `web/src/deck-template/`, `web/src/deck-runtime/`'s
pre-baked engine copy, and `server/reference/engine/` (all synced from the same
source by `dev.sh` — see `CLAUDE.md`).

Everything else in this repository — the AI generation pipeline, the
same-origin in-browser runtime, the step-feed system, BYOK, the product UI,
and all branding — is original work, covered by this repository's own
`LICENSE` (MIT, Copyright (c) 2026 Sal Stabler).
