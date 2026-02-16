import React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

const ToastContext = React.createContext(null);

let nextToastId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  const dismiss = React.useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback(
    ({ title, description, variant = "default", duration = 3500 }) => {
      const id = nextToastId++;
      const item = { id, title, description, variant };
      setToasts((prev) => [...prev, item]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto rounded-lg border bg-background p-3 shadow-md",
              item.variant === "destructive" ? "border-destructive/60" : "border-border"
            )}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {item.title ? (
                  <div
                    className={cn(
                      "text-sm font-semibold",
                      item.variant === "destructive" ? "text-destructive" : "text-foreground"
                    )}
                  >
                    {item.title}
                  </div>
                ) : null}
                {item.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => dismiss(item.id)}
                aria-label="關閉通知"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

