import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import './Select.css';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  labelAction?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  placeholder?: string;
  wrapperClassName?: string;
  required?: boolean;
  disabled?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: React.AriaAttributes['aria-invalid'];
  className?: string;
  children?: React.ReactNode;
}

interface ParsedOption {
  readonly index: number;
  readonly value: string;
  readonly label: string;
  readonly disabled: boolean;
  readonly isPlaceholder: boolean;
}

interface ParsedGroup {
  readonly index: number;
  readonly label: string;
  readonly options: readonly ParsedOption[];
}

type RenderEntry =
  | { readonly kind: 'option'; readonly option: ParsedOption }
  | { readonly kind: 'group'; readonly group: ParsedGroup };

interface ListboxPosition {
  readonly placement: 'top' | 'bottom';
  readonly left: number;
  readonly width?: number;
  readonly top?: number;
  readonly bottom?: number;
  readonly maxHeight: number;
}

const VIEWPORT_PADDING = 8;
const PANEL_GAP = 4;
const MAX_PANEL_HEIGHT = 280;
const MIN_SPACE_BELOW = 200;
const TYPEAHEAD_RESET_MS = 500;
const KEYBOARD_CLICK_SUPPRESS_MS = 50;

function normalizeSelectValue(value: string | number | readonly string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] !== undefined ? String(value[0]) : '';
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

function extractTextContent(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((item) => extractTextContent(item)).join('');
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractTextContent(node.props.children);
  }
  return '';
}

function parseSelectChildren(
  children: React.ReactNode,
  placeholder?: string,
): {
  readonly flatOptions: readonly ParsedOption[];
  readonly entries: readonly RenderEntry[];
} {
  const flatOptions: ParsedOption[] = [];
  const entries: RenderEntry[] = [];
  let nextGroupIndex = 0;

  if (placeholder !== undefined) {
    const placeholderOption: ParsedOption = {
      index: flatOptions.length,
      value: '',
      label: placeholder,
      disabled: false,
      isPlaceholder: true,
    };
    flatOptions.push(placeholderOption);
    entries.push({ kind: 'option', option: placeholderOption });
  }

  const pushOptionElement = (
    element: React.ReactElement<React.OptionHTMLAttributes<HTMLOptionElement>>,
    inheritedDisabled: boolean,
    targetGroupOptions?: ParsedOption[],
  ) => {
    const textLabel = extractTextContent(element.props.children);
    const label = textLabel || (typeof element.props.label === 'string' ? element.props.label : '');
    const value =
      element.props.value !== undefined ? String(element.props.value) : textLabel || label;
    const option: ParsedOption = {
      index: flatOptions.length,
      value,
      label,
      disabled: inheritedDisabled || Boolean(element.props.disabled),
      isPlaceholder: false,
    };
    flatOptions.push(option);
    if (targetGroupOptions) {
      targetGroupOptions.push(option);
    } else {
      entries.push({ kind: 'option', option });
    }
  };

  const visitNodes = (
    nodes: React.ReactNode,
    inheritedDisabled: boolean,
    targetGroupOptions?: ParsedOption[],
  ) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) {
        return;
      }

      if (child.type === React.Fragment) {
        const fragmentProps = child.props as { children?: React.ReactNode };
        visitNodes(fragmentProps.children, inheritedDisabled, targetGroupOptions);
        return;
      }

      if (child.type === 'optgroup' && !targetGroupOptions) {
        const groupElement = child as React.ReactElement<
          React.OptgroupHTMLAttributes<HTMLOptGroupElement>
        >;
        const groupOptions: ParsedOption[] = [];
        visitNodes(
          groupElement.props.children,
          inheritedDisabled || Boolean(groupElement.props.disabled),
          groupOptions,
        );
        if (groupOptions.length > 0) {
          entries.push({
            kind: 'group',
            group: {
              index: nextGroupIndex++,
              label: String(groupElement.props.label ?? ''),
              options: groupOptions,
            },
          });
        }
        return;
      }

      if (child.type === 'option') {
        pushOptionElement(
          child as React.ReactElement<React.OptionHTMLAttributes<HTMLOptionElement>>,
          inheritedDisabled,
          targetGroupOptions,
        );
      }
    });
  };

  visitNodes(children, false);
  return { flatOptions, entries };
}

