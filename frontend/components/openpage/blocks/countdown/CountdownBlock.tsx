"use client";

import { useState, useEffect } from "react";
import type { BlockConfig } from "../types";

interface CountdownProps {
  title?: string;
  targetDate?: string;
  deadline?: string;
  showDays?: boolean;
  showHours?: boolean;
  showMinutes?: boolean;
  showSeconds?: boolean;
  expiredText?: string;
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(target: string): TimeLeft | null {
  const diff = new Date(target).getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export function CountdownBlock({ block }: { block: BlockConfig }) {
  const p = block.props as CountdownProps
  const target = p.targetDate || p.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => calculateTimeLeft(target))

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft(target)), 1000)
    return () => clearInterval(timer)
  }, [target])

  const showDays = p.showDays !== false
  const showHours = p.showHours !== false
  const showMinutes = p.showMinutes !== false
  const showSeconds = p.showSeconds !== false

  if (!timeLeft) {
    return (
      <div className="px-6 py-12 text-center">
        <h2 className="text-2xl font-bold text-[var(--color-text-0)] mb-2">{p.title || 'Coming Soon'}</h2>
        <p className="text-[var(--color-text-2)]">{p.expiredText || 'This event has ended.'}</p>
      </div>
    )
  }

  const units = [
    { value: timeLeft.days, label: 'Days', show: showDays },
    { value: timeLeft.hours, label: 'Hours', show: showHours },
    { value: timeLeft.minutes, label: 'Minutes', show: showMinutes },
    { value: timeLeft.seconds, label: 'Seconds', show: showSeconds },
  ].filter((u) => u.show)

  return (
    <div className="px-6 py-12 text-center">
      {p.title && (
        <h2 className="text-2xl font-bold text-[var(--color-text-0)] mb-6">{p.title}</h2>
      )}
      <div className="flex justify-center gap-4">
        {units.map((unit) => (
          <div key={unit.label} className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-xl bg-[var(--color-bg-2)] border border-[var(--color-border-default)] flex items-center justify-center">
              <span className="text-3xl font-bold text-[var(--color-accent)] font-mono">
                {String(unit.value).padStart(2, '0')}
              </span>
            </div>
            <span className="text-xs text-[var(--color-text-2)] mt-2 uppercase tracking-wider">{unit.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
