"use client";

import { useCallback, useEffect, useState } from "react";
import { createAuthClient } from "better-auth/react";
import { Activity, ArrowDownRight, ArrowLeft, ArrowRight, BookOpenCheck, Check, ChevronDown, CircleHelp, Clock3, FileCheck2, FileUp, LayoutDashboard, LogOut, Menu, Pencil, Search, ShieldCheck, Sparkles, Target, Trash2, Trophy, Upload, X } from "lucide-react";

const authClient = createAuthClient();
type Props = { user: { name: string; email: string; role: string } };
type Edition = { id: string; year: number; area: string; _count?: { questions: number } };
type Question = { id: string; originalNumber: number; statement: string; status: string; correctOption: string | null; annulled: boolean; needsReview: boolean; reviewNote?: string | null; options: { label: string; text: string }[]; edition: Edition };
type Job = { id: string; status: string; totalFound: number; totalFailed: number; error?: string | null; createdAt: string; edition: Edition };
type Sim = { id: string; status: string; score: number | null; total: number | null; startedAt: string; finishedAt?: string | null; edition: Edition; answers?: Answer[] };
type Snapshot = { originalNumber: number; statement: string; options: { label: string; text: string }[]; correctOption?: string | null; annulled?: boolean };
type Answer = { id: string; selected: string | null; isCorrect?: boolean | null; snapshot: Snapshot };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
  return data as T;
}

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

