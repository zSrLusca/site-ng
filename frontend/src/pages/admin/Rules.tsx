import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";
import { useAuth } from "../../store/auth";
import type { ActionSpec, RuleFilter, RuleSection } from "../../data/regras";

const emptyFilter = { slug: "", label: "", hint: "", sortOrder: 0, active: true };

const emptySpec: ActionSpec = {
  policiaisMin: "",
  criminososMin: "",
  criminososMax: "",
  refensMax: "",
  cooldown: "",
  nivel: "",
  negociacao: "",
  fuga: "",
};

const emptySection = {
  slug: "",
  category: "",
  number: "",
  title: "",
  intro: "",
  itemsText: "",
  sortOrder: 0,
  active: true,
  hasSpec: false,
  spec: emptySpec,
};

type RulesPayload = { filters: RuleFilter[]; sections: RuleSection[] };

function parseItems(text: string) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

export function AdminRules() {
  const token = useAuth((s) => s.token)!;
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-rules"],
    queryFn: () => api.authGet("/admin/rules", token) as Promise<RulesPayload>,
  });
  const [tab, setTab] = useState<"sections" | "filters">("sections");
  const [filterForm, setFilterForm] = useState(emptyFilter);
  const [editFilter, setEditFilter] = useState<string | null>(null);
  const [sectionForm, setSectionForm] = useState(emptySection);
  const [editSection, setEditSection] = useState<string | null>(null);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin-rules"] });
    qc.invalidateQueries({ queryKey: ["store-rules"] });
  }

  const saveFilter = useMutation({
    mutationFn: () =>
      editFilter
        ? api.put(`/admin/rule-filters/${editFilter}`, filterForm, token)
        : api.post("/admin/rule-filters", filterForm, token),
    onSuccess: () => {
      invalidate();
      setFilterForm(emptyFilter);
      setEditFilter(null);
    },
  });

  const delFilter = useMutation({
    mutationFn: (slug: string) => api.del(`/admin/rule-filters/${slug}`, token),
    onSuccess: invalidate,
  });

  const saveSection = useMutation({
    mutationFn: () => {
      const body = {
        slug: sectionForm.slug,
        category: sectionForm.category,
        number: sectionForm.number,
        title: sectionForm.title,
        intro: sectionForm.intro || null,
        items: parseItems(sectionForm.itemsText),
        spec: sectionForm.hasSpec ? sectionForm.spec : null,
        sortOrder: sectionForm.sortOrder,
        active: sectionForm.active,
      };
      return editSection
        ? api.put(`/admin/rule-sections/${editSection}`, body, token)
        : api.post("/admin/rule-sections", body, token);
    },
    onSuccess: () => {
      invalidate();
      setSectionForm(emptySection);
      setEditSection(null);
    },
  });

  const delSection = useMutation({
    mutationFn: (id: string) => api.del(`/admin/rule-sections/${id}`, token),
    onSuccess: invalidate,
  });

  const filters = q.data?.filters ?? [];
  const sections = q.data?.sections ?? [];

  function onFilterSubmit(e: FormEvent) {
    e.preventDefault();
    saveFilter.mutate();
  }

  function onSectionSubmit(e: FormEvent) {
    e.preventDefault();
    saveSection.mutate();
  }

  function startEditSection(s: RuleSection) {
    setEditSection(s.id);
    setSectionForm({
      slug: s.slug,
      category: s.category,
      number: s.number,
      title: s.title,
      intro: s.intro || "",
      itemsText: (s.items ?? []).join("\n"),
      sortOrder: s.sortOrder ?? 0,
      active: s.active !== false,
      hasSpec: Boolean(s.spec),
      spec: { ...emptySpec, ...(s.spec ?? {}) },
    });
    setTab("sections");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="admin-page">
      <h1>Regras</h1>
      <p className="hint">O que você salvar aqui aparece em /regras na loja.</p>
      <div className="status-filters">
        <button type="button" className={`status-chip ${tab === "sections" ? "active" : ""}`} onClick={() => setTab("sections")}>
          Seções <b>{sections.length}</b>
        </button>
        <button type="button" className={`status-chip ${tab === "filters" ? "active" : ""}`} onClick={() => setTab("filters")}>
          Filtros <b>{filters.length}</b>
        </button>
      </div>

      {tab === "filters" && (
        <>
          <form onSubmit={onFilterSubmit} className="form-section">
            <h2>{editFilter ? "Editar filtro" : "Novo filtro"}</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="rf-label">Nome</label>
                <input id="rf-label" required value={filterForm.label} onChange={(e) => setFilterForm({ ...filterForm, label: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="rf-slug">Slug {editFilter ? "(fixo)" : "(opcional)"}</label>
                <input id="rf-slug" value={filterForm.slug} disabled={!!editFilter} onChange={(e) => setFilterForm({ ...filterForm, slug: e.target.value })} placeholder="ex: convivencia" />
              </div>
              <div className="field">
                <label htmlFor="rf-hint">Dica</label>
                <input id="rf-hint" value={filterForm.hint} onChange={(e) => setFilterForm({ ...filterForm, hint: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="rf-order">Ordem</label>
                <input id="rf-order" type="number" value={filterForm.sortOrder} onChange={(e) => setFilterForm({ ...filterForm, sortOrder: Number(e.target.value) })} />
              </div>
            </div>
            <label className="check">
              <input type="checkbox" checked={filterForm.active} onChange={(e) => setFilterForm({ ...filterForm, active: e.target.checked })} />
              Visível na loja
            </label>
            <div className="row-actions" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" type="submit">{editFilter ? "Salvar filtro" : "Criar filtro"}</button>
              {editFilter && (
                <button type="button" className="btn btn-ghost" onClick={() => { setEditFilter(null); setFilterForm(emptyFilter); }}>
                  Cancelar
                </button>
              )}
            </div>
            {saveFilter.error instanceof Error && <p className="hint" style={{ color: "var(--danger)" }}>{saveFilter.error.message}</p>}
          </form>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nome</th><th>Slug</th><th>Ordem</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filters.map((f) => (
                  <tr key={f.slug}>
                    <td>{f.label}</td>
                    <td>{f.slug}</td>
                    <td>{f.sortOrder ?? 0}</td>
                    <td><span className={`tag ${f.active !== false ? "ok" : "bad"}`}>{f.active !== false ? "Ativo" : "Off"}</span></td>
                    <td className="row-actions">
                      <button type="button" className="btn btn-ghost" onClick={() => { setEditFilter(f.slug); setFilterForm({ slug: f.slug, label: f.label, hint: f.hint ?? "", sortOrder: f.sortOrder ?? 0, active: f.active !== false }); }}>Editar</button>
                      <button type="button" className="btn btn-ghost" onClick={() => { if (confirm(`Excluir o filtro "${f.label}"?`)) delFilter.mutate(f.slug); }}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "sections" && (
        <>
          <form onSubmit={onSectionSubmit} className="form-section">
            <h2>{editSection ? "Editar regra" : "Nova regra"}</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="rs-title">Título</label>
                <input id="rs-title" required value={sectionForm.title} onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="rs-number">Número</label>
                <input id="rs-number" required value={sectionForm.number} onChange={(e) => setSectionForm({ ...sectionForm, number: e.target.value })} placeholder="13.2" />
              </div>
              <div className="field">
                <label htmlFor="rs-cat">Filtro / categoria</label>
                <select id="rs-cat" required value={sectionForm.category} onChange={(e) => setSectionForm({ ...sectionForm, category: e.target.value })}>
                  <option value="">Selecione</option>
                  {filters.map((f) => (
                    <option key={f.slug} value={f.slug}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="rs-slug">Slug (opcional)</label>
                <input id="rs-slug" value={sectionForm.slug} onChange={(e) => setSectionForm({ ...sectionForm, slug: e.target.value })} placeholder="ex: galinheiro" />
              </div>
              <div className="field">
                <label htmlFor="rs-order">Ordem</label>
                <input id="rs-order" type="number" value={sectionForm.sortOrder} onChange={(e) => setSectionForm({ ...sectionForm, sortOrder: Number(e.target.value) })} />
              </div>
              <div className="field span-2">
                <label htmlFor="rs-intro">Introdução (opcional)</label>
                <textarea id="rs-intro" value={sectionForm.intro} onChange={(e) => setSectionForm({ ...sectionForm, intro: e.target.value })} />
              </div>
              <div className="field span-2">
                <label htmlFor="rs-items">Itens (um por linha)</label>
                <textarea id="rs-items" required rows={6} value={sectionForm.itemsText} onChange={(e) => setSectionForm({ ...sectionForm, itemsText: e.target.value })} placeholder="Primeira regra&#10;Segunda regra" />
              </div>
            </div>
            <label className="check">
              <input type="checkbox" checked={sectionForm.active} onChange={(e) => setSectionForm({ ...sectionForm, active: e.target.checked })} />
              Visível na loja
            </label>
            <label className="check">
              <input type="checkbox" checked={sectionForm.hasSpec} onChange={(e) => setSectionForm({ ...sectionForm, hasSpec: e.target.checked })} />
              É uma ação (limites de polícia, criminosos, CD…)
            </label>
            {sectionForm.hasSpec && (
              <div className="form-grid" style={{ marginTop: 12 }}>
                <div className="field"><label>Policiais mín.</label><input value={sectionForm.spec.policiaisMin} onChange={(e) => setSectionForm({ ...sectionForm, spec: { ...sectionForm.spec, policiaisMin: e.target.value } })} /></div>
                <div className="field"><label>Criminosos mín.</label><input value={sectionForm.spec.criminososMin} onChange={(e) => setSectionForm({ ...sectionForm, spec: { ...sectionForm.spec, criminososMin: e.target.value } })} /></div>
                <div className="field"><label>Máx. criminosos</label><input value={sectionForm.spec.criminososMax} onChange={(e) => setSectionForm({ ...sectionForm, spec: { ...sectionForm.spec, criminososMax: e.target.value } })} /></div>
                <div className="field"><label>Máx. reféns</label><input value={sectionForm.spec.refensMax} onChange={(e) => setSectionForm({ ...sectionForm, spec: { ...sectionForm.spec, refensMax: e.target.value } })} /></div>
                <div className="field"><label>Cooldown</label><input value={sectionForm.spec.cooldown} onChange={(e) => setSectionForm({ ...sectionForm, spec: { ...sectionForm.spec, cooldown: e.target.value } })} /></div>
                <div className="field"><label>Nível</label><input value={sectionForm.spec.nivel} onChange={(e) => setSectionForm({ ...sectionForm, spec: { ...sectionForm.spec, nivel: e.target.value } })} /></div>
                <div className="field"><label>Negociação</label><input value={sectionForm.spec.negociacao} onChange={(e) => setSectionForm({ ...sectionForm, spec: { ...sectionForm.spec, negociacao: e.target.value } })} /></div>
                <div className="field"><label>Fuga</label><input value={sectionForm.spec.fuga ?? ""} onChange={(e) => setSectionForm({ ...sectionForm, spec: { ...sectionForm.spec, fuga: e.target.value } })} /></div>
              </div>
            )}
            <div className="row-actions" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" type="submit">{editSection ? "Salvar regra" : "Criar regra"}</button>
              {editSection && (
                <button type="button" className="btn btn-ghost" onClick={() => { setEditSection(null); setSectionForm(emptySection); }}>
                  Cancelar
                </button>
              )}
            </div>
            {saveSection.error instanceof Error && <p className="hint" style={{ color: "var(--danger)" }}>{saveSection.error.message}</p>}
          </form>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nº</th><th>Título</th><th>Filtro</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {sections.map((s) => (
                  <tr key={s.id}>
                    <td>{s.number}</td>
                    <td>{s.title}</td>
                    <td>{s.category}</td>
                    <td><span className={`tag ${s.active !== false ? "ok" : "bad"}`}>{s.active !== false ? "Ativa" : "Off"}</span></td>
                    <td className="row-actions">
                      <button type="button" className="btn btn-ghost" onClick={() => startEditSection(s)}>Editar</button>
                      <button type="button" className="btn btn-ghost" onClick={() => { if (confirm(`Excluir "${s.title}"?`)) delSection.mutate(s.id); }}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
