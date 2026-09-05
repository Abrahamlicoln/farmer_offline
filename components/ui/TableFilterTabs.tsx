import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterOption {
  id: string;
  label: string;
}

interface TableFilterTabsProps {
  options: FilterOption[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function TableFilterTabs({
  options,
  activeTab,
  onTabChange,
  className,
}: TableFilterTabsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md border border-gray-100 bg-slate-50/50 p-1 w-fit select-none",
        className
      )}
    >
      {options.map((option) => {
        const isActive = activeTab === option.id;
        return (
          <Button
            key={option.id}
            variant={isActive ? "default" : "ghost"}
            className={cn(
              "h-8 rounded-md px-4 text-xs tracking-tight font-medium transition-all py-0 min-w-[80px]",
              isActive
                ? "bg-emerald-700 text-white hover:bg-emerald-800 shadow-none font-semibold"
                : "bg-transparent text-slate-500 hover:bg-white hover:text-emerald-700 border border-transparent hover:border-gray-100"
            )}
            onClick={() => onTabChange(option.id)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

export default TableFilterTabs;
