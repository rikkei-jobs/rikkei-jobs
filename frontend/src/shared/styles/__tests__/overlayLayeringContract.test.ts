/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = path.resolve(__dirname, '../../..');
const MAIN_TSX_PATH = path.join(SRC_ROOT, 'main.tsx');
const INDEX_CSS_PATH = path.join(SRC_ROOT, 'index.css');
const DESIGN_TOKENS_PATH = path.join(SRC_ROOT, 'shared/styles/design-tokens.css');
const SELECT_CSS_PATH = path.join(SRC_ROOT, 'shared/components/Select.css');
const IDENTITY_CSS_PATH = path.join(SRC_ROOT, 'features/identity/styles/identity.css');
const RECRUITMENT_CSS_PATH = path.join(SRC_ROOT, 'features/recruitment/styles/recruitment.css');

function readCss(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function collectCssFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        continue;
      }
      files.push(...collectCssFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      files.push(fullPath);
    }
  }
  return files;
}

interface CssLeafRule {
  selector: string;
  declarations: string;
  atContext: string[];
}

function parseLeafCssRules(css: string): CssLeafRule[] {
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: CssLeafRule[] = [];

  function walk(input: string, atContext: string[]): void {
    let i = 0;
    while (i < input.length) {
      while (i < input.length && /\s/.test(input[i])) {
        i += 1;
      }
      if (i >= input.length) {
        break;
      }
      const openIdx = input.indexOf('{', i);
      if (openIdx === -1) {
        break;
      }
      const header = input.slice(i, openIdx).trim();
      let depth = 1;
      let j = openIdx + 1;
      while (j < input.length && depth > 0) {
        if (input[j] === '{') {
          depth += 1;
        } else if (input[j] === '}') {
          depth -= 1;
        }
        j += 1;
      }
      const body = input.slice(openIdx + 1, j - 1);
      if (header.startsWith('@')) {
        if (/^@(media|supports|layer)\b/i.test(header)) {
          walk(body, [...atContext, header]);
        }
      } else if (header.length > 0) {
        rules.push({ selector: header, declarations: body, atContext });
      }
      i = j;
    }
  }

  walk(cleaned, []);
  return rules;
}

