"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const LENGTH = 6;

/** Segmented 6-box OTP input — auto-advance, backspace, arrow keys, paste (plan §7). */
export function OtpInput({
  value,
  onChange,
  error,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  /** Receives the freshly-typed value directly — parent state hasn't re-rendered yet at this point. */
  onSubmit?: (value: string) => void;
}) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);
  const digits = React.useMemo(() => {
    const d = value.split("");
    while (d.length < LENGTH) d.push("");
    return d.slice(0, LENGTH);
  }, [value]);

  /** Returns the newly-joined value so callers don't read back the (not-yet-updated) `value` prop. */
  function setDigit(i: number, char: string): string {
    const next = [...digits];
    next[i] = char;
    const joined = next.join("");
    onChange(joined);
    return joined;
  }

  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/[^0-9]/g, "").slice(-1);
    const joined = setDigit(i, digit);
    if (digit && i < LENGTH - 1) refs.current[i + 1]?.focus();
    if (digit && i === LENGTH - 1) onSubmit?.(joined);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        setDigit(i, "");
      } else if (i > 0) {
        setDigit(i - 1, "");
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < LENGTH - 1) {
      e.preventDefault();
      refs.current[i + 1]?.focus();
    } else if (e.key === "Enter") {
      onSubmit?.(digits.join(""));
    }
  }

  function handlePaste(i: number, e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (!text) return;
    const next = [...digits];
    text
      .split("")
      .slice(0, LENGTH - i)
      .forEach((ch, j) => {
        next[i + j] = ch;
      });
    const joined = next.join("");
    onChange(joined);
    refs.current[Math.min(i + text.length, LENGTH - 1)]?.focus();
    // next.join("") only contributes a character per filled slot, so length===LENGTH means no gaps.
    if (joined.length === LENGTH) onSubmit?.(joined);
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {digits.map((d, i) => (
        <React.Fragment key={i}>
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={(e) => handlePaste(i, e)}
            onFocus={(e) => e.target.select()}
            className={cn(
              "h-14 w-[46px] flex-shrink-0 rounded-[11px] border-2 border-line bg-white text-center font-mono text-2xl font-extrabold text-navy caret-navy outline-none transition-colors",
              "focus:border-navy focus:bg-gold-soft focus:ring-[3px] focus:ring-navy/10",
              d && "border-navy bg-[#F5F8FC]",
              error && "!border-danger !bg-danger-bg animate-[shake_.32s]",
            )}
          />
          {i === 2 && <span className="flex-shrink-0 text-xl font-extrabold text-faint">·</span>}
        </React.Fragment>
      ))}
    </div>
  );
}