function AdminOverview({ jobs, pending, onGo, onUpload, onKeyUpload, busy, showImport }: { jobs: Job[]; pending: Question[]; onGo: (view: string) => void; onUpload: (event: React.FormEvent<HTMLFormElement>) => void; onKeyUpload: (event: React.FormEvent<HTMLFormElement>) => void; busy: boolean; showImport: boolean }) {
  const totalQuestions = jobs.reduce((sum, job) => sum + job.totalFound, 0);
  const availableEditions = Array.from(new Map(jobs.map((job) => [job.edition.id, job.edition])).values());
  return <div className="page-stack">
    {showImport && <><div className="page-title-row"><div><span className="eyebrow">BIBLIOTECA DE PROVAS</span><h1>Importar conteúdo</h1><p>Envie a prova e, depois, associe o gabarito oficial da edição.</p></div></div><div className="import-grid"><section className="panel import-panel"><div className="import-panel-icon"><FileUp size={19} /></div><span className="eyebrow">ETAPA 1</span><h2>Enviar prova do ENADE</h2><p>O PDF será preservado e processado em segundo plano. As questões aguardam sua revisão antes de aparecer aos estudantes.</p><form className="upload-form" onSubmit={onUpload}><div className="form-two"><label>Ano da edição<input name="year" type="number" min="2004" max="2100" placeholder="Ex.: 2023" required /></label><label>Área de avaliação<input name="area" placeholder="Ex.: Sistemas de Informação" required /></label></div><label className="file-drop"><input name="file" type="file" accept="application/pdf,.pdf" required /><span className="file-drop-icon"><Upload size={18} /></span><b>Escolha o arquivo PDF</b><small>Tamanho máximo: 30 MB</small></label><button className="button button-primary" disabled={busy}>{busy ? "Enviando…" : "Enviar prova"}<ArrowRight size={15} /></button></form></section><section className="panel import-panel key-import-panel"><div className="import-panel-icon import-key-icon"><FileCheck2 size={19} /></div><span className="eyebrow">ETAPA 2</span><h2>Importar gabarito oficial</h2><p>Use um arquivo de texto ou CSV, com uma resposta por linha. Questões anuladas podem ser indicadas como ANULADA.</p><form className="upload-form" onSubmit={onKeyUpload}><label>Edição<select name="editionId" required defaultValue=""><option value="" disabled>Selecione uma prova importada</option>{availableEditions.map((edition) => <option key={edition.id} value={edition.id}>{edition.year} · {edition.area}</option>)}</select></label><label className="file-drop key-drop"><input name="file" type="file" accept=".txt,.csv,text/plain,text/csv" required /><span className="file-drop-icon"><Upload size={18} /></span><b>Escolha o gabarito</b><small>Exemplo: 1; A · 2; C · 3; ANULADA</small></label><button className="button button-outline" disabled={busy || !availableEditions.length}>{busy ? "Enviando…" : "Associar gabarito"}<ArrowRight size={15} /></button></form></section></div><div className="format-hint"><CircleHelp size={16} /><span><b>Formato aceito:</b> arquivo de texto/CSV com um número e resposta por linha, como <code>1; A</code> ou <code>12; ANULADA</code>.</span></div></>}
    <section className="welcome-banner admin-banner"><div className="welcome-copy"><span className="eyebrow eyebrow-light"><ShieldCheck size={14} /> PAINEL ADMINISTRATIVO</span><h1>Conteúdo de qualidade<br />começa na curadoria.</h1><p>Gerencie provas, confira as extrações e prepare novas questões para os estudantes.</p><button className="button button-light" onClick={() => onGo("import")}>Adicionar prova <ArrowRight size={16} /></button></div><div className="banner-art"><div className="art-ring art-ring-one" /><div className="art-ring art-ring-two" /><div className="art-card"><FileCheck2 size={25} /><div><b>Questões revisadas</b><span>Prontas para praticar</span></div><Check size={18} className="art-check" /></div><div className="art-float art-float-a">A · B · C · D · E</div><div className="art-float art-float-b"><Sparkles size={16} /></div></div></section>
    <div className="metrics-grid"><Metric icon={Clock3} label="Aguardando revisão" value={String(pending.length)} hint="Questões pendentes" color="amber" /><Metric icon={Activity} label="Em processamento" value={String(jobs.filter((j) => j.status === "PROCESSING" || j.status === "QUEUED").length)} hint="Importações ativas" color="blue" /><Metric icon={FileCheck2} label="Questões extraídas" value={String(totalQuestions)} hint="Em todas as provas" color="green" /><Metric icon={CircleHelp} label="Provas importadas" value={String(new Set(jobs.map((j) => j.edition.id)).size)} hint="Edições cadastradas" color="violet" /></div>
    <div className="section-row"><div><span className="eyebrow">ACOMPANHAMENTO</span><h2>Importações recentes</h2></div><button className="text-button" onClick={() => onGo("import")}>Ver e adicionar provas <ArrowRight size={15} /></button></div>
    <div className="panel table-panel"><div className="panel-heading"><div><h3>Fila de processamento</h3><p>O trabalho continua em segundo plano enquanto você usa o sistema.</p></div><span className="live-chip"><span /> ATUALIZAÇÃO AUTOMÁTICA</span></div>{jobs.length ? <div className="job-list">{jobs.slice(0, 5).map((job) => <JobRow key={job.id} job={job} />)}</div> : <EmptyState title="Ainda não há importações" text="Envie uma prova do ENADE para iniciar sua biblioteca de questões." action="Importar uma prova" onClick={() => onGo("import")} />}</div>
    <div className="section-row"><div><span className="eyebrow">PRÓXIMA AÇÃO</span><h2>Revisão de questões</h2></div><button className="text-button" onClick={() => onGo("review")}>Abrir curadoria <ArrowRight size={15} /></button></div>
    <div className="review-cta"><div className="cta-icon"><Pencil size={19} /></div><div><strong>{pending.length ? `${pending.length} questão${pending.length === 1 ? "" : "ões"} aguardando sua revisão` : "Sua fila de revisão está vazia"}</strong><span>Confira enunciados, alternativas e gabaritos antes da publicação.</span></div><button className="button button-outline" onClick={() => onGo("review")}>Revisar agora <ArrowRight size={15} /></button></div>
    {jobs.some((job) => job.status === "COMPLETED" && job.totalFound === 0) && <p className="inline-note">Alguns PDFs não geraram questões automaticamente. Confira a mensagem da importação e revise o padrão do documento.</p>}
    {jobs.length > 0 && <div className="sr-only">{jobs.filter((j) => j.status === "FAILED").length} falhas de processamento</div>}
  </div>;
}

function JobRow({ job }: { job: Job }) {
  const status: Record<string, [string, string]> = { QUEUED: ["Na fila", "status-queued"], PROCESSING: ["Extraindo questões", "status-processing"], COMPLETED: ["Concluída", "status-complete"], FAILED: ["Falhou", "status-failed"] };
  const [label, style] = status[job.status] || [job.status, ""];
  return <div className="job-row"><div className="file-badge"><FileCheck2 size={17} /></div><div className="job-main"><strong>ENADE {job.edition.year} · {job.edition.area}</strong><span>{job.status === "COMPLETED" ? `${job.totalFound} questões identificadas · ${job.totalFailed} precisam de atenção` : job.error || "Preparando processamento em segundo plano"}</span></div><span className={`status-pill ${style}`}><i />{label}</span><time>{new Date(job.createdAt).toLocaleDateString("pt-BR")}</time></div>;
}

