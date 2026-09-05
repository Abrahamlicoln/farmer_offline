import React from "react";
import { cn } from "@/lib/utils";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  helperText?: string;
  requiredIndicator?: boolean;
}

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      label,
      icon,
      error,
      helperText,
      requiredIndicator,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[12px] font-normal text-slate-700 block pb-1.5 ml-1"
          >
            {label}
            {requiredIndicator && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              "flex h-11 w-full rounded-md border border-gray-200 bg-white text-sm font-medium text-[#0E121B] shadow-none transition-all placeholder:text-slate-400 focus:border-emerald-600 focus:ring-0 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              icon ? "pl-10 pr-4" : "px-4",
              error
                ? "border-rose-400 focus:border-rose-500"
                : "border-gray-200 hover:border-slate-300 focus:border-emerald-600",
              props.disabled && "bg-slate-50 text-slate-400 cursor-not-allowed",
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs font-normal text-rose-500 ml-1 flex items-center gap-1">
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="text-xs font-normal text-slate-400 ml-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

InputField.displayName = "InputField";
