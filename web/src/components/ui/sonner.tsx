"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Toast system — matches legacy .toast/.toast.ok/.toast.err styling intent. */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "!bg-ink !text-white !rounded-[11px] !border-0 !shadow-[0_10px_34px_rgba(0,0,0,.28)] !font-medium",
          success: "!bg-good",
          error: "!bg-danger",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
