"use client";

import { type ReactNode, useEffect, useRef } from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-full max-w-md rounded-lg border border-tile-border bg-background p-6 text-foreground backdrop:bg-black/50"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wide">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-2xl leading-none text-foreground/60 hover:text-foreground"
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
