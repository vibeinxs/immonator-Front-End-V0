import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Euro sign constant to avoid unicode encoding issues in SSR */
export const EUR = String.fromCharCode(8364)