function Metric({ icon: Icon, label, value, hint, color }: { icon: typeof Target; label: string; value: string; hint: string; color: string }) {
  return <div className="metric-card"><div className={`metric-icon metric-${color}`}><Icon size={17} /></div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-hint">{hint}</span></div>;
}

function EmptyState({ title, text, action, onClick }: { title: string; text: string; action?: string; onClick?: () => void }) {
  return <div className="empty-state"><span className="empty-icon"><BookOpenCheck size={19} /></span><strong>{title}</strong><p>{text}</p>{action && onClick && <button className="button button-outline" onClick={onClick}>{action}<ArrowRight size={15} /></button>}</div>;
}

function AdminReview({ questions, search, setSearch, notify, refresh }: { questions: Question[]; search: string; setSearch: (s: string) => void; notify: (s: string) => void; refresh: () => Promise<void> }) {
  const [selected, setSelected] = useState<Question | null>(null);
  const [status, setStatus] = useState("PENDING");
  const [allQuestions, setAllQuestions] = useState<Question[]>(questions);
  useEffect(() => { setAllQuestions(questions); }, [questions]);
  useEffect(() => {
    if (status === "PENDING") return;
    void api<Question[]>(`/api/admin/questions?status=${status}`).then(setAllQuestions).catch(() => setAllQuestions([]));
  }, [status]);
  const filtered = allQuestions.filter((q) => `${q.statement} ${q.edition.year} ${q.edition.area}`.toLowerCase().includes(search.toLowerCase()));
  async function action(id: string, actionName: "publish" | "discard") {
    try { await api(`/api/admin/questions/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName }) }); notify(actionName === "publish" ? "Questão publicada para os estudantes." : "Questão descartada."); setSelected(null); await refresh(); }
    catch (error) { notify(error instanceof Error ? error.message : "Não foi possível concluir a ação."); }
  }
  return <div className="page-stack"><div className="page-title-row"><div><span className="eyebrow">QUALIDADE DO CONTEÚDO</span><h1>Revisão e curadoria</h1><p>Revise a extração, ajuste o gabarito e decida o que será publicado.</p></div><span className="count-badge">{filtered.length} questão{filtered.length === 1 ? "" : "ões"}</span></div>
    <div className="filter-bar"><div className="search-field"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar questão, área ou ano" /></div><label className="select-wrap"><span className="sr-only">Status</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="PENDING">Pendentes</option><option value="PUBLISHED">Publicadas</option><option value="DISCARDED">Descartadas</option></select><ChevronDown size={15} /></label></div>
    {filtered.length ? <div className="question-list">{filtered.map((q) => <article className="question-card" key={q.id}><div className="question-card-top"><span className="question-number">QUESTÃO {String(q.originalNumber).padStart(2, "0")}</span><span className="edition-tag">{q.edition.year} · {q.edition.area}</span>{q.needsReview && <span className="review-needed"><CircleHelp size={13} /> Verificar extração</span>}</div><p className="question-preview">{q.statement}</p><div className="question-meta"><span>{q.options.length} de 5 alternativas</span>{q.correctOption && <span>Gabarito: <b>{q.correctOption}</b></span>}{q.annulled && <span className="annulled-tag">Anulada</span>}</div><div className="question-actions"><button className="button button-outline button-small" onClick={() => setSelected(q)}><Pencil size={14} />{status === "PENDING" ? "Revisar" : "Ver questão"}</button>{status === "PENDING" && <><button className="button button-publish button-small" onClick={() => void action(q.id, "publish")}><Check size={14} /> Publicar</button><button className="icon-button danger-icon" onClick={() => void action(q.id, "discard")} title="Descartar"><Trash2 size={15} /></button></>}</div></article>)}</div> : <EmptyState title={status === "PENDING" ? "Nenhuma questão para revisar" : "Nenhuma questão nesta categoria"} text={status === "PENDING" ? "Importe uma prova para preencher sua fila de revisão." : "As questões aparecerão aqui conforme forem classificadas."} />}
    {selected && <QuestionEditor question={selected} readOnly={status !== "PENDING"} onClose={() => setSelected(null)} onSave={async () => { setSelected(null); await refresh(); notify("Alterações salvas."); }} notify={notify} />}
  </div>;
}

function QuestionEditor({ question, readOnly, onClose, onSave, notify }: { question: Question; readOnly: boolean; onClose: () => void; onSave: () => Promise<void>; notify: (s: string) => void }) {
  const [statement, setStatement] = useState(question.statement);
  const [options, setOptions] = useState(["A", "B", "C", "D", "E"].map((label) => question.options.find((o) => o.label === label)?.text || ""));
  const [correct, setCorrect] = useState(question.correctOption || "");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try { await api(`/api/admin/questions/${question.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statement, options: options.map((text, i) => ({ label: String.fromCharCode(65 + i), text })), correctOption: correct || null, needsReview: false }) }); await onSave(); }
    catch (error) { notify(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="editor-modal"><div className="modal-head"><div><span className="eyebrow">{question.edition.year} · {question.edition.area}</span><h2>Questão {question.originalNumber}</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div><div className="editor-body"><a className="button button-outline button-small" href={`/api/admin/files/${question.edition.id}`} target="_blank" rel="noreferrer">Abrir PDF original para conferir a questão</a><label>Enunciado<textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={5} readOnly={readOnly} /></label><div className="editor-options"><div className="editor-label-row"><label>Alternativas</label><span>Selecione a resposta correta</span></div>{options.map((value, i) => <div className={`option-editor ${correct === String.fromCharCode(65 + i) ? "option-correct" : ""}`} key={i}><button type="button" className="option-letter" disabled={readOnly} onClick={() => setCorrect(String.fromCharCode(65 + i))}>{String.fromCharCode(65 + i)}</button><textarea aria-label={`Alternativa ${String.fromCharCode(65 + i)}`} value={value} onChange={(e) => setOptions(options.map((old, index) => index === i ? e.target.value : old))} rows={2} readOnly={readOnly} /></div>)}</div><div className="source-note"><CircleHelp size={15} /><span>{question.reviewNote || (question.needsReview ? "A extração identificou conteúdo que pode precisar de conferência." : "Confira o texto e confirme o gabarito antes de publicar.")}</span></div></div><div className="modal-foot"><button className="button button-ghost" onClick={onClose}>Fechar</button>{!readOnly && <button className="button button-primary" disabled={busy} onClick={() => void save()}>{busy ? "Salvando…" : "Salvar revisão"}<Check size={15} /></button>}</div></section></div>;
}

function StudentPractice({ editions, simulations, average, onStart, busy, onGo }: { editions: Edition[]; simulations: Sim[]; average: number; onStart: (edition: Edition) => void; busy: boolean; onGo: (view: string) => void }) {
  return <div className="page-stack"><section className="welcome-banner student-banner"><div className="welcome-copy"><span className="eyebrow eyebrow-light"><Sparkles size={14} /> SUA PRÓXIMA CONQUISTA</span><h1>Aprender é uma jornada.<br />Vamos dar mais um passo?</h1><p>Escolha uma edição e pratique no seu ritmo. Cada questão conta.</p><button className="button button-light" onClick={() => document.getElementById("editions")?.scrollIntoView({ behavior: "smooth" })}>Encontrar um simulado <ArrowDownRight size={16} /></button></div><div className="banner-art student-art"><div className="student-sun" /><div className="student-book"><BookOpenCheck size={34} /><span>seu progresso</span><i><b style={{ width: `${Math.max(18, average)}%` }} /></i></div><div className="student-star">✦</div><div className="student-dot" /></div></section>
    <div className="metrics-grid student-metrics"><Metric icon={Trophy} label="Simulados concluídos" value={String(simulations.length)} hint="Sua dedicação em números" color="amber" /><Metric icon={Target} label="Seu aproveitamento" value={`${average}%`} hint="Média dos seus resultados" color="blue" /><Metric icon={BookOpenCheck} label="Edições disponíveis" value={String(editions.length)} hint="Escolha a próxima" color="green" /></div>
    <div className="section-row" id="editions"><div><span className="eyebrow">PRÁTICA POR EDIÇÃO</span><h2>Escolha seu próximo simulado</h2></div><span className="section-subtle">Questões de provas anteriores</span></div>
    {editions.length ? <div className="edition-grid">{editions.map((edition, i) => <article className="edition-card" key={edition.id}><div className={`edition-illustration edition-art-${i % 3}`}><span className="edition-year">{edition.year}</span><BookOpenCheck size={28} /><span className="edition-lines"><i /><i /><i /></span></div><div className="edition-content"><span className="edition-kicker">EDIÇÃO ENADE · {edition.year}</span><h3>{edition.area}</h3><span className="edition-qcount">{edition._count?.questions || 0} questões publicadas</span><button className="button button-primary edition-start" onClick={() => onStart(edition)} disabled={busy}>{busy ? "Preparando…" : "Começar simulado"}<ArrowRight size={15} /></button></div></article>)}</div> : <EmptyState title="Novas edições a caminho" text="As provas aparecerão aqui assim que forem revisadas e publicadas pela equipe." />}
    {simulations.length > 0 && <div className="last-result-strip"><span className="result-mini-icon"><Trophy size={16} /></span><span><b>Você já concluiu {simulations.length} simulado{simulations.length === 1 ? "" : "s"}.</b> Continue construindo sua preparação, uma questão por vez.</span><button className="text-button" onClick={() => onGo("history")}>Ver histórico <ArrowRight size={14} /></button></div>}
  </div>;
}

function StudentHistory({ simulations, onOpen }: { simulations: Sim[]; onOpen: (sim: Sim) => void }) {
  const complete = simulations.filter((s) => s.status === "FINISHED");
  return <div className="page-stack"><div className="page-title-row"><div><span className="eyebrow">SUA EVOLUÇÃO</span><h1>Meu histórico</h1><p>Seus simulados concluídos e resultados, sempre à mão.</p></div><span className="count-badge">{complete.length} concluído{complete.length === 1 ? "" : "s"}</span></div>{complete.length ? <div className="history-list">{complete.map((sim) => { const percent = Math.round(((sim.score || 0) / Math.max(sim.total || 0, 1)) * 100); return <article className="history-card" key={sim.id}><div className={`history-score ${percent >= 70 ? "score-high" : percent >= 45 ? "score-mid" : "score-low"}`}><strong>{percent}%</strong><span>APROVEITAMENTO</span></div><div className="history-info"><span className="edition-kicker">ENADE · {sim.edition.year}</span><h3>{sim.edition.area}</h3><span>{(sim.score || 0)} acertos de {sim.total} questões válidas · {new Date(sim.finishedAt || sim.startedAt).toLocaleDateString("pt-BR")}</span></div><button className="button button-outline" onClick={() => onOpen(sim)}>Ver resultado <ArrowRight size={15} /></button></article>; })}</div> : <EmptyState title="Seu primeiro simulado espera por você" text="Quando concluir um simulado, seu resultado ficará guardado aqui." />}</div>;
}

function SimulationRun({ simulation, onDone, notify }: { simulation: Sim; onDone: (id: string) => Promise<void>; notify: (s: string) => void }) {
  const answers = simulation.answers || [];
  const [current, setCurrent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [selections, setSelections] = useState<Record<string, string | null>>(() => Object.fromEntries(answers.map((a) => [a.id, a.selected])));
  const active = answers[current];
  const snap = active?.snapshot;
  const answered = Object.values(selections).filter(Boolean).length;
  async function saveAnswer(answer: Answer, selected: string | null) {
    setSelections({ ...selections, [answer.id]: selected });
    try { await api(`/api/simulations/${simulation.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answerId: answer.id, selected }) }); }
    catch (error) { notify(error instanceof Error ? error.message : "Resposta não salva."); }
  }
  async function finish() {
    if (!window.confirm("Finalizar este simulado? Depois de concluir, suas respostas não poderão ser alteradas.")) return;
    setSaving(true);
    try { await api(`/api/simulations/${simulation.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ finish: true }) }); await onDone(simulation.id); }
    catch (error) { notify(error instanceof Error ? error.message : "Não foi possível finalizar."); }
    finally { setSaving(false); }
  }
  if (!active || !snap) return <EmptyState title="Este simulado não tem questões" text="Volte para a prática e escolha outra edição." />;
  return <div className="simulation-layout"><div className="sim-topline"><button className="text-button" onClick={() => { if (window.confirm("Sair do simulado? Suas respostas salvas continuam disponíveis.")) window.location.reload(); }}><ArrowLeft size={15} /> Sair do simulado</button><span>ENADE {simulation.edition.year} <i>/</i> {simulation.edition.area}</span><span>{answered} de {answers.length} respondidas</span></div><div className="sim-progress"><i style={{ width: `${((current + 1) / answers.length) * 100}%` }} /></div><div className="sim-main"><section className="sim-question"><span className="eyebrow">QUESTÃO {String(snap.originalNumber).padStart(2, "0")} <i>·</i> {current + 1} DE {answers.length}</span><h1>{snap.statement}</h1><div className="sim-options">{snap.options.map((option) => <button key={option.label} className={`sim-option ${selections[active.id] === option.label ? "sim-option-selected" : ""}`} onClick={() => void saveAnswer(active, option.label)}><span className="sim-option-letter">{option.label}</span><span>{option.text}</span>{selections[active.id] === option.label && <Check size={17} className="sim-selected-check" />}</button>)}</div><div className="sim-controls"><button className="button button-outline" disabled={current === 0} onClick={() => setCurrent(current - 1)}><ArrowLeft size={15} /> Anterior</button><button className="button button-primary" onClick={() => current < answers.length - 1 ? setCurrent(current + 1) : void finish()} disabled={saving}>{current === answers.length - 1 ? (saving ? "Finalizando…" : "Finalizar simulado") : "Próxima questão"}<ArrowRight size={15} /></button></div></section><aside className="sim-navigator"><div className="navigator-head"><div><strong>Suas questões</strong><span>Escolha para navegar</span></div><span>{answered}/{answers.length}</span></div><div className="question-dots">{answers.map((answer, i) => <button key={answer.id} onClick={() => setCurrent(i)} className={`${i === current ? "dot-current" : ""} ${selections[answer.id] ? "dot-answered" : ""}`}>{i + 1}</button>)}</div><div className="navigator-legend"><span><i className="legend-done" /> Respondida</span><span><i /> Em aberto</span></div><div className="navigator-tip"><Clock3 size={15} />Você pode avançar e voltar livremente antes de finalizar.</div></aside></div></div>;
}

