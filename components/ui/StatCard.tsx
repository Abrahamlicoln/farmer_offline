import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatCardVariant =
  | "purple"
  | "emerald"
  | "amber"
  | "sky"
  | "indigo"
  | "red";

export interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  variant?: StatCardVariant;
  color?: string;
  className?: string;
}

const VARIANT_STYLES: Record<StatCardVariant, string> = {
  purple: "bg-purple-50 text-purple-600 border border-purple-100/60",
  emerald: "bg-emerald-50 text-emerald-600 border border-emerald-100/60",
  amber: "bg-amber-50 text-amber-600 border border-amber-100/60",
  sky: "bg-sky-50 text-sky-600 border border-sky-100/60",
  indigo: "bg-indigo-50 text-indigo-600 border border-indigo-100/60",
  red: "bg-red-50 text-[#e4292b] border border-red-100/60",
};

export function StatCard({
  icon,
  label,
  value,
  variant = "emerald",
  color,
  className,
}: StatCardProps) {
  const iconStyles = color || VARIANT_STYLES[variant] || VARIANT_STYLES.emerald;

  const renderIcon = (cls: string) => {
    if (!icon) return null;
    if (React.isValidElement<{ className?: string }>(icon)) {
      return React.cloneElement(icon, {
        className: cn(icon.props.className, cls),
      });
    }
    return icon;
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden w-full rounded-md border border-gray-200/90 bg-white p-5 shadow-none font-sans text-[#0E121B] select-none flex flex-col justify-between transition-all hover:border-gray-300/80",
        className
      )}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Tinted Circular Icon Badge */}
          <div
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
              iconStyles
            )}
          >
            {renderIcon("w-4.5 h-4.5 stroke-[1.8]")}
          </div>
          <span className="text-[15px] leading-[20px] font-normal text-[#0E121B] truncate">
            {label}
          </span>
        </div>
      </div>

      {/* Numerical Value */}
      <div className="mt-3.5 pt-1 relative z-10">
        <h3 className="text-[26px] leading-[32px] font-normal text-[#0E121B] tracking-tight">
          {value}
        </h3>
      </div>

      {/* Faded watermark icon – bottom right */}
      <div className="pointer-events-none absolute -bottom-3 -right-3 text-slate-100/80 translate-x-1 translate-y-1 select-none">
        {renderIcon("w-20 h-20 text-slate-100/70 stroke-[1.2]")}
      </div>
    </div>
  );
}

export default StatCard;