function selectorSubjectTargetsRoot(selectorList: string): boolean {
  return selectorList
    .split(',')
    .map((part) => part.trim())
    .some((complex) => {
      if (!complex || complex.includes('::view-transition')) {
        return false;
      }
      const tokens = complex.split(/[\s>+~]+/).filter(Boolean);
      const subject = tokens[tokens.length - 1] ?? '';
      return /^(html|body)(?:$|[.#:[])/.test(subject);
    });
}

function collectNonTestTsFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') {
        continue;
      }
      files.push(...collectNonTestTsFiles(fullPath));
    } else if (
      entry.isFile() &&
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function resolveZTokenScale(tokensCss: string): Record<string, number> {
  const primitiveMatches = new Map<string, number>();
  const primitiveRegex = /--rj-primitive-z-([a-z-]+)\s*:\s*(-?\d+)\s*;/g;
  let match: RegExpExecArray | null;
  while ((match = primitiveRegex.exec(tokensCss)) !== null) {
    primitiveMatches.set(`--rj-primitive-z-${match[1]}`, Number(match[2]));
  }

  const semanticScale: Record<string, number> = {};
  const semanticRegex = /(--rj-z-[a-z-]+)\s*:\s*([^;]+);/g;
  while ((match = semanticRegex.exec(tokensCss)) !== null) {
    const tokenName = match[1];
    const rawValue = match[2].trim();
    if (/^-?\d+$/.test(rawValue)) {
      semanticScale[tokenName] = Number(rawValue);
      continue;
    }
    const varRef = rawValue.match(/^var\((--rj-primitive-z-[a-z-]+)\)$/);
    if (varRef && primitiveMatches.has(varRef[1])) {
      semanticScale[tokenName] = primitiveMatches.get(varRef[1])!;
    }
  }
  return semanticScale;
}

function extractRuleBlock(css: string, selectorPattern: RegExp): string {
  const match = css.match(selectorPattern);
  return match ? match[0] : '';
}

describe('Overlay Layering & Root Scroll-Lock Contract (UT-01-modal)', () => {
  it('defines strictly ordered Tier-2 semantic --rj-z-* tokens in design-tokens.css', () => {
    const tokensCss = readCss(DESIGN_TOKENS_PATH);
    const scale = resolveZTokenScale(tokensCss);

    const expectedOrder = [
      '--rj-z-dropdown',
      '--rj-z-sticky',
      '--rj-z-drawer-backdrop',
      '--rj-z-drawer',
      '--rj-z-modal-backdrop',
      '--rj-z-modal',
      '--rj-z-popover',
      '--rj-z-toast',
      '--rj-z-skip-link',
    ];

    for (const token of expectedOrder) {
      expect(scale[token], `Missing or unresolvable ${token} in design-tokens.css`).toBeTypeOf(
        'number',
      );
    }

    for (let i = 1; i < expectedOrder.length; i += 1) {
      const prev = expectedOrder[i - 1];
      const curr = expectedOrder[i];
      expect(scale[curr], `${curr} (${scale[curr]}) must be > ${prev} (${scale[prev]})`).toBeGreaterThan(
        scale[prev],
      );
    }
  });

  it('defines scrollbar-gutter: stable and html[data-scroll-locked="true"] root scroll-lock rule without overflow-x: clip', () => {
    const tokensCss = readCss(DESIGN_TOKENS_PATH);

    expect(tokensCss).toMatch(/html\s*\{[^}]*scrollbar-gutter\s*:\s*stable\s*;/s);
    const lockedRule = extractRuleBlock(
      tokensCss,
      /html\[data-scroll-locked=['"]true['"]\]\s*\{[^}]*\}/,
    );
    expect(lockedRule).not.toBe('');
    expect(lockedRule).toMatch(/overflow\s*:\s*hidden\s*;/);
    expect(lockedRule).toMatch(/overscroll-behavior\s*:\s*none\s*;/);
    // Mixing overflow: hidden + overflow-x: clip compiles to `overflow: clip hidden` in LightningCSS,
    // which allowed Chromium mouse.wheel to bypass the root lock (Defect #1).
    expect(lockedRule).not.toMatch(/overflow-x\s*:\s*clip/);
    expect(lockedRule).not.toMatch(/overflow-y\s*:/);
  });

  it('imports design-tokens.css before index.css and isolates html/body rules across all CSS files', () => {
    const mainTsx = fs.readFileSync(MAIN_TSX_PATH, 'utf8');
    const tokensImportIdx = mainTsx.indexOf('./shared/styles/design-tokens.css');
    const indexImportIdx = mainTsx.indexOf('./index.css');
    expect(tokensImportIdx).toBeGreaterThan(-1);
    expect(indexImportIdx).toBeGreaterThan(-1);
    expect(tokensImportIdx).toBeLessThan(indexImportIdx);

    const indexCss = readCss(INDEX_CSS_PATH);
    const indexRules = parseLeafCssRules(indexCss).filter((rule) =>
      selectorSubjectTargetsRoot(rule.selector),
    );
    const indexRootDeclarations = indexRules.map((r) => r.declarations).join('\n');
    expect(indexRootDeclarations).toMatch(/overflow-x\s*:\s*clip\s*;/);
    expect(indexRootDeclarations).not.toMatch(/overflow\s*:/);
    expect(indexRootDeclarations).not.toMatch(/overflow-y\s*:/);
    expect(indexRootDeclarations).not.toMatch(/(^|[;\s])height\s*:/);
    expect(indexRootDeclarations).not.toMatch(/overscroll-behavior\s*:/);

    const allCssFiles = collectCssFiles(SRC_ROOT);
    const unexpectedRootRules: string[] = [];
    for (const filePath of allCssFiles) {
      const rel = path.relative(SRC_ROOT, filePath).replace(/\\/g, '/');
      if (rel === 'shared/styles/design-tokens.css' || rel === 'index.css') {
        continue;
      }
      const rules = parseLeafCssRules(readCss(filePath));
      for (const rule of rules) {
        if (
          selectorSubjectTargetsRoot(rule.selector) &&
          /(?:^|[;\s])(?:overflow(?:-[xy])?|height|position|overscroll-behavior)\s*:/i.test(
            rule.declarations,
          )
        ) {
          unexpectedRootRules.push(`${rel}: ${rule.selector}`);
        }
      }
    }
    expect(unexpectedRootRules).toEqual([]);
  });

  it('keeps .rj-dashboard and .rj-dashboard-body free of stacking-context-creating properties', () => {
    const identityCss = readCss(IDENTITY_CSS_PATH);
    const tokensCss = readCss(DESIGN_TOKENS_PATH);
    const identityRules = parseLeafCssRules(identityCss);

    const shellWrapperRules = identityRules.filter((rule) =>
      rule.selector
        .split(',')
        .map((s) => s.trim())
        .some((s) => /^\.rj-dashboard(?:\[|$)/.test(s) || /^\.rj-dashboard-body(?:\[|$)/.test(s)),
    );
    expect(shellWrapperRules.length).toBeGreaterThan(0);

    for (const rule of shellWrapperRules) {
      const decl = rule.declarations;
      const zMatch = decl.match(/(?:^|[;\s])z-index\s*:\s*([^;]+)/i);
      if (zMatch) {
        expect(zMatch[1].trim()).toBe('auto');
      }
      const transformMatch = decl.match(/(?:^|[;\s])transform\s*:\s*([^;]+)/i);
      if (transformMatch) {
        expect(transformMatch[1].trim()).toBe('none');
      }
      const filterMatch = decl.match(/(?:^|[;\s])(?:backdrop-)?filter\s*:\s*([^;]+)/i);
      if (filterMatch) {
        expect(filterMatch[1].trim()).toBe('none');
      }
      const containMatch = decl.match(/(?:^|[;\s])contain\s*:\s*([^;]+)/i);
      if (containMatch) {
        expect(containMatch[1].trim()).toBe('none');
      }
      const willChangeMatch = decl.match(/(?:^|[;\s])will-change\s*:\s*([^;]+)/i);
      if (willChangeMatch) {
        expect(willChangeMatch[1].trim()).toBe('auto');
      }
      expect(decl).not.toMatch(/isolation\s*:\s*isolate/i);
      expect(decl).not.toMatch(/view-transition-name\s*:/i);
      const opacityMatch = decl.match(/(?:^|[;\s])opacity\s*:\s*([0-9.]+)/i);
      if (opacityMatch) {
        expect(Number(opacityMatch[1])).toBeGreaterThanOrEqual(1);
      }
    }

    const tokenRules = parseLeafCssRules(tokensCss);
    const vtDisallowed = tokenRules.filter(
      (rule) =>
        /view-transition-name\s*:\s*(?!none\b)/i.test(rule.declarations) &&
        /(?:\bbody\b|\.rj-dashboard(?:\s|,|$|\[)|\.rj-dashboard-body\b)/.test(rule.selector),
    );
    expect(vtDisallowed).toEqual([]);
  });

  it('maintains the full .rj-sidebar and .rj-sidebar-backdrop cascade across desktop and mobile rules', () => {
    const identityCss = readCss(IDENTITY_CSS_PATH);
    const rules = parseLeafCssRules(identityCss);

    const exactSidebarRules = rules.filter((rule) =>
      rule.selector
        .split(',')
        .map((s) => s.trim())
        .includes('.rj-sidebar'),
    );
    const desktopSidebar = exactSidebarRules.find((r) => r.atContext.length === 0);
    expect(desktopSidebar).toBeDefined();
    expect(desktopSidebar!.declarations).toMatch(/background\s*:\s*var\(--rj-color-sidebar-bg\)/);
    expect(desktopSidebar!.declarations).toMatch(/z-index\s*:\s*var\(--rj-z-sticky\)/);

    const mobileSidebar = exactSidebarRules.find((r) =>
      r.atContext.some((ctx) => /max-width\s*:\s*767px/.test(ctx)),
    );
    expect(mobileSidebar).toBeDefined();
    expect(mobileSidebar!.declarations).toMatch(/position\s*:\s*fixed/);
    expect(mobileSidebar!.declarations).toMatch(/z-index\s*:\s*var\(--rj-z-drawer\)/);
    expect(mobileSidebar!.declarations).toMatch(/overflow-y\s*:\s*auto/);

    const mobileBackdrop = rules.find(
      (rule) =>
        rule.selector
          .split(',')
          .map((s) => s.trim())
          .includes('.rj-sidebar-backdrop') &&
        rule.atContext.some((ctx) => /max-width\s*:\s*767px/.test(ctx)),
    );
    expect(mobileBackdrop).toBeDefined();
    expect(mobileBackdrop!.declarations).toMatch(/display\s*:\s*block/);
    expect(mobileBackdrop!.declarations).toMatch(/position\s*:\s*fixed/);
    expect(mobileBackdrop!.declarations).toMatch(/z-index\s*:\s*var\(--rj-z-drawer-backdrop\)/);
    expect(mobileBackdrop!.declarations).toMatch(/background\s*:\s*var\(--rj-color-surface-overlay\)/);

    for (const rule of exactSidebarRules) {
      expect(rule.declarations).not.toMatch(/background\s*:\s*transparent/i);
      const opacityMatch = rule.declarations.match(/(?:^|[;\s])opacity\s*:\s*([0-9.]+)/i);
      if (opacityMatch) {
        expect(Number(opacityMatch[1])).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('uses semantic --rj-z-* tokens (zero raw z-index or --rj-primitive-z-*) in overlay/shell CSS selectors', () => {
    const identityCss = readCss(IDENTITY_CSS_PATH);
    const recruitmentCss = readCss(RECRUITMENT_CSS_PATH);
    const selectCss = readCss(SELECT_CSS_PATH);

    const checks: Array<{ name: string; block: string; expectedToken: string }> = [
      {
        name: 'identity.css .rj-skip-link',
        block: extractRuleBlock(identityCss, /\.rj-skip-link\s*\{[^}]*\}/),
        expectedToken: 'var(--rj-z-skip-link)',
      },
      {
        name: 'identity.css .rj-dashboard-nav',
        block: extractRuleBlock(identityCss, /\.rj-dashboard-nav\s*\{[^}]*\}/),
        expectedToken: 'var(--rj-z-sticky)',
      },
      {
        name: 'identity.css desktop .rj-sidebar',
        block: extractRuleBlock(identityCss, /\.rj-sidebar\s*\{\s*position:\s*sticky;[^}]*\}/),
        expectedToken: 'var(--rj-z-sticky)',
      },
      {
        name: 'identity.css .rj-sidebar-tooltip, .rj-control-tooltip',
        block: extractRuleBlock(
          identityCss,
          /\.rj-sidebar-tooltip,\s*\.rj-control-tooltip\s*\{[^}]*\}/,
        ),
        expectedToken: 'var(--rj-z-popover)',
      },
      {
        name: 'identity.css mobile .rj-sidebar-backdrop',
        block: extractRuleBlock(
          identityCss,
          /\.rj-sidebar-backdrop\s*\{\s*display:\s*block;[^}]*\}/,
        ),
        expectedToken: 'var(--rj-z-drawer-backdrop)',
      },
      {
        name: 'identity.css mobile .rj-sidebar',
        block: extractRuleBlock(
          identityCss,
          /\.rj-sidebar\s*\{\s*position:\s*fixed;[^}]*\}/,
        ),
        expectedToken: 'var(--rj-z-drawer)',
      },
      {
        name: 'recruitment.css .rec-dialog-backdrop',
        block: extractRuleBlock(recruitmentCss, /\.rec-dialog-backdrop\s*\{[^}]*\}/),
        expectedToken: 'var(--rj-z-modal-backdrop)',
      },
      {
        name: 'recruitment.css .rec-dialog',
        block: extractRuleBlock(recruitmentCss, /\.rec-dialog\s*\{[^}]*\}/),
        expectedToken: 'var(--rj-z-modal)',
      },
      {
        name: 'Select.css .rj-select-listbox',
        block: extractRuleBlock(selectCss, /\.rj-select-listbox\s*\{[^}]*\}/),
        expectedToken: 'var(--rj-z-popover)',
      },
    ];

    for (const check of checks) {
      expect(check.block, `Could not locate CSS rule for ${check.name}`).not.toBe('');
      const zMatch = check.block.match(/z-index\s*:\s*([^;]+);/);
      expect(zMatch, `Missing z-index in ${check.name}`).not.toBeNull();
      expect(zMatch![1].trim(), `${check.name} must use ${check.expectedToken}`).toBe(
        check.expectedToken,
      );
      expect(check.block).not.toMatch(/--rj-primitive-z-/);
    }

    // Verify Select popover stacks strictly above modal dialog
    const tokensCss = readCss(DESIGN_TOKENS_PATH);
    const scale = resolveZTokenScale(tokensCss);
    expect(scale['--rj-z-popover']).toBeGreaterThan(scale['--rj-z-modal']);
  });

  it('includes mobile/iOS overscroll and touch-action hardening on backdrops and drawers/modals', () => {
    const identityCss = readCss(IDENTITY_CSS_PATH);
    const recruitmentCss = readCss(RECRUITMENT_CSS_PATH);

    const drawerBackdrop = extractRuleBlock(
      identityCss,
      /\.rj-sidebar-backdrop\s*\{\s*display:\s*block;[^}]*\}/,
    );
    const drawerPanel = extractRuleBlock(identityCss, /\.rj-sidebar\s*\{\s*position:\s*fixed;[^}]*\}/);
    const modalBackdrop = extractRuleBlock(recruitmentCss, /\.rec-dialog-backdrop\s*\{[^}]*\}/);
    const modalPanel = extractRuleBlock(recruitmentCss, /\.rec-dialog\s*\{[^}]*\}/);

    expect(drawerBackdrop).toMatch(/overscroll-behavior\s*:\s*contain\s*;/);
    expect(drawerBackdrop).toMatch(/touch-action\s*:\s*none\s*;/);
    expect(drawerPanel).toMatch(/overscroll-behavior\s*:\s*contain\s*;/);

    expect(modalBackdrop).toMatch(/overscroll-behavior\s*:\s*contain\s*;/);
    expect(modalBackdrop).toMatch(/touch-action\s*:\s*none\s*;/);
    expect(modalPanel).toMatch(/overscroll-behavior\s*:\s*contain\s*;/);
  });

  it('forbids document.body.style.overflow or document.documentElement.style.overflow in non-test source files', () => {
    const files = collectNonTestTsFiles(SRC_ROOT);
    const offenders: string[] = [];
    for (const file of files) {
      const raw = fs.readFileSync(file, 'utf8');
      const codeOnly = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      if (
        /document\.body\.style\.overflow/.test(codeOnly) ||
        /document\.documentElement\.style\.overflow/.test(codeOnly)
      ) {
        offenders.push(path.relative(SRC_ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
