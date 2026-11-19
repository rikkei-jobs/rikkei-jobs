import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Select } from './Select';

function mockBoundingClientRect(element: HTMLElement, rect: Partial<DOMRect>): void {
  const fullRect: DOMRect = {
    x: rect.left ?? 0,
    y: rect.top ?? 0,
    width: rect.width ?? 0,
    height: rect.height ?? 0,
    top: rect.top ?? 0,
    right: rect.right ?? (rect.left ?? 0) + (rect.width ?? 0),
    bottom: rect.bottom ?? (rect.top ?? 0) + (rect.height ?? 0),
    left: rect.left ?? 0,
    toJSON: () => ({}),
  };
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(fullRect);
}

describe('Select', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Ref, focus delegation, FormData & hidden select sync', () => {
    it('forwards ref to hidden native select and delegates focus() to combobox trigger', () => {
      const ref = createRef<HTMLSelectElement>();
      render(
        <Select ref={ref} label="Quy mô nhân sự">
          <option value="1-50">1 - 50 nhân sự</option>
        </Select>,
      );

      expect(ref.current).toBeInstanceOf(HTMLSelectElement);
      expect(ref.current).toHaveAttribute('aria-hidden', 'true');
      expect(ref.current).toHaveAttribute('tabindex', '-1');

      const combobox = screen.getByRole('combobox', { name: 'Quy mô nhân sự' });
      ref.current?.focus();
      expect(combobox).toHaveFocus();
      expect(ref.current).not.toHaveFocus();
    });

    it('syncs FormData, ref value, and ChangeEvent<HTMLSelectElement> on selection', () => {
      const ref = createRef<HTMLSelectElement>();
      const handleChange = vi.fn();

      const { container } = render(
        <form>
          <Select
            ref={ref}
            id="size-form"
            name="size"
            label="Quy mô nhân sự"
            defaultValue="51-200"
            onChange={handleChange}
          >
            <option value="1-50">1 - 50 nhân sự</option>
            <option value="51-200">51 - 200 nhân sự</option>
            <option value="1000+">1000+ nhân sự</option>
          </Select>
        </form>,
      );

      const form = container.querySelector('form');
      expect(form).not.toBeNull();
      expect(new FormData(form as HTMLFormElement).get('size')).toBe('51-200');
      expect(ref.current?.value).toBe('51-200');

      const combobox = screen.getByRole('combobox', { name: 'Quy mô nhân sự' });
      fireEvent.click(combobox);
      fireEvent.click(screen.getByRole('option', { name: '1000+ nhân sự' }));

      expect(handleChange).toHaveBeenCalledTimes(1);
      const changeEvent = handleChange.mock.calls[0]?.[0] as React.ChangeEvent<HTMLSelectElement>;
      expect(changeEvent.target).toBe(ref.current);
      expect(changeEvent.target.value).toBe('1000+');
      expect(ref.current?.value).toBe('1000+');
      expect(new FormData(form as HTMLFormElement).get('size')).toBe('1000+');
    });
  });

  describe('Label, ID, labelAction, aria-describedby, aria-invalid, required & disabled', () => {
    it('associates label via generated id, respects explicit id, and renders labelAction', () => {
      const { rerender } = render(
        <Select label="Ngành nghề">
          <option value="it">CNTT</option>
        </Select>,
      );

      const autoCombobox = screen.getByLabelText('Ngành nghề');
      expect(autoCombobox.tagName).toBe('BUTTON');
      expect(autoCombobox).toHaveAttribute('role', 'combobox');
      expect(autoCombobox.id).toBeTruthy();

      rerender(
        <Select id="custom-select" label="Ngành nghề" labelAction={<a href="#info">Chi tiết</a>}>
          <option value="it">CNTT</option>
        </Select>,
      );

      const explicitCombobox = screen.getByLabelText('Ngành nghề');
      expect(explicitCombobox).toHaveAttribute('id', 'custom-select');
      expect(explicitCombobox).toHaveAttribute('role', 'combobox');
      expect(screen.getByRole('link', { name: 'Chi tiết' })).toBeInTheDocument();
    });

    it('supports required and disabled states on both trigger and hidden select', () => {
      const ref = createRef<HTMLSelectElement>();
      render(
        <Select
          ref={ref}
          id="position-select"
          label="Vị trí mục tiêu"
          placeholder="-- Chọn vị trí --"
          required
          disabled
          defaultValue=""
        >
          <option value="java">Java Backend</option>
        </Select>,
      );

      const combobox = screen.getByLabelText(/Vị trí mục tiêu/i);
      expect(combobox).toBeRequired();
      expect(combobox).toHaveAttribute('aria-required', 'true');
      expect(combobox).toBeDisabled();
      expect(ref.current).toBeDisabled();

      const requiredMark = document.querySelector('.rj-select-required');
      expect(requiredMark).toHaveAttribute('aria-hidden', 'true');

      fireEvent.click(combobox);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

      fireEvent.keyDown(combobox, { key: 'Enter' });
      fireEvent.keyDown(combobox, { key: ' ' });
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('composes aria-describedby from caller, hint, and error and derives aria-invalid', () => {
      render(
        <Select
          id="size-select"
          label="Quy mô"
          hint="Chọn quy mô hiện tại"
          error="Vui lòng chọn quy mô"
          aria-describedby="external-note"
        >
          <option value="1-50">1 - 50</option>
        </Select>,
      );

      const combobox = screen.getByLabelText('Quy mô');
      expect(combobox).toHaveAttribute('aria-invalid', 'true');
      expect(combobox).toHaveAttribute(
        'aria-describedby',
        'external-note size-select-hint size-select-error',
      );

      const hintEl = document.getElementById('size-select-hint');
      const errorEl = document.getElementById('size-select-error');
      expect(hintEl).toHaveTextContent('Chọn quy mô hiện tại');
      expect(errorEl).toHaveTextContent('Vui lòng chọn quy mô');
      expect(errorEl).toHaveAttribute('aria-live', 'polite');
      expect(errorEl).not.toHaveAttribute('role', 'alert');
    });

    it('allows explicit aria-invalid override when error is absent', () => {
      render(
        <Select id="override-select" label="Trạng thái" aria-invalid="true">
          <option value="active">Hoạt động</option>
        </Select>,
      );

      expect(screen.getByLabelText('Trạng thái')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('WAI-ARIA APG attributes (closed vs open) & Icon usage', () => {
    it('sets proper closed and open ARIA attributes, Portal listbox, check Icon, disabled option, and optgroup', () => {
      const { container } = render(
        <Select id="apg-select" label="Nhóm lựa chọn" defaultValue="java">
          <optgroup label="Backend">
            <option value="java">Java</option>
            <option value="go" disabled>
              Go (Bảo trì)
            </option>
          </optgroup>
          <optgroup label="Frontend">
            <option value="react">React</option>
          </optgroup>
        </Select>,
      );

      const combobox = screen.getByRole('combobox', { name: 'Nhóm lựa chọn' });
      expect(combobox).toHaveAttribute('aria-haspopup', 'listbox');
      expect(combobox).toHaveAttribute('aria-expanded', 'false');
      expect(combobox).not.toHaveAttribute('aria-controls');
      expect(combobox).not.toHaveAttribute('aria-activedescendant');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

      const chevronContainer = container.querySelector('.rj-select-chevron');
      expect(chevronContainer).toHaveAttribute('aria-hidden', 'true');
      const chevronSvg = chevronContainer?.querySelector('svg');
      expect(chevronSvg).toHaveAttribute('aria-hidden', 'true');
      expect(chevronSvg).toHaveAttribute('viewBox', '0 0 24 24');

      fireEvent.click(combobox);

      const listbox = screen.getByRole('listbox');
      expect(listbox.parentElement).toBe(document.body);
      expect(combobox).toHaveAttribute('aria-expanded', 'true');
      expect(combobox).toHaveAttribute('aria-controls', listbox.id);

      const groups = within(listbox).getAllByRole('group');
      expect(groups).toHaveLength(2);
      expect(groups[0]).toHaveAccessibleName('Backend');
      expect(groups[1]).toHaveAccessibleName('Frontend');

      const javaOption = screen.getByRole('option', { name: 'Java' });
      const goOption = screen.getByRole('option', { name: 'Go (Bảo trì)' });
      const reactOption = screen.getByRole('option', { name: 'React' });

      expect(javaOption).toHaveAttribute('aria-selected', 'true');
      expect(combobox).toHaveAttribute('aria-activedescendant', javaOption.id);
      expect(goOption).toHaveAttribute('aria-selected', 'false');
      expect(goOption).toHaveAttribute('aria-disabled', 'true');
      expect(reactOption).toHaveAttribute('aria-selected', 'false');

      const checkIcon = javaOption.querySelector('.rj-select-option-check svg');
      expect(checkIcon).toBeInTheDocument();
      expect(checkIcon).toHaveAttribute('aria-hidden', 'true');
      expect(reactOption.querySelector('.rj-select-option-check')).not.toBeInTheDocument();
    });
  });

  describe('Mouse open/close, disabled option & click outside', () => {
    it('toggles listbox on trigger click, selects enabled option, ignores disabled option, and closes on outside mousedown', () => {
      const handleChange = vi.fn();
      render(
        <div>
          <Select id="mouse-select" label="Vai trò" defaultValue="candidate" onChange={handleChange}>
            <option value="candidate">Ứng viên</option>
            <option value="locked" disabled>
              Đã khóa
            </option>
            <option value="hr">HR</option>
          </Select>
          <button type="button">Outside target</button>
        </div>,
      );

      const combobox = screen.getByRole('combobox', { name: 'Vai trò' });
      fireEvent.click(combobox);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.click(combobox);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

      fireEvent.click(combobox);
      const disabledOption = screen.getByRole('option', { name: 'Đã khóa' });
      fireEvent.click(disabledOption);
      expect(handleChange).not.toHaveBeenCalled();
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(combobox).toHaveTextContent('Ứng viên');

      fireEvent.click(screen.getByRole('option', { name: 'HR' }));
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(combobox).toHaveTextContent('HR');
      expect(combobox).toHaveFocus();

      fireEvent.click(combobox);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside target' }));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Full WAI-ARIA APG keyboard navigation', () => {
    it('opens via Enter, Space, ArrowDown, ArrowUp and navigates skipping disabled options, Home/End, Enter/Space select', () => {
      const handleChange = vi.fn();
      render(
        <Select id="kb-select" label="Kỹ năng" placeholder="Chọn kỹ năng" onChange={handleChange}>
          <option value="java">Java</option>
          <option value="cobol" disabled>
            COBOL
          </option>
          <option value="react">React</option>
          <option value="rust" disabled>
            Rust
          </option>
          <option value="ts">TypeScript</option>
        </Select>,
      );

      const combobox = screen.getByRole('combobox', { name: 'Kỹ năng' });
      combobox.focus();

      fireEvent.keyDown(combobox, { key: 'Enter' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Chọn kỹ năng' }).id,
      );

      fireEvent.keyDown(combobox, { key: 'Escape' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(combobox).toHaveFocus();

      fireEvent.keyDown(combobox, { key: ' ' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Java' }).id,
      );

      // Skips disabled COBOL
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'React' }).id,
      );

      // Skips disabled Rust
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'TypeScript' }).id,
      );

      // ArrowUp skips disabled Rust back to React
      fireEvent.keyDown(combobox, { key: 'ArrowUp' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'React' }).id,
      );

      // End -> last enabled (TypeScript), Home -> first enabled (placeholder)
      fireEvent.keyDown(combobox, { key: 'End' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'TypeScript' }).id,
      );

      fireEvent.keyDown(combobox, { key: 'Home' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Chọn kỹ năng' }).id,
      );

      fireEvent.keyDown(combobox, { key: 'End' });
      fireEvent.keyDown(combobox, { key: 'Enter' });

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(combobox).toHaveFocus();
      expect(combobox).toHaveTextContent('TypeScript');
      expect(handleChange).toHaveBeenCalledTimes(1);

      // Closed ArrowUp opens with current selected or last enabled option active; Space selects
      fireEvent.keyDown(combobox, { key: 'ArrowUp' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      fireEvent.keyDown(combobox, { key: 'ArrowUp' });
      fireEvent.keyDown(combobox, { key: ' ' });
      expect(combobox).toHaveTextContent('React');
      expect(combobox).toHaveFocus();
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('Escape preserves previous value and restores focus; Tab closes without preventing default', () => {
      const handleChange = vi.fn();
      render(
        <div>
          <Select id="esc-tab" label="Trạng thái" defaultValue="active" onChange={handleChange}>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Đã khóa</option>
          </Select>
          <button type="button">Next control</button>
        </div>,
      );

      const combobox = screen.getByRole('combobox', { name: 'Trạng thái' });
      combobox.focus();

      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Đã khóa' }).id,
      );

      fireEvent.keyDown(combobox, { key: 'Escape' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(combobox).toHaveTextContent('Đang hoạt động');
      expect(handleChange).not.toHaveBeenCalled();
      expect(combobox).toHaveFocus();

      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      const tabNotPrevented = fireEvent.keyDown(combobox, { key: 'Tab' });
      expect(tabNotPrevented).toBe(true);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(combobox).toHaveTextContent('Đang hoạt động');
    });

    it('ignores synthetic click (detail: 0) immediately following Enter or Space while allowing genuine mouseDown + click', () => {
      render(
        <Select id="synth-click-select" label="Kỹ năng" defaultValue="java">
          <option value="java">Java</option>
          <option value="react">React</option>
          <option value="ts">TypeScript</option>
        </Select>,
      );

      const combobox = screen.getByRole('combobox', { name: 'Kỹ năng' });
      combobox.focus();

      // Enter open + synthetic browser click (detail: 0) keeps listbox open
      fireEvent.keyDown(combobox, { key: 'Enter' });
      fireEvent.click(combobox, { detail: 0 });
      expect(combobox).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // ArrowDown -> Enter select + synthetic browser click (detail: 0) keeps listbox closed & commits
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      fireEvent.keyDown(combobox, { key: 'Enter' });
      fireEvent.click(combobox, { detail: 0 });
      expect(combobox).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(combobox).toHaveTextContent('React');

      // Space open + synthetic browser click (detail: 0) keeps listbox open
      fireEvent.keyDown(combobox, { key: ' ' });
      fireEvent.click(combobox, { detail: 0 });
      expect(combobox).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // ArrowDown -> Space select + synthetic browser click (detail: 0) keeps listbox closed & commits
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      fireEvent.keyDown(combobox, { key: ' ' });
      fireEvent.click(combobox, { detail: 0 });
      expect(combobox).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(combobox).toHaveTextContent('TypeScript');

      // Genuine pointer mouseDown + click immediately after Enter still toggles normally
      fireEvent.keyDown(combobox, { key: 'Enter' });
      expect(combobox).toHaveAttribute('aria-expanded', 'true');
      fireEvent.mouseDown(combobox);
      fireEvent.click(combobox, { detail: 1 });
      expect(combobox).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Type-ahead search (~500ms, case-insensitive & Vietnamese)', () => {
    it('matches prefixes case-insensitively and Vietnamese diacritics, skipping disabled options, and resets buffer after 500ms', () => {
      vi.useFakeTimers();

      render(
        <Select id="typeahead-select" label="Chức danh" defaultValue="java">
          <option value="java">Java Backend</option>
          <option value="disabled-js" disabled>
            JavaScript Disabled
          </option>
          <option value="job-ops">Job Operations</option>
          <option value="python">Python Data</option>
          <option value="ung-vien">Ứng viên</option>
        </Select>,
      );

      const combobox = screen.getByRole('combobox', { name: 'Chức danh' });
      fireEvent.keyDown(combobox, { key: 'Enter' });

      // Typing 'j' + 'o' within 500ms moves from Java Backend -> Job Operations
      fireEvent.keyDown(combobox, { key: 'j' });
      fireEvent.keyDown(combobox, { key: 'o' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Job Operations' }).id,
      );

      // Advance past 500ms reset window, then type 'p' -> Python Data
      vi.advanceTimersByTime(600);
      fireEvent.keyDown(combobox, { key: 'p' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Python Data' }).id,
      );

      // Advance past 500ms, then type Vietnamese folded 'u' -> Ứng viên
      vi.advanceTimersByTime(600);
      fireEvent.keyDown(combobox, { key: 'u' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Ứng viên' }).id,
      );
    });

    it('cycles through matching options on repeated single-char keys (< 500ms), including mixed case and Vietnamese đ, while preserving multi-char and multi-word queries', () => {
      vi.useFakeTimers();

      render(
        <Select id="repeat-ta-select" label="Khu vực & Công nghệ" defaultValue="java">
          <option value="java">Java Backend</option>
          <option value="job-ops">Job Operations</option>
          <option value="jira">Jira Tracker</option>
          <option value="python">Python Data</option>
          <option value="da-nang">Đà Nẵng</option>
          <option value="dak-lak">Đắk Lắk</option>
        </Select>,
      );

      const combobox = screen.getByRole('combobox', { name: 'Khu vực & Công nghệ' });
      fireEvent.keyDown(combobox, { key: 'Enter' });

      // Repeated 'j' within < 500ms cycles Java Backend -> Job Operations -> Jira Tracker -> Java Backend
      fireEvent.keyDown(combobox, { key: 'j' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Job Operations' }).id,
      );

      vi.advanceTimersByTime(100);
      fireEvent.keyDown(combobox, { key: 'j' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Jira Tracker' }).id,
      );

      vi.advanceTimersByTime(100);
      fireEvent.keyDown(combobox, { key: 'j' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Java Backend' }).id,
      );

      // Mixed case 'J' then 'j' within < 500ms also cycles
      vi.advanceTimersByTime(600);
      fireEvent.keyDown(combobox, { key: 'J' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Job Operations' }).id,
      );
      vi.advanceTimersByTime(100);
      fireEvent.keyDown(combobox, { key: 'j' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Jira Tracker' }).id,
      );

      // Repeated Vietnamese 'đ' within < 500ms cycles Đà Nẵng <-> Đắk Lắk
      vi.advanceTimersByTime(600);
      fireEvent.keyDown(combobox, { key: 'đ' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Đà Nẵng' }).id,
      );
      vi.advanceTimersByTime(100);
      fireEvent.keyDown(combobox, { key: 'đ' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Đắk Lắk' }).id,
      );

      // Multi-word query with space within < 500ms still matches 'Java Backend' without closing
      vi.advanceTimersByTime(600);
      for (const ch of ['j', 'a', 'v', 'a', ' ', 'b']) {
        fireEvent.keyDown(combobox, { key: ch });
      }
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Java Backend' }).id,
      );
    });

    it('matches genuine repeated-letter prefix (ll -> Llama) before single-char cycling fallback', () => {
      vi.useFakeTimers();

      render(
        <Select id="double-letter-ta" label="Nền tảng" defaultValue="linux">
          <option value="linux">Linux</option>
          <option value="logs">Logs</option>
          <option value="lambda">Lambda</option>
          <option value="llama">Llama</option>
        </Select>,
      );

      const combobox = screen.getByRole('combobox', { name: 'Nền tảng' });
      fireEvent.keyDown(combobox, { key: 'Enter' });

      fireEvent.keyDown(combobox, { key: 'l' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Logs' }).id,
      );

      vi.advanceTimersByTime(100);
      fireEvent.keyDown(combobox, { key: 'l' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Llama' }).id,
      );
    });

    it('clears type-ahead buffer on ArrowDown/ArrowUp/Home/End so Space commits the navigated option and closes', () => {
      vi.useFakeTimers();
      const handleChange = vi.fn();

      render(
        <Select id="arrow-space-select" label="Ngôn ngữ" defaultValue="alpha" onChange={handleChange}>
          <option value="alpha">Alpha</option>
          <option value="java">Java</option>
          <option value="python">Python</option>
          <option value="rust">Rust</option>
        </Select>,
      );

      const combobox = screen.getByRole('combobox', { name: 'Ngôn ngữ' });
      fireEvent.keyDown(combobox, { key: 'Enter' });

      // Type 'j' -> ArrowDown to Python -> Space within < 500ms commits Python and closes
      fireEvent.keyDown(combobox, { key: 'j' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Java' }).id,
      );
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      expect(combobox).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('option', { name: 'Python' }).id,
      );
      fireEvent.keyDown(combobox, { key: ' ' });

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(combobox).toHaveTextContent('Python');
      expect(handleChange).toHaveBeenCalledTimes(1);

      // Verify ArrowUp, Home, and End also clear type-ahead before Space
      fireEvent.keyDown(combobox, { key: 'Enter' });
      fireEvent.keyDown(combobox, { key: 'p' });
      fireEvent.keyDown(combobox, { key: 'ArrowUp' });
      fireEvent.keyDown(combobox, { key: ' ' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(combobox).toHaveTextContent('Java');

      fireEvent.keyDown(combobox, { key: 'Enter' });
      fireEvent.keyDown(combobox, { key: 'p' });
      fireEvent.keyDown(combobox, { key: 'Home' });
      fireEvent.keyDown(combobox, { key: ' ' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(combobox).toHaveTextContent('Alpha');

      fireEvent.keyDown(combobox, { key: 'Enter' });
      fireEvent.keyDown(combobox, { key: 'a' });
      fireEvent.keyDown(combobox, { key: 'End' });
      fireEvent.keyDown(combobox, { key: ' ' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(combobox).toHaveTextContent('Rust');
    });
  });

  describe('Controlled, uncontrolled, numeric values & unknown value fallback', () => {
    it('supports controlled mode without mutating state unless parent updates value', () => {
      function ControlledWrapper() {
        const [val, setVal] = useState('a');
        return (
          <Select id="ctrl" label="Controlled" value={val} onChange={(e) => setVal(e.target.value)}>
            <option value="a">Alpha</option>
            <option value="b">Beta</option>
          </Select>
        );
      }

      const spyNoOp = vi.fn();
      const { rerender } = render(
        <Select id="frozen" label="Frozen" value="a" onChange={spyNoOp}>
          <option value="a">Alpha</option>
          <option value="b">Beta</option>
        </Select>,
      );

      const frozenBox = screen.getByRole('combobox', { name: 'Frozen' });
      fireEvent.click(frozenBox);
      fireEvent.click(screen.getByRole('option', { name: 'Beta' }));
      expect(spyNoOp).toHaveBeenCalledTimes(1);
      expect(frozenBox).toHaveTextContent('Alpha');

      rerender(<ControlledWrapper />);
      const ctrlBox = screen.getByRole('combobox', { name: 'Controlled' });
      expect(ctrlBox).toHaveTextContent('Alpha');
      fireEvent.click(ctrlBox);
      fireEvent.click(screen.getByRole('option', { name: 'Beta' }));
      expect(ctrlBox).toHaveTextContent('Beta');
    });

    it('keeps controlled hidden select ref.current.value and FormData synced after option click and Enter selection', () => {
      const ref = createRef<HTMLSelectElement>();

      function ControlledForm() {
        const [val, setVal] = useState('');
        return (
          <form>
            <Select
              ref={ref}
              id="ctrl-form-select"
              name="size"
              label="Quy mô nhân sự"
              placeholder="-- Chọn quy mô --"
              value={val}
              onChange={(e) => setVal(e.target.value)}
            >
              <option value="1-50">1 - 50 nhân sự</option>
              <option value="51-200">51 - 200 nhân sự</option>
              <option value="201-1000">201 - 1.000 nhân sự</option>
            </Select>
          </form>
        );
      }

      const { container } = render(<ControlledForm />);
      const form = container.querySelector('form') as HTMLFormElement;
      const combobox = screen.getByRole('combobox', { name: 'Quy mô nhân sự' });

      expect(ref.current?.value).toBe('');
      expect(new FormData(form).get('size')).toBe('');

      // Click option selection
      fireEvent.click(combobox);
      fireEvent.click(screen.getByRole('option', { name: '51 - 200 nhân sự' }));
      expect(combobox).toHaveTextContent('51 - 200 nhân sự');
      expect(ref.current?.value).toBe('51-200');
      expect(new FormData(form).get('size')).toBe('51-200');

      // Keyboard Enter selection
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      fireEvent.keyDown(combobox, { key: 'Enter' });
      expect(combobox).toHaveTextContent('201 - 1.000 nhân sự');
      expect(ref.current?.value).toBe('201-1000');
      expect(new FormData(form).get('size')).toBe('201-1000');
    });

    it('matches numeric values (GapAnalysisSection pattern) and handles unknown values gracefully without calling onChange', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <Select
          id="num-select"
          label="Vị trí"
          placeholder="Chọn vị trí"
          value={2}
          onChange={handleChange}
        >
          <option value={1}>Java Backend Fresher</option>
          <option value={2}>Frontend ReactJS Fresher</option>
        </Select>,
      );

      const combobox = screen.getByRole('combobox', { name: 'Vị trí' });
      expect(combobox).toHaveTextContent('Frontend ReactJS Fresher');

      rerender(
        <Select
          id="num-select"
          label="Vị trí"
          placeholder="-- Chọn quy mô --"
          value="invalid-size"
          onChange={handleChange}
        >
          <option value="1-50">1 - 50</option>
          <option value="51-200">51 - 200</option>
        </Select>,
      );

      expect(handleChange).not.toHaveBeenCalled();
      expect(combobox).toHaveTextContent('-- Chọn quy mô --');
      expect(combobox).toHaveClass('is-placeholder');
    });

    it('keeps aria-activedescendant pointing to a valid DOM option when children shrink while open', () => {
      const { rerender } = render(
        <Select id="dynamic-select" label="Danh sách động" defaultValue="c">
          <option value="a">Mục 1</option>
          <option value="b">Mục 2</option>
          <option value="c">Mục 3</option>
        </Select>,
      );

      const combobox = screen.getByRole('combobox', { name: 'Danh sách động' });
      fireEvent.click(combobox);
      expect(combobox).toHaveAttribute('aria-activedescendant', 'dynamic-select-option-2');
      expect(document.getElementById('dynamic-select-option-2')).not.toBeNull();

      rerender(
        <Select id="dynamic-select" label="Danh sách động" defaultValue="c">
          <option value="a">Mục 1</option>
        </Select>,
      );

      const activeId = combobox.getAttribute('aria-activedescendant');
      if (activeId !== null) {
        expect(document.getElementById(activeId)).not.toBeNull();
      }
      expect(activeId).toBe('dynamic-select-option-0');
    });

    it('resets uncontrolled trigger display and FormData when enclosing form resets', () => {
      const { container } = render(
        <form>
          <Select id="reset-select" name="role" label="Vai trò" defaultValue="hr">
            <option value="hr">HR</option>
            <option value="mentor">Mentor</option>
          </Select>
        </form>,
      );

      const form = container.querySelector('form') as HTMLFormElement;
      const combobox = screen.getByRole('combobox', { name: 'Vai trò' });
      expect(combobox).toHaveTextContent('HR');

      fireEvent.click(combobox);
      fireEvent.click(screen.getByRole('option', { name: 'Mentor' }));
      expect(combobox).toHaveTextContent('Mentor');
      expect(new FormData(form).get('role')).toBe('mentor');

      act(() => {
        form.reset();
      });

      expect(combobox).toHaveTextContent('HR');
      expect(new FormData(form).get('role')).toBe('hr');
    });
  });

  describe('Portal positioning, flip-up, 375px clamp & scroll/resize', () => {
    it('flips upward when near viewport bottom and clamps width/left within 375px viewport', () => {
      vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(600);
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375);
      vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(375);
      vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(600);

      render(
        <Select id="pos-select" label="Kích thước" defaultValue="1-50">
          <option value="1-50">1 - 50</option>
          <option value="51-200">51 - 200</option>
        </Select>,
      );

      const combobox = screen.getByRole('combobox', { name: 'Kích thước' });
      mockBoundingClientRect(combobox, {
        top: 520,
        bottom: 564,
        left: 2,
        right: 402,
        width: 400,
        height: 44,
      });

      fireEvent.click(combobox);

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('data-placement', 'top');
      expect(parseFloat(listbox.style.left)).toBeGreaterThanOrEqual(8);
      expect(parseFloat(listbox.style.width)).toBeLessThanOrEqual(359);
      expect(listbox.style.bottom).toBe('84px');
      expect(parseFloat(listbox.style.maxHeight)).toBeLessThanOrEqual(280);
    });

    it('keeps open on internal listbox scroll, updates on window resize, and closes on ancestor scroll', () => {
      vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
      vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1200);
      vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(800);

      const { container } = render(
        <div data-testid="scroll-ancestor">
          <Select id="scroll-select" label="Danh mục" defaultValue="a">
            <option value="a">Mục A</option>
            <option value="b">Mục B</option>
          </Select>
        </div>,
      );

      const combobox = screen.getByRole('combobox', { name: 'Danh mục' });
      mockBoundingClientRect(combobox, {
        top: 120,
        bottom: 164,
        left: 40,
        right: 340,
        width: 300,
        height: 44,
      });

      fireEvent.click(combobox);
      const listbox = screen.getByRole('listbox');
      expect(listbox.style.top).toBe('168px');

      // Internal listbox scroll keeps panel open
      fireEvent.scroll(listbox);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Window resize recalculates coordinates
      mockBoundingClientRect(combobox, {
        top: 200,
        bottom: 244,
        left: 60,
        right: 360,
        width: 300,
        height: 44,
      });
      fireEvent.resize(window);
      expect(screen.getByRole('listbox').style.top).toBe('248px');

      // Ancestor container scroll closes listbox cleanly
      const ancestor = container.querySelector('[data-testid="scroll-ancestor"]') as HTMLElement;
      fireEvent.scroll(ancestor);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
