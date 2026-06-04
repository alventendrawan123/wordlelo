export interface ToastProps {
  text: string;
}

export function Toast({ text }: ToastProps) {
  return (
    <div className="anim-pop rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-lg">
      {text}
    </div>
  );
}
