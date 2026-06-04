// Shared Somali payment methods used across all modules

export const PAYMENT_METHODS = [
  { value: "Zaad",   label: "Zaad",    color: "bg-red-100 text-red-700",    dot: "bg-red-500" },
  { value: "Sahal",  label: "Sahal",   color: "bg-blue-100 text-blue-700",   dot: "bg-blue-500" },
  { value: "Edahab", label: "Edahab",  color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  { value: "MyCash", label: "MyCash",  color: "bg-green-100 text-green-700",  dot: "bg-green-500" },
  { value: "Credit", label: "Credit (Loan)", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
]

export const PAYMENT_VALUES = PAYMENT_METHODS.map(p => p.value)

export function getPaymentStyle(method: string) {
  return PAYMENT_METHODS.find(p => p.value === method) ?? {
    value: method, label: method,
    color: "bg-slate-100 text-slate-700", dot: "bg-slate-400"
  }
}
