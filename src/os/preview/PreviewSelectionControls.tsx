import { useRef, type KeyboardEvent, type ReactNode } from "react";

type SelectionOption = {
  id: string;
  label: string;
};

type TabOption = SelectionOption & {
  panel: ReactNode;
};

export function PreviewSegmentedControl({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly SelectionOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="preview-segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option.id}
          aria-pressed={value === option.id}
          className={value === option.id ? "is-active" : ""}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function PreviewTabs({
  idPrefix,
  label,
  options,
  value,
  onChange,
}: {
  idPrefix: string;
  label: string;
  options: readonly TabOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectFromKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (options.length === 0) return;

    let nextIndex: number | undefined;

    if (event.key === "ArrowRight") nextIndex = (index + 1) % options.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + options.length) % options.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = options.length - 1;
    if (nextIndex === undefined) return;
    const nextOption = options[nextIndex];
    if (!nextOption) return;

    event.preventDefault();
    onChange(nextOption.id);
    tabs.current[nextIndex]?.focus();
  }

  return (
    <>
      <div className="preview-tabs" role="tablist" aria-label={label}>
        {options.map((option, index) => {
          const selected = value === option.id;
          return (
            <button
              type="button"
              key={option.id}
              ref={(element) => {
                tabs.current[index] = element;
              }}
              role="tab"
              id={`${idPrefix}-tab-${option.id}`}
              aria-selected={selected}
              aria-controls={`${idPrefix}-tabpanel-${option.id}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? "is-active" : ""}
              onClick={() => onChange(option.id)}
              onKeyDown={(event) => selectFromKeyboard(event, index)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {options.map((option) => (
        <div
          className="preview-tabpanel"
          role="tabpanel"
          id={`${idPrefix}-tabpanel-${option.id}`}
          aria-labelledby={`${idPrefix}-tab-${option.id}`}
          hidden={value !== option.id}
          key={option.id}
        >
          {option.panel}
        </div>
      ))}
    </>
  );
}
