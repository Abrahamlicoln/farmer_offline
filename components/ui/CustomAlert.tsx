"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface CustomAlertProps {
  title: string;
  message: string | React.ReactNode;
  icon?: React.ReactNode;
  variant?: "info" | "warning" | "success" | "destructive";
  onDismiss?: () => void;
  className?: string;
  dismissable?: boolean;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  title,
  message,
  icon,
  variant = "info",
  onDismiss,
  className,
  dismissable = true,
}) => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const variantStyles = {
    info: {
      border: "border-sky-200",
      iconBg: "bg-sky-50 text-sky-600",
      titleColor: "text-slate-900",
    },
    warning: {
      border: "border-amber-200",
      iconBg: "bg-amber-50 text-amber-600",
      titleColor: "text-slate-900",
    },
    success: {
      border: "border-emerald-200",
      iconBg: "bg-emerald-50 text-emerald-600",
      titleColor: "text-slate-900",
    },
    destructive: {
      border: "border-rose-200",
      iconBg: "bg-rose-50 text-rose-600",
      titleColor: "text-rose-900",
    },
  };

  const currentVariant = variantStyles[variant];

  return (
    <div
      role="alert"
      className={cn(
        "w-full bg-white rounded-2xl border p-4 shadow-sm transition-all duration-200 flex items-start gap-3.5",
        currentVariant.border,
        className
      )}
    >
      {/* Icon */}
      {icon && (
        <div
          className={cn(
            "p-2 rounded-xl shrink-0 flex items-center justify-center text-lg",
            currentVariant.iconBg
          )}
        >
          {icon}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <h5 className={cn("text-sm font-semibold tracking-tight", currentVariant.titleColor)}>
          {title}
        </h5>
        <div className="text-xs text-slate-600 mt-1 leading-relaxed">
          {message}
        </div>
      </div>

      {/* Dismiss Button */}
      {dismissable && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss alert"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
};
