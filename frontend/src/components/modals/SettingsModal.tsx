"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { Modal } from "./Modal";

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}

function ToggleRow({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: ToggleRowProps) {
  return (
    <label
      className={`flex items-center justify-between gap-4 py-3 ${
        disabled ? "opacity-40" : "cursor-pointer"
      }`}
    >
      <span className="flex flex-col">
        <span className="font-medium">{label}</span>
        {description ? (
          <span className="text-xs text-foreground/60">{description}</span>
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="size-5 shrink-0 accent-[var(--correct)]"
      />
    </label>
  );
}

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  hardMode: boolean;
  hardModeLocked: boolean;
  onToggleHardMode: () => void;
}

export function SettingsModal({
  open,
  onClose,
  hardMode,
  hardModeLocked,
  onToggleHardMode,
}: SettingsModalProps) {
  const { dark, colorblind, toggleDark, toggleColorblind } = useTheme();

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="divide-y divide-tile-border">
        <ToggleRow label="Dark theme" checked={dark} onChange={toggleDark} />
        <ToggleRow
          label="Color blind mode"
          description="High-contrast colors"
          checked={colorblind}
          onChange={toggleColorblind}
        />
        <ToggleRow
          label="Hard mode"
          description="Revealed hints must be reused (lock after first guess)"
          checked={hardMode}
          disabled={hardModeLocked}
          onChange={onToggleHardMode}
        />
      </div>
    </Modal>
  );
}
