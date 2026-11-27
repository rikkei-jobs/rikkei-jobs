# Upstream Provenance, Exclusions & MIT License (`Leonxlnx/taste-skill`)

## 1. Pinned Provenance Metadata

- **Upstream Repository**: <https://github.com/leonxlnx/taste-skill> (canonical GitHub redirect: <https://github.com/Leonxlnx/taste-skill>)
- **Upstream Skill Path & Frontmatter Name**: `skills/taste-skill/SKILL.md` (`name: design-taste-frontend`)
- **Branch**: `main`
- **Pinned Commit SHA**: `f6b76575f949707b4e3c37cd86cb44b0b98643e8`
- **Commit Timestamp**: `2026-11-07T12:33:21Z`
- **Commit Title**: `Merge pull request #196 from Leonxlnx/v2.5.1` (`tasteskill 2.5.1: finish gate, motion on every page, copy layer, photos over renders, trade palettes, phone checks`)
- **Upstream Version**: `2.5.1`
- **License**: `MIT` (`Copyright (c) 2026 Leonxlnx`)
- **Vendored Target in Rikkei Jobs**: `agent-config/skills/frontend-taste-anti-slop/` (instructions-only adaptation; zero upstream scripts, hooks, manifests, or binary/CDN assets vendored).

---

## 2. Excluded Upstream Components (Security & Architecture Rationale)

The following upstream artifacts were intentionally **NOT** vendored or executed:

1. **Claude Code `Stop` Hook & Gate Runner**:
   - Upstream frontmatter registers a `Stop` hook shell loop (`timeout: 600`) executing a Node gate script and writing `.taste-skill` state files.
   - Excluded because executing unaudited hook scripts on session exit creates a supply-chain/surprise-execution risk and conflicts with Rikkei Jobs' quality gate parity rules (`Rule 12`, `scripts/check-gate-sync.mjs`).
2. **Remote Installers & Plugin Manifests**:
   - `npx skills add` remote installation, shell symlink installers (`install.sh`), `.claude-plugin`, `.codex-plugin`, and `.agents/plugins` manifests.
   - Excluded because Rikkei Jobs manages agent configuration canonically in `agent-config/` via `scripts/sync-agent-config.mjs`, forbids host-global installs (`Rule 03`), and forbids executing remote installer scripts.
3. **Executable Scripts & Network Asset Fetchers**:
   - All upstream Node scripts (gate, consistency, copy-lint, start, perf, shoot, effects, moments, icons, photos, layout deal/check, background pick/check, map baker, shader linters).
   - Excluded because several require Node 22+ and local Chrome/Edge/ffmpeg, perform runtime network requests (Google Fonts, `cdn.jsdelivr.net`, Wikimedia Commons API, OpenStreetMap Overpass API), or duplicate Rikkei Jobs' `check.sh`, `check.ps1`, `compute-contrast.mjs`, Vitest, and `/browser` verification.
4. **Heavy Asset Kits & Palette/Type Dealers**:
   - Upstream starter HTML templates, 25 WebGL shaders, 3D product renderers, bundled photos, ~650 demo SVGs, and `palettes.json` / `type.json` dealers.
   - Excluded because Rikkei Jobs mandates bespoke `--rj-*` design tokens, self-hosted OFL WOFF2 fonts (`frontend/public/fonts/`), and the curated 24px monoline `<Icon name=... />` system (`Rule 09`).

---

## 3. Verbatim Upstream MIT License

```text
MIT License

Copyright (c) 2026 Leonxlnx

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
