"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectFieldProps {
  label?: string;
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  requiredIndicator?: boolean;
  error?: string;
  className?: string;
  triggerClassName?: string;
  icon?: React.ReactNode;
  clearable?: boolean;
  align?: "left" | "right";
}

export function SearchableSelectField({
  label,
  value,
  onValueChange,
  options = [],
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No option found",
  disabled = false,
  requiredIndicator = false,
  error,
  className,
  triggerClassName,
  icon,
  clearable = false,
  align = "left",
}: SearchableSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const q = searchTerm.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    );
  }, [options, searchTerm]);

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm("");
    }
  }, [open]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  const handleSelect = (val: string) => {
    onValueChange(val);
    setOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn(label ? "space-y-1.5" : "", "w-full relative", className)}
    >
      {label && (
        <label className="text-[12px] font-normal text-slate-700 block pb-1.5 ml-1 select-none">
          {label}
          {requiredIndicator && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}

      {/* Trigger Button strictly matching pmtool */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          "w-full h-11 justify-between rounded-md border border-gray-200 bg-white text-sm font-medium shadow-none transition-all flex items-center px-4 text-left select-none cursor-pointer focus:border-emerald-600 focus:outline-none",
          disabled && "bg-slate-50 text-slate-400 cursor-not-allowed border-gray-200",
          error && "border-rose-400",
          open && "border-emerald-600 ring-1 ring-emerald-600/20",
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
          {icon && <div className="text-slate-400 shrink-0">{icon}</div>}
          {selectedOption ? (
            <span
              className={cn(
                "truncate block",
                selectedOption.value
                  ? "text-emerald-900 font-semibold"
                  : "text-slate-900 font-medium"
              )}
            >
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-slate-400 font-normal truncate">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center shrink-0 ml-1.5 gap-1">
          {clearable && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onValueChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onValueChange("");
                }
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="Clear selection"
            >
              <svg
                className="w-3.5 h-3.5"
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
            </span>
          )}

          <svg
            className={cn(
              "h-4 w-4 text-slate-400 transition-transform duration-200",
              open && "rotate-180"
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Error message */}
      {error && <p className="text-xs text-rose-500 ml-1">{error}</p>}

      {/* Dropdown Popover matching pmtool */}
      {open && (
        <div
          className={cn(
            "absolute top-full mt-1 z-50 min-w-full w-max max-w-[320px] rounded-md border border-gray-200 bg-white shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {/* Search Input Box */}
          <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-slate-50/50">
            <svg
              className="w-4 h-4 text-slate-400 shrink-0 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 scrollbar-thin scrollbar-thumb-slate-200">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-xs text-slate-400 text-center select-none">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={`${opt.value || "__all__"}_${idx}`}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-left transition-colors cursor-pointer select-none",
                      isSelected
                        ? "bg-emerald-50/80 text-emerald-900 font-semibold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="truncate">{opt.label}</div>
                      {opt.subLabel && (
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {opt.subLabel}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <svg
                        className="h-4 w-4 text-emerald-700 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelectField;
