"use client";
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "../icon";

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}
interface DropdownProps {
  options?: readonly DropdownOption[];
  /** Option children keep existing form definitions readable; they are converted to the same option model. */
  children?: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  "aria-label": string;
  "aria-describedby"?: string;
}
function optionText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? optionText(child.props.children)
        : String(child),
    )
    .join("");
}
export function Dropdown({
  options,
  children,
  value,
  defaultValue,
  onValueChange,
  name,
  id,
  disabled,
  className = "",
  "aria-label": label,
  "aria-describedby": description,
}: DropdownProps) {
  const choices =
    options ??
    Children.toArray(children).flatMap((child) =>
      isValidElement<{
        value?: string;
        children?: ReactNode;
        disabled?: boolean;
      }>(child)
        ? [
            {
              value: child.props.value ?? optionText(child.props.children),
              label: optionText(child.props.children),
              disabled: child.props.disabled,
            },
          ]
        : [],
    );
  const generated = useId();
  const listId = `${generated}-options`;
  const [internal, setInternal] = useState(
    defaultValue ?? choices[0]?.value ?? "",
  );
  const selected = value ?? internal;
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(0);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 280,
  });
  const trigger = useRef<HTMLButtonElement>(null),
    popup = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const choice = choices.find((option) => option.value === selected);
  useEffect(() => {
    if (defaultValue !== undefined) setInternal(defaultValue);
  }, [defaultValue]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  useEffect(() => {
    const form = trigger.current?.closest("form");
    const reset = () => {
      setInternal(defaultValue ?? choices[0]?.value ?? "");
      setOpen(false);
    };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [defaultValue, choices[0]?.value]);
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport;
      const height = viewport?.height ?? window.innerHeight,
        offset = viewport?.offsetTop ?? 0;
      const below = height + offset - rect.bottom - 12,
        above = rect.top - offset - 12;
      const up = below < 160 && above > below;
      const maxHeight = Math.max(80, Math.min(280, up ? above : below));
      const width = Math.min(Math.max(rect.width, 180), window.innerWidth - 16);
      setPosition({
        top: up
          ? Math.max(offset + 8, rect.top - maxHeight - 4)
          : rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        width,
        maxHeight,
      });
    };
    update();
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !trigger.current?.contains(target) &&
        !popup.current?.contains(target)
      )
        setOpen(false);
    };
    const scroll = (event: Event) => {
      if (!popup.current?.contains(event.target as Node)) update();
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", update);
    document.addEventListener("scroll", scroll, true);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", update);
      document.removeEventListener("scroll", scroll, true);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [open]);
  useEffect(() => {
    if (open)
      popup.current
        ?.querySelector(`[data-option-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);
  function show() {
    if (disabled || trigger.current?.matches(":disabled")) return;
    setActive(
      Math.max(
        0,
        choices.findIndex(
          (option) => option.value === selected && !option.disabled,
        ),
      ),
    );
    setOpen(true);
  }
  function choose(index: number) {
    const option = choices[index];
    if (!option || option.disabled) return;
    if (value === undefined) setInternal(option.value);
    onValueChange?.(option.value);
    setOpen(false);
    trigger.current?.focus();
  }
  function move(direction: number) {
    let index = open
      ? active
      : choices.findIndex((option) => option.value === selected);
    for (let i = 0; i < choices.length; i++) {
      index = (index + direction + choices.length) % choices.length;
      if (!choices[index].disabled) {
        setActive(index);
        break;
      }
    }
    if (!open) setOpen(true);
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const enabled = choices
        .map((option, index) => ({ option, index }))
        .filter(({ option }) => !option.disabled);
      setActive(
        (event.key === "Home" ? enabled[0] : enabled.at(-1))?.index ?? 0,
      );
      setOpen(true);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(active);
      else show();
      return;
    }
    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      const now = Date.now();
      typed.current = {
        text:
          (now - typed.current.at < 700 ? typed.current.text : "") +
          event.key.toLowerCase(),
        at: now,
      };
      const index = choices.findIndex(
        (option) =>
          !option.disabled &&
          option.label.toLowerCase().startsWith(typed.current.text),
      );
      if (index >= 0) {
        setActive(index);
        setOpen(true);
      }
    }
  }
  return (
    <span className={`dropdown ${className}`}>
      {name && (
        <input type="hidden" name={name} value={selected} disabled={disabled} />
      )}
      <button
        ref={trigger}
        id={id}
        type="button"
        className="dropdown-trigger"
        role="combobox"
        aria-label={label}
        aria-describedby={description}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onKeyDown={keyboard}
        onClick={() => (open ? setOpen(false) : show())}
      >
        <span>{choice?.label ?? selected ?? "Select"}</span>
        <Icon name="chevron" size={16} />
      </button>
      {open &&
        createPortal(
          <div
            ref={popup}
            id={listId}
            className="dropdown-menu"
            role="listbox"
            aria-label={label}
            style={position}
          >
            {choices.map((option, index) => (
              <div
                id={`${listId}-${index}`}
                role="option"
                key={option.value}
                data-option-index={index}
                aria-selected={option.value === selected}
                aria-disabled={option.disabled || undefined}
                className={`dropdown-option ${active === index ? "is-active" : ""}`}
                onPointerMove={(event) =>
                  event.pointerType === "mouse" &&
                  !option.disabled &&
                  setActive(index)
                }
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {option.value === selected && <Icon name="check" size={16} />}
              </div>
            ))}
          </div>,
          trigger.current?.closest("dialog") ?? document.body,
        )}
    </span>
  );
}
