"use client";

import { ArrowRight, BookOpenCheck, Target } from "lucide-react";

export type Edition = { id: string; year: number; area: string; _count?: { questions: number } };
export type Question = { id: string; originalNumber: number; statement: string; status: string; correctOption: string | null; annulled: boolean; needsReview: boolean; reviewNote?: string | null; reviewedAt?: string | null; options: { label: string; text: string }[]; edition: Edition };
export type Job = { id: string; status: string; totalFound: number; totalFailed: number; error?: string | null; createdAt: string; edition: Edition };
export type Sim = { id: string; status: string; score: number | null; total: number | null; startedAt: string; finishedAt?: string | null; edition: Edition; answers?: Answer[] };
export type Snapshot = { originalNumber: number; statement: string; options: { label: string; text: string }[]; correctOption?: string | null; annulled?: boolean };
export type Answer = { id: string; selected: string | null; isCorrect?: boolean | null; snapshot: Snapshot };

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
  return data as T;
}

export function Metric({ icon: Icon, label, value, hint, color }: { icon: typeof Target; label: string; value: string; hint: string; color: string }) {
  return <div className="metric-card"><div className={`metric-icon metric-${color}`}><Icon size={17} /></div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-hint">{hint}</span></div>;
}

export function EmptyState({ title, text, action, onClick }: { title: string; text: string; action?: string; onClick?: () => void }) {
  return <div className="empty-state"><span className="empty-icon"><BookOpenCheck size={19} /></span><strong>{title}</strong><p>{text}</p>{action && onClick && <button className="button button-outline" onClick={onClick}>{action}<ArrowRight size={15} /></button>}</div>;
}
