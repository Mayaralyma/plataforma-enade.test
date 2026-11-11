"use client";

import { useState, type FormEvent } from "react";
import { createAuthClient } from "better-auth/react";
import { ArrowRight, BookOpenCheck, LockKeyhole, Sparkles } from "lucide-react";

const authClient = createAuthClient();

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = mode === "login"
        ? await authClient.signIn.email({ email: String(form.get("email")), password: String(form.get("password")) })
        : await authClient.signUp.email({ name: String(form.get("name")), email: String(form.get("email")), password: String(form.get("password")) });
      if (result.error) setError(result.error.message || "Não foi possível entrar.");
      else window.location.reload();
    } catch { setError("Não foi possível conectar ao sistema. Tente novamente."); }
    finally { setLoading(false); }
  }

  return <main className="auth-layout">
    <section className="auth-story">
      <div className="brand"><span className="brand-icon"><BookOpenCheck size={19} /></span><span>Trilha<span className="brand-light"> ENADE</span></span></div>
      <div className="story-copy"><span className="eyebrow"><Sparkles size={14} /> PREPARAÇÃO COM PROPÓSITO</span><h1>Seu próximo passo começa com uma questão.</h1><p>Pratique com provas anteriores, entenda seu desempenho e construa confiança para o ENADE.</p><div className="story-note"><span className="note-mark">“</span><span>Um pouco melhor a cada simulado.</span></div></div>
      <div className="story-footer">QUESTÕES REAIS · PRÁTICA NO SEU RITMO</div>
    </section>
    <section className="auth-panel"><div className="auth-card">
      <div className="mobile-brand brand"><span className="brand-icon"><BookOpenCheck size={19} /></span><span>Trilha<span className="brand-light"> ENADE</span></span></div>
      <div className="auth-heading"><span className="auth-symbol"><LockKeyhole size={18} /></span><div><h2>{mode === "login" ? "Boas-vindas de volta" : "Crie sua conta"}</h2><p>{mode === "login" ? "Entre para continuar sua preparação." : "Comece a acompanhar sua evolução."}</p></div></div>
      <form onSubmit={submit} className="auth-form">
        {mode === "register" && <label>Seu nome<input name="name" placeholder="Como podemos chamar você?" required minLength={2} /></label>}
        <label>E-mail<input name="email" type="email" placeholder="voce@exemplo.com" required autoComplete="email" /></label>
        <label>Senha<input name="password" type="password" placeholder="Mínimo de 8 caracteres" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="button button-primary auth-submit" disabled={loading}>{loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar minha conta"}<ArrowRight size={16} /></button>
      </form>
      <p className="auth-toggle">{mode === "login" ? "Ainda não tem uma conta?" : "Já tem uma conta?"} <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Cadastre-se" : "Fazer login"}</button></p>
      <div className="secure-note"><LockKeyhole size={13} /> Seus dados são protegidos e usados apenas para sua experiência.</div>
    </div><div className="panel-footer">PLATAFORMA DE SIMULADOS INTERATIVOS DO ENADE</div></section>
  </main>;
}