function SimulationResult({ simulation, onBack }: { simulation: Sim; onBack: () => void }) {
  const answers = simulation.answers || [];
  const valid = answers.filter((a) => !a.snapshot.annulled);
  const score = simulation.score || 0;
  const percent = Math.round((score / Math.max(simulation.total || 0, 1)) * 100);
  return <div className="page-stack"><button className="text-button back-link" onClick={onBack}><ArrowLeft size={15} /> Voltar ao histórico</button><section className="result-hero"><div className="result-score-ring"><span>{percent}<small>%</small></span><i>APROVEITAMENTO</i></div><div className="result-hero-copy"><span className="eyebrow eyebrow-light">SIMULADO CONCLUÍDO</span><h1>Mais um passo na sua preparação.</h1><p>{simulation.edition.year} · {simulation.edition.area}</p><div className="result-summary"><span><b>{score}</b> acertos</span><i /><span><b>{Math.max(0, (simulation.total || 0) - score)}</b> para revisar</span><i /><span><b>{answers.length - valid.length}</b> anuladas</span></div></div></section><div className="section-row"><div><span className="eyebrow">REVISÃO DO SIMULADO</span><h2>Questão por questão</h2></div><span className="section-subtle">Gabarito e suas respostas</span></div><div className="result-question-list">{answers.map((answer) => { const snap = answer.snapshot; const annulled = Boolean(snap.annulled); return <article className={`result-question ${annulled ? "result-annulled" : answer.isCorrect ? "result-correct" : "result-wrong"}`} key={answer.id}><div className="result-q-icon">{annulled ? "—" : answer.isCorrect ? <Check size={16} /> : <X size={16} />}</div><div className="result-q-body"><span className="edition-kicker">QUESTÃO {snap.originalNumber} {annulled ? "· ANULADA" : answer.isCorrect ? "· ACERTOU" : "· REVISE ESTA QUESTÃO"}</span><p>{snap.statement}</p><div className="result-answer-lines"><span>Sua resposta: <b>{answer.selected || "Não respondida"}</b></span>{!annulled && <span>Gabarito: <b>{snap.correctOption}</b></span>}</div></div></article>; })}</div></div>;
}