function normalizeExactTypeahead(text: string): string {
  return text.trim().toLocaleLowerCase('vi');
}

function normalizeFoldedTypeahead(text: string): string {
  return normalizeExactTypeahead(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

function computeInitialValue(
  flatOptions: readonly ParsedOption[],
  defaultValue: string | number | readonly string[] | undefined,
  placeholder: string | undefined,
): string {
  if (defaultValue !== undefined) {
    return normalizeSelectValue(defaultValue);
  }
  if (placeholder !== undefined) {
    return '';
  }
  const firstEnabled = flatOptions.find((opt) => !opt.disabled);
  return firstEnabled ? firstEnabled.value : (flatOptions[0]?.value ?? '');
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      id,
      label,
      labelAction,
      hint,
      error,
      placeholder,
      wrapperClassName = '',
      required,
      disabled,
      'aria-describedby': callerDescribedBy,
      'aria-invalid': ariaInvalid,
      className = '',
      children,
      ...rest
    },
    ref,
  ) => {
    const {
      name,
      value,
      defaultValue,
      onChange,
      onBlur: callerOnBlur,
      onFocus: callerOnFocus,
      onKeyDown: callerOnKeyDown,
      onMouseDown: callerOnMouseDown,
      onClick: callerOnClick,
      form,
      autoFocus,
      tabIndex,
      'aria-label': callerAriaLabel,
      'aria-labelledby': callerAriaLabelledBy,
      multiple: _ignoredMultiple,
      size: _ignoredSize,
      autoComplete: _ignoredAutoComplete,
      ...buttonDomProps
    } = rest;
    void _ignoredMultiple;
    void _ignoredSize;
    void _ignoredAutoComplete;

    const generatedId = useId();
    const selectId = id ?? `rj-select-${generatedId}`;
    const labelId = `${selectId}-label`;
    const listboxId = `${selectId}-listbox`;
    const hintId = hint ? `${selectId}-hint` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;
    const describedBy = [callerDescribedBy, hintId, errorId].filter(Boolean).join(' ') || undefined;
    const resolvedAriaInvalid = ariaInvalid ?? Boolean(error);
    const resolvedAriaLabelledBy = callerAriaLabelledBy ?? (label ? labelId : undefined);

    const { flatOptions, entries } = useMemo(
      () => parseSelectChildren(children, placeholder),
      [children, placeholder],
    );

    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState<string>(() =>
      computeInitialValue(flatOptions, defaultValue, placeholder),
    );

    const currentValue = isControlled ? normalizeSelectValue(value) : internalValue;
    const selectedOption = flatOptions.find((opt) => opt.value === currentValue);
    const displayLabel = selectedOption ? selectedOption.label : (placeholder ?? '');
    const isShowingPlaceholder = !selectedOption || selectedOption.isPlaceholder;

    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [position, setPosition] = useState<ListboxPosition>({
      placement: 'bottom',
      left: VIEWPORT_PADDING,
      top: 0,
      maxHeight: MAX_PANEL_HEIGHT,
    });

    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const listboxRef = useRef<HTMLUListElement | null>(null);
    const labelRef = useRef<HTMLLabelElement | null>(null);
    const hiddenSelectRef = useRef<HTMLSelectElement | null>(null);
    const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
    const typeaheadBufferRef = useRef('');
    const typeaheadTimerRef = useRef<number | undefined>(undefined);
    const suppressNextKeyboardClickRef = useRef(false);
    const suppressClickTimerRef = useRef<number | undefined>(undefined);

    const setHiddenSelectRef = useCallback(
      (node: HTMLSelectElement | null) => {
        hiddenSelectRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    // Keep hidden <select>.value aligned with controlled state after React 19 restoreControlledState
    useLayoutEffect(() => {
      if (hiddenSelectRef.current && hiddenSelectRef.current.value !== currentValue) {
        hiddenSelectRef.current.value = currentValue;
      }
    }, [currentValue, flatOptions]);

    const getOptionId = (index: number) => `${selectId}-option-${index}`;
    const getGroupId = (groupIndex: number) => `${selectId}-group-${groupIndex}`;

    const findFirstEnabled = useCallback((): number => {
      const found = flatOptions.find((opt) => !opt.disabled);
      return found ? found.index : -1;
    }, [flatOptions]);

    const findLastEnabled = useCallback((): number => {
      for (let i = flatOptions.length - 1; i >= 0; i -= 1) {
        if (!flatOptions[i]?.disabled) {
          return i;
        }
      }
      return -1;
    }, [flatOptions]);

    const findNextEnabled = useCallback(
      (from: number): number => {
        for (let i = from + 1; i < flatOptions.length; i += 1) {
          if (!flatOptions[i]?.disabled) {
            return i;
          }
        }
        if (from >= 0 && from < flatOptions.length && !flatOptions[from]?.disabled) {
          return from;
        }
        return findFirstEnabled();
      },
      [findFirstEnabled, flatOptions],
    );

    const findPrevEnabled = useCallback(
      (from: number): number => {
        for (let i = from - 1; i >= 0; i -= 1) {
          if (!flatOptions[i]?.disabled) {
            return i;
          }
        }
        if (from >= 0 && from < flatOptions.length && !flatOptions[from]?.disabled) {
          return from;
        }
        return findLastEnabled();
      },
      [findLastEnabled, flatOptions],
    );

    const clearTypeahead = useCallback(() => {
      typeaheadBufferRef.current = '';
      if (typeaheadTimerRef.current !== undefined) {
        window.clearTimeout(typeaheadTimerRef.current);
        typeaheadTimerRef.current = undefined;
      }
    }, []);

    const clearKeyboardClickSuppression = useCallback(() => {
      suppressNextKeyboardClickRef.current = false;
      if (suppressClickTimerRef.current !== undefined) {
        window.clearTimeout(suppressClickTimerRef.current);
        suppressClickTimerRef.current = undefined;
      }
    }, []);

    const scheduleKeyboardClickSuppression = useCallback(() => {
      suppressNextKeyboardClickRef.current = true;
      if (suppressClickTimerRef.current !== undefined) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
      suppressClickTimerRef.current = window.setTimeout(() => {
        suppressNextKeyboardClickRef.current = false;
        suppressClickTimerRef.current = undefined;
      }, KEYBOARD_CLICK_SUPPRESS_MS);
    }, []);

    const closeListbox = useCallback(
      (restoreFocus: boolean) => {
        setIsOpen(false);
        setActiveIndex(-1);
        clearTypeahead();
        if (restoreFocus) {
          triggerRef.current?.focus();
        }
      },
      [clearTypeahead],
    );

    const openListbox = useCallback(
      (preferDirection?: 'up' | 'down') => {
        if (disabled) {
          return;
        }
        const selectedEnabledIndex = flatOptions.findIndex(
          (opt) => opt.value === currentValue && !opt.disabled,
        );
        const initialIndex =
          selectedEnabledIndex >= 0
            ? selectedEnabledIndex
            : preferDirection === 'up'
              ? findLastEnabled()
              : findFirstEnabled();

        setActiveIndex(initialIndex);
        setIsOpen(true);
      },
      [currentValue, disabled, findFirstEnabled, findLastEnabled, flatOptions],
    );

    const handleHiddenSelectChange = useCallback(
      (event: React.ChangeEvent<HTMLSelectElement>) => {
        if (!isControlled) {
          setInternalValue(event.target.value);
        }
        onChange?.(event);
      },
      [isControlled, onChange],
    );

    const commitValue = useCallback(
      (nextValue: string) => {
        if (nextValue === currentValue) {
          return;
        }
        const selectEl = hiddenSelectRef.current;
        if (selectEl) {
          const valueSetter = Object.getOwnPropertyDescriptor(
            HTMLSelectElement.prototype,
            'value',
          )?.set;
          valueSetter?.call(selectEl, nextValue);
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
        if (!isControlled) {
          setInternalValue(nextValue);
        }
      },
      [currentValue, isControlled],
    );

    const computePosition = useCallback(() => {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }
      const rect = trigger.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
      const hasLayoutBox = rect.width > 0 || rect.height > 0;

      if (
        hasLayoutBox &&
        (rect.bottom <= 0 || rect.top >= viewportHeight || rect.right <= 0 || rect.left >= viewportWidth)
      ) {
        closeListbox(false);
        return;
      }

      const maxAllowedWidth = Math.max(0, viewportWidth - VIEWPORT_PADDING * 2);
      const width = hasLayoutBox ? Math.min(rect.width, maxAllowedWidth) : 0;
      const maxLeft = Math.max(VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING);
      const left = Math.min(Math.max(rect.left, VIEWPORT_PADDING), maxLeft);

      const spaceBelow = Math.max(0, viewportHeight - rect.bottom - VIEWPORT_PADDING - PANEL_GAP);
      const spaceAbove = Math.max(0, rect.top - VIEWPORT_PADDING - PANEL_GAP);
      const placement: 'top' | 'bottom' =
        spaceBelow < MIN_SPACE_BELOW && spaceAbove > spaceBelow ? 'top' : 'bottom';
      const availableVertical = placement === 'top' ? spaceAbove : spaceBelow;
      const maxHeight =
        hasLayoutBox && availableVertical > 0
          ? Math.min(MAX_PANEL_HEIGHT, availableVertical)
          : MAX_PANEL_HEIGHT;

      setPosition({
        placement,
        left,
        width: width > 0 ? width : undefined,
        top: placement === 'bottom' ? rect.bottom + PANEL_GAP : undefined,
        bottom: placement === 'top' ? viewportHeight - rect.top + PANEL_GAP : undefined,
        maxHeight,
      });
    }, [closeListbox]);

    useLayoutEffect(() => {
      if (!isOpen) {
        return;
      }
      computePosition();
    }, [computePosition, isOpen, flatOptions.length]);

    useEffect(() => {
      if (!isOpen) {
        return;
      }

      const handleOutsideMouseDown = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Node)) {
          return;
        }
        if (
          triggerRef.current?.contains(target) ||
          listboxRef.current?.contains(target) ||
          labelRef.current?.contains(target)
        ) {
          return;
        }
        closeListbox(false);
      };

      const handleScroll = (event: Event) => {
        const target = event.target;
        if (target instanceof Node && listboxRef.current?.contains(target)) {
          return;
        }
        if (
          target instanceof Element &&
          target !== document.documentElement &&
          target !== document.body &&
          triggerRef.current &&
          target.contains(triggerRef.current)
        ) {
          closeListbox(false);
          return;
        }
        computePosition();
      };

      document.addEventListener('mousedown', handleOutsideMouseDown);
      window.addEventListener('resize', computePosition);
      window.addEventListener('scroll', handleScroll, true);

      return () => {
        document.removeEventListener('mousedown', handleOutsideMouseDown);
        window.removeEventListener('resize', computePosition);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }, [closeListbox, computePosition, isOpen]);

    useEffect(() => {
      if (!isOpen || activeIndex < 0 || activeIndex >= flatOptions.length) {
        return;
      }
      const optionEl = optionRefs.current[activeIndex];
      optionEl?.scrollIntoView?.({ block: 'nearest' });
    }, [activeIndex, flatOptions.length, isOpen]);

    useEffect(() => {
      if (!isOpen) {
        return;
      }
      if (flatOptions.length === 0) {
        if (activeIndex !== -1) {
          setActiveIndex(-1);
        }
        return;
      }
      if (
        activeIndex < 0 ||
        activeIndex >= flatOptions.length ||
        flatOptions[activeIndex]?.disabled
      ) {
        const selectedEnabledIndex = flatOptions.findIndex(
          (opt) => opt.value === currentValue && !opt.disabled,
        );
        const fallbackIndex =
          selectedEnabledIndex >= 0
            ? selectedEnabledIndex
            : activeIndex >= flatOptions.length
              ? findLastEnabled()
              : findFirstEnabled();
        if (fallbackIndex !== activeIndex) {
          setActiveIndex(fallbackIndex);
        }
      }
    }, [activeIndex, currentValue, findFirstEnabled, findLastEnabled, flatOptions, isOpen]);

    useEffect(() => {
      if (isControlled) {
        return;
      }
      const formEl = hiddenSelectRef.current?.form;
      if (!formEl) {
        return;
      }
      const handleFormReset = (event: Event) => {
        if (event.defaultPrevented) {
          return;
        }
        setInternalValue(computeInitialValue(flatOptions, defaultValue, placeholder));
      };
      formEl.addEventListener('reset', handleFormReset);
      return () => {
        formEl.removeEventListener('reset', handleFormReset);
      };
    }, [defaultValue, flatOptions, form, isControlled, placeholder]);

    useEffect(() => {
      return () => {
        if (typeaheadTimerRef.current !== undefined) {
          window.clearTimeout(typeaheadTimerRef.current);
        }
        clearKeyboardClickSuppression();
      };
    }, [clearKeyboardClickSuppression]);

    const handleTypeahead = useCallback(
      (key: string) => {
        const nextQuery = typeaheadBufferRef.current + key;
        typeaheadBufferRef.current = nextQuery;
        if (typeaheadTimerRef.current !== undefined) {
          window.clearTimeout(typeaheadTimerRef.current);
        }
        typeaheadTimerRef.current = window.setTimeout(() => {
          typeaheadBufferRef.current = '';
          typeaheadTimerRef.current = undefined;
        }, TYPEAHEAD_RESET_MS);

        if (flatOptions.length === 0) {
          return;
        }

        const exactQuery = normalizeExactTypeahead(nextQuery);
        const foldedQuery = normalizeFoldedTypeahead(nextQuery);
        const exactChars = Array.from(exactQuery);
        const isRepeatedSingleChar =
          exactChars.length === 1 ||
          (exactChars.length > 1 && exactChars.every((ch) => ch === exactChars[0]));
        const startIndex = isRepeatedSingleChar
          ? (activeIndex + 1 + flatOptions.length) % flatOptions.length
          : Math.max(0, activeIndex);

        const findMatch = (matcher: (label: string) => boolean): number => {
          for (let offset = 0; offset < flatOptions.length; offset += 1) {
            const idx = (startIndex + offset) % flatOptions.length;
            const candidate = flatOptions[idx];
            if (candidate && !candidate.disabled && matcher(candidate.label)) {
              return idx;
            }
          }
          return -1;
        };

        let matched = findMatch((labelText) =>
          normalizeExactTypeahead(labelText).startsWith(exactQuery),
        );
        if (matched < 0) {
          matched = findMatch((labelText) =>
            normalizeFoldedTypeahead(labelText).startsWith(foldedQuery),
          );
        }
        if (matched < 0 && isRepeatedSingleChar && exactChars.length > 1) {
          const singleExact = exactChars[0] ?? '';
          const singleFolded = Array.from(foldedQuery)[0] ?? singleExact;
          if (singleExact) {
            matched = findMatch((labelText) =>
              normalizeExactTypeahead(labelText).startsWith(singleExact),
            );
          }
          if (matched < 0 && singleFolded) {
            matched = findMatch((labelText) =>
              normalizeFoldedTypeahead(labelText).startsWith(singleFolded),
            );
          }
        }

        if (matched >= 0) {
          setActiveIndex(matched);
        }
      },
      [activeIndex, flatOptions],
    );

    const handleTriggerMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
      // Pointer clicks always fire mousedown first; clear keyboard click suppression so real clicks work immediately
      clearKeyboardClickSuppression();
      callerOnMouseDown?.(event as unknown as React.MouseEvent<HTMLSelectElement>);
    };

    const handleTriggerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (suppressNextKeyboardClickRef.current) {
        clearKeyboardClickSuppression();
        return;
      }
      callerOnClick?.(event as unknown as React.MouseEvent<HTMLSelectElement>);
      if (event.defaultPrevented || disabled) {
        return;
      }
      if (isOpen) {
        closeListbox(false);
      } else {
        openListbox('down');
      }
    };

    const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      callerOnKeyDown?.(event as unknown as React.KeyboardEvent<HTMLSelectElement>);
      if (event.defaultPrevented || disabled) {
        return;
      }

      if (!isOpen) {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
          event.preventDefault();
          if (event.key === 'Enter' || event.key === ' ') {
            scheduleKeyboardClickSuppression();
          }
          openListbox('down');
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          openListbox('up');
        }
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          clearTypeahead();
          setActiveIndex((prev) => findNextEnabled(prev));
          break;
        case 'ArrowUp':
          event.preventDefault();
          clearTypeahead();
          setActiveIndex((prev) => findPrevEnabled(prev));
          break;
        case 'Home':
          event.preventDefault();
          clearTypeahead();
          setActiveIndex(findFirstEnabled());
          break;
        case 'End':
          event.preventDefault();
          clearTypeahead();
          setActiveIndex(findLastEnabled());
          break;
        case 'Escape':
          event.preventDefault();
          event.stopPropagation();
          closeListbox(true);
          break;
        case 'Tab':
          closeListbox(false);
          break;
        case 'Enter': {
          event.preventDefault();
          scheduleKeyboardClickSuppression();
          const activeOption = activeIndex >= 0 ? flatOptions[activeIndex] : undefined;
          if (activeOption && !activeOption.disabled) {
            commitValue(activeOption.value);
          }
          closeListbox(true);
          break;
        }
        case ' ': {
          if (typeaheadBufferRef.current.length > 0) {
            event.preventDefault();
            scheduleKeyboardClickSuppression();
            handleTypeahead(' ');
          } else {
            event.preventDefault();
            scheduleKeyboardClickSuppression();
            const activeOption = activeIndex >= 0 ? flatOptions[activeIndex] : undefined;
            if (activeOption && !activeOption.disabled) {
              commitValue(activeOption.value);
            }
            closeListbox(true);
          }
          break;
        }
        default:
          if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            handleTypeahead(event.key);
          }
          break;
      }
    };

    const handleOptionClick = (option: ParsedOption) => {
      if (option.disabled) {
        return;
      }
      commitValue(option.value);
      closeListbox(true);
    };

    const renderOptionItem = (option: ParsedOption) => {
      const isSelected = option.value === currentValue;
      const isActive = option.index === activeIndex;
      const optionClasses = [
        'rj-select-option',
        option.isPlaceholder ? 'is-placeholder' : '',
        isSelected ? 'is-selected' : '',
        isActive ? 'is-active' : '',
        option.disabled ? 'is-disabled' : '',
      ]
        .filter(Boolean)
        .join(' ');

      return (
        <li
          key={`${option.index}-${option.value}`}
          ref={(node) => {
            optionRefs.current[option.index] = node;
          }}
          id={getOptionId(option.index)}
          role="option"
          aria-selected={isSelected}
          aria-disabled={option.disabled ? 'true' : undefined}
          className={optionClasses}
          onMouseEnter={() => {
            if (!option.disabled) {
              setActiveIndex(option.index);
            }
          }}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => handleOptionClick(option)}
        >
          <span className="rj-select-option-label">{option.label}</span>
          {isSelected && (
            <span className="rj-select-option-check" aria-hidden="true">
              <Icon name="check" size={16} />
            </span>
          )}
        </li>
      );
    };

    const listboxPortal =
      isOpen && typeof document !== 'undefined'
        ? createPortal(
            <ul
              ref={listboxRef}
              id={listboxId}
              role="listbox"
              tabIndex={-1}
              aria-labelledby={resolvedAriaLabelledBy}
              aria-label={resolvedAriaLabelledBy ? undefined : callerAriaLabel}
              data-placement={position.placement}
              className="rj-select-listbox"
              style={{
                left: `${position.left}px`,
                width: position.width !== undefined ? `${position.width}px` : undefined,
                top: position.top !== undefined ? `${position.top}px` : undefined,
                bottom: position.bottom !== undefined ? `${position.bottom}px` : undefined,
                maxHeight: `${position.maxHeight}px`,
              }}
            >
              {flatOptions.length === 0 ? (
                <li role="presentation" className="rj-select-empty">
                  Không có lựa chọn
                </li>
              ) : (
                entries.map((entry) => {
                  if (entry.kind === 'option') {
                    return renderOptionItem(entry.option);
                  }
                  const groupId = getGroupId(entry.group.index);
                  return (
                    <li
                      key={`group-${entry.group.index}`}
                      role="presentation"
                      className="rj-select-group"
                    >
                      <div id={groupId} className="rj-select-group-label" aria-hidden="true">
                        {entry.group.label}
                      </div>
                      <ul
                        role="group"
                        aria-labelledby={groupId}
                        className="rj-select-group-list"
                      >
                        {entry.group.options.map((opt) => renderOptionItem(opt))}
                      </ul>
                    </li>
                  );
                })
              )}
            </ul>,
            document.body,
          )
        : null;

    return (
      <div className={`rj-form-group rj-select-field ${wrapperClassName}`.trim()}>
        {label && !labelAction && (
          <label ref={labelRef} id={labelId} htmlFor={selectId} className="rj-label">
            <span>
              {label}
              {required && (
                <span className="rj-select-required" aria-hidden="true">
                  {' *'}
                </span>
              )}
            </span>
          </label>
        )}

        {label && labelAction && (
          <div className="rj-label">
            <label ref={labelRef} id={labelId} htmlFor={selectId}>
              {label}
              {required && (
                <span className="rj-select-required" aria-hidden="true">
                  {' *'}
                </span>
              )}
            </label>
            {labelAction}
          </div>
        )}

        <div className="rj-select-wrapper">
          <button
            ref={triggerRef}
            id={selectId}
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={isOpen ? listboxId : undefined}
            aria-activedescendant={
              isOpen && activeIndex >= 0 && activeIndex < flatOptions.length
                ? getOptionId(activeIndex)
                : undefined
            }
            aria-labelledby={resolvedAriaLabelledBy}
            aria-label={callerAriaLabel}
            aria-describedby={describedBy}
            aria-invalid={resolvedAriaInvalid}
            aria-required={required ? 'true' : undefined}
            disabled={disabled}
            autoFocus={autoFocus}
            tabIndex={tabIndex}
            className={`rj-select${isOpen ? ' is-open' : ''}${isShowingPlaceholder ? ' is-placeholder' : ''}${className ? ` ${className}` : ''}`}
            onMouseDown={handleTriggerMouseDown}
            onClick={handleTriggerClick}
            onKeyDown={handleTriggerKeyDown}
            onFocus={callerOnFocus as unknown as React.FocusEventHandler<HTMLButtonElement>}
            onBlur={callerOnBlur as unknown as React.FocusEventHandler<HTMLButtonElement>}
            {...(buttonDomProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          >
            <span className="rj-select-value">{displayLabel}</span>
          </button>

          <span className="rj-select-chevron" aria-hidden="true">
            <Icon name="chevron-down" size={18} />
          </span>

          <select
            ref={setHiddenSelectRef}
            aria-hidden="true"
            tabIndex={-1}
            name={name}
            form={form}
            required={required}
            disabled={disabled}
            value={currentValue}
            onChange={handleHiddenSelectChange}
            onFocus={() => {
              if (!disabled) {
                triggerRef.current?.focus();
              }
            }}
            className="rj-select-native-hidden"
          >
            {placeholder !== undefined && <option value="">{placeholder}</option>}
            {children}
          </select>
        </div>

        {listboxPortal}

        {hint && (
          <p id={hintId} className="rj-form-hint">
            {hint}
          </p>
        )}

        {error && (
          <p id={errorId} className="rj-field-error" aria-live="polite">
            <Icon name="alert-circle" size={14} />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

export default Select;
