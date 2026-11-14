"use client";

import { useCallback, useEffect, useState } from "react";
import { createAuthClient } from "better-auth/react";
import { Activity, BookOpenCheck, FileCheck2, LayoutDashboard, LogOut, Menu, Sparkles, Upload, X } from "lucide-react";
import { AdminOverview, AdminReview } from "./admin-views";
import { api, type Edition, type Job, type Question, type Sim } from "./dashboard-shared";
import { SimulationResult, SimulationRun, StudentHistory, StudentPractice } from "./student-views";

const authClient = createAuthClient();
type Props = { user: { name: string; email: string; role: string } };

export function Dashboard({ user }: Props) {
  const isAdmin = user.role === "ADMIN";
  const [view, setView] = useState(isAdmin ? "overview" : "practice");
  const [mobileNav, setMobileNav] = useState(false);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [simulations, setSimulations] = useState<Sim[]>([]);
  const [activeSim, setActiveSim] = useState<Sim | null>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const notify = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(""), 3600); }, []);
  const refresh = useCallback(async () => {
    try {
      if (isAdmin) {
        const [q, j] = await Promise.all([api<Question[]>("/api/admin/questions?status=PENDING"), api<Job[]>("/api/admin/imports")]);
        setQuestions(q); setJobs(j);
      } else {
        const [e, s] = await Promise.all([api<Edition[]>("/api/editions"), api<Sim[]>("/api/simulations")]);
        setEditions(e); setSimulations(s);
      }
    } catch (error) { if (error instanceof Error) notify(error.message); }
  }, [isAdmin, notify]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!isAdmin || !jobs.some((job) => job.status === "QUEUED" || job.status === "PROCESSING")) return;
    const timer = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [isAdmin, jobs, refresh]);

  const pending = questions.filter((q) => q.status === "PENDING");
  const completedSims = simulations.filter((s) => s.status === "FINISHED");
  const average = completedSims.length ? Math.round(completedSims.reduce((sum, sim) => sum + ((sim.score || 0) / Math.max(sim.total || 0, 1)) * 100, 0) / completedSims.length) : 0;

  async function uploadExam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); const formElement = event.currentTarget;
    try { const form = new FormData(formElement); await api("/api/admin/imports", { method: "POST", body: form }); notify("Prova enviada. A extração começou em segundo plano."); formElement.reset(); await refresh(); }
    catch (error) { notify(error instanceof Error ? error.message : "Falha no envio."); }
    finally { setBusy(false); }
  }

  async function uploadKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); const formElement = event.currentTarget;
    try { const form = new FormData(formElement); const result = await api<{ updated: number; provided: number }>("/api/admin/answer-keys", { method: "POST", body: form }); notify(`Gabarito associado a ${result.updated} de ${result.provided} questões encontradas.`); formElement.reset(); await refresh(); }
    catch (error) { notify(error instanceof Error ? error.message : "Falha na importação do gabarito."); }
    finally { setBusy(false); }
  }

  async function openSimulation(edition: Edition) {
    setBusy(true);
    try { const created = await api<Sim>("/api/simulations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ editionId: edition.id }) }); const full = await api<Sim>(`/api/simulations/${created.id}`); setActiveSim(full); setView("simulation"); }
    catch (error) { notify(error instanceof Error ? error.message : "Não foi possível iniciar."); }
    finally { setBusy(false); }
  }

  async function openResult(sim: Sim) {
    try { setActiveSim(await api<Sim>(`/api/simulations/${sim.id}`)); setView("result"); }
    catch (error) { notify(error instanceof Error ? error.message : "Não foi possível abrir o resultado."); }
  }

  async function signOut() { await authClient.signOut(); window.location.reload(); }
  const menus = isAdmin ? [
    { id: "overview", label: "Visão geral", icon: LayoutDashboard }, { id: "import", label: "Importar provas", icon: Upload }, { id: "review", label: "Revisar questões", icon: FileCheck2 },
  ] : [
    { id: "practice", label: "Praticar", icon: LayoutDashboard }, { id: "history", label: "Meu histórico", icon: Activity },
  ];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand"><span className="brand-icon"><BookOpenCheck size={19} /></span><span>Trilha<span className="brand-light"> ENADE</span></span></div>
      <div className="workspace-label">ÁREA {isAdmin ? "ADMINISTRATIVA" : "DO ESTUDANTE"}</div>
      <nav className="side-nav">{menus.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? "nav-active" : ""}`} onClick={() => { setView(id); setActiveSim(null); setMobileNav(false); }}><Icon size={17} /><span>{label}</span>{id === "review" && pending.length > 0 && <span className="nav-count">{pending.length}</span>}</button>)}</nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-tip"><span className="tip-icon"><Sparkles size={15} /></span><strong>{isAdmin ? "Curadoria em dia" : "Pequenos passos"}</strong><p>{isAdmin ? "Questões revisadas viram prática para milhares de estudantes." : "A consistência vale mais que a pressa. Volte quando quiser."}</p></div>
      <div className="side-user"><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div><div className="user-details"><strong>{user.name}</strong><span>{isAdmin ? "Administrador" : "Estudante"}</span></div><button className="icon-button logout-button" title="Sair" onClick={signOut}><LogOut size={16} /></button></div>
    </aside>
    {mobileNav && <button className="mobile-backdrop" onClick={() => setMobileNav(false)} aria-label="Fechar menu" />}
    <main className="main-area">
      <header className="topbar"><button className="icon-button menu-toggle" onClick={() => setMobileNav(true)} aria-label="Abrir menu"><Menu size={20} /></button><div className="breadcrumbs"><span>ENADE</span><span className="crumb-slash">/</span><strong>{view === "overview" ? "Visão geral" : view === "import" ? "Importar provas" : view === "review" ? "Revisão e curadoria" : view === "history" ? "Meu histórico" : view === "simulation" ? "Simulado em andamento" : view === "result" ? "Resultado" : "Prática"}</strong></div><div className="topbar-right"><span className="topbar-date">SUA JORNADA DE APRENDIZADO</span><div className="avatar avatar-small">{user.name.slice(0, 1).toUpperCase()}</div></div></header>
      <div className="content-area">
        {isAdmin && (view === "overview" || view === "import") && <AdminOverview jobs={jobs} pending={pending} onGo={setView} onUpload={uploadExam} onKeyUpload={uploadKey} busy={busy} showImport={view === "import"} />}
        {isAdmin && view === "review" && <AdminReview questions={pending} search={search} setSearch={setSearch} notify={notify} refresh={refresh} />}
        {!isAdmin && view === "practice" && <StudentPractice editions={editions} simulations={completedSims} average={average} onStart={openSimulation} busy={busy} onGo={setView} />}
        {!isAdmin && view === "history" && <StudentHistory simulations={simulations} onOpen={openResult} />}
        {!isAdmin && view === "simulation" && activeSim && <SimulationRun simulation={activeSim} onDone={async (id) => { await refresh(); setActiveSim(await api<Sim>(`/api/simulations/${id}`)); setView("result"); notify("Simulado finalizado. Confira sua correção."); }} notify={notify} />}
        {!isAdmin && view === "result" && activeSim && <SimulationResult simulation={activeSim} onBack={() => setView("history")} />}
      </div>
      <footer className="page-foot"><span>FEITO PARA SUA PRÓXIMA CONQUISTA</span><span>PLATAFORMA DE SIMULADOS · ENADE</span></footer>
    </main>
    {toast && <div className="toast"><span className="toast-dot" />{toast}<button onClick={() => setToast("")}><X size={15} /></button></div>}
  </div>;
}
