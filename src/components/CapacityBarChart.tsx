"use client";

import React from "react";

export interface CapacityBarItem {
  code: string;
  title: string;
  activeSeats: number;
  maxSeats: number;
}

export function CapacityBarChart({
  items,
  title = "Enrollment Capacity vs. Batch Limit",
  subtitle = "Live seat utilization across CBCS offerings",
}: {
  items: CapacityBarItem[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-xs"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#003366]">{title}</h2>
          <p className="text-xs text-[#555555]">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-[#333333]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-[#0055CC]" />
            Active
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-[#CC0000]" />
            Full
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-[#E8EEF6]" />
            Limit
          </span>
        </div>
      </div>

      <div className="space-y-3.5">
        {items.map((item) => {
          const pct =
            item.maxSeats > 0
              ? Math.min(100, Math.round((item.activeSeats / item.maxSeats) * 100))
              : 0;
          const isFull = item.activeSeats >= item.maxSeats;
          const isNearFull = !isFull && pct >= 50 && item.maxSeats <= 5;
          const barColor = isFull
            ? "bg-[#CC0000]"
            : isNearFull || pct >= 80
              ? "bg-[#FFB800]"
              : "bg-[#0055CC]";

          return (
            <div key={item.code} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="min-w-0 truncate">
                  <span className="font-semibold text-[#003366]">
                    {item.code}
                  </span>
                  <span className="ml-1.5 text-[#333333]">{item.title}</span>
                </div>
                <span
                  className={`ml-2 shrink-0 font-semibold tabular-nums ${
                    isFull
                      ? "text-[#CC0000]"
                      : isNearFull
                        ? "text-[#B27B00]"
                        : "text-[#003366]"
                  }`}
                >
                  {item.activeSeats} / {item.maxSeats} ({pct}%)
                </span>
              </div>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-[#E8EEF6]"
                role="progressbar"
                aria-valuenow={item.activeSeats}
                aria-valuemin={0}
                aria-valuemax={item.maxSeats}
                aria-label={`${item.code} seat occupancy`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function CircularProgressRing({
  percentage,
  label,
  sublabel,
  color = "#0055CC",
  size = 124,
}: {
  percentage: number;
  label: string;
  sublabel?: string;
  color?: string;
  size?: number;
}) {
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E8EEF6"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold leading-none text-[#003366]">
          {label}
        </span>
        {sublabel && (
          <span className="mt-1 text-[11px] font-medium text-[#555555]">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
