import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Scale } from "lucide-react";
import { Seo } from "../../components/store/Seo";
import { api } from "../../api";
import {
  ACTION_FILTERS,
  RULE_FILTERS,
  RULE_SECTIONS,
  actionFiltersFrom,
  isKnownRuleFilter,
  sectionsForFilter,
  withTodasFilter,
  type ActionSpec,
  type RuleFilter,
  type RuleSection,
} from "../../data/regras";

function SpecGrid({ spec }: { spec: ActionSpec }) {
  const rows = [
    ["Policiais mín.", spec.policiaisMin],
    ["Criminosos mín.", spec.criminososMin],
    ["Máx. criminosos", spec.criminososMax],
    ["Máx. reféns", spec.refensMax],
    ["Cooldown", spec.cooldown],
    ["Nível", spec.nivel],
    ["Negociação", spec.negociacao],
    ...(spec.fuga ? [["Fuga", spec.fuga] as const] : []),
  ];
  return (
    <dl className="rule-spec">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function asItems(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}

function normalizeSections(rows: RuleSection[]): RuleSection[] {
  return rows.map((s) => ({
    ...s,
    items: asItems(s.items),
    spec: s.spec && typeof s.spec === "object" ? s.spec : undefined,
  }));
}

export function RegrasPage() {
  const { filtro } = useParams();
  const slug = filtro || "todas";
  const q = useQuery({
    queryKey: ["store-rules"],
    queryFn: () => api.get("/store/rules") as Promise<{ filters: RuleFilter[]; sections: RuleSection[] }>,
  });

  const useApi = Boolean(q.data && (q.data.filters.length || q.data.sections.length));
  const filters = withTodasFilter(useApi ? q.data!.filters : RULE_FILTERS);
  const sections = normalizeSections(useApi ? q.data!.sections : RULE_SECTIONS);
  const actionNav = useApi ? actionFiltersFrom(sections) : ACTION_FILTERS;

  if (q.isSuccess && !isKnownRuleFilter(slug, filters, sections)) {
    return <Navigate to="/regras" replace />;
  }

  const visible = sectionsForFilter(slug, sections);
  const current = filters.find((f) => f.slug === slug);
  const title = current?.label || visible[0]?.title || "Leis Gerais";

  return (
    <main className="container rules-page">
      <Seo
        title={`${title} — Leis Gerais | Nova Garoa RP`}
        description="Regulamento oficial da Nova Garoa RP. Compras no site são doações e não há reembolso."
      />

      <p className="breadcrumb">
        <Link to="/">Início</Link>
        <span>/</span>
        <Link to="/regras">Regras</Link>
        {slug !== "todas" && (
          <>
            <span>/</span>
            <span>{title}</span>
          </>
        )}
      </p>

      <header className="rules-hero">
        <p className="kicker">Regulamento oficial</p>
        <h1>Leis Gerais — Nova Garoa RP</h1>
        <p>
          Roleplay, respeito e imersão. Use os filtros para ver prisões, convivência, regras policiais,
          ações e a política da loja.
        </p>
      </header>

      <aside className="rules-donate" role="note">
        <Scale size={22} />
        <div>
          <strong>Compras no site são doações. Não existe reembolso.</strong>
          <p>
            VIP, itens e cargos digitais são contribuição voluntária à cidade. O valor pago não é
            estornado em nenhuma hipótese — inclusive banimento, desistência ou troca de personagem.{" "}
            <Link to="/regras/loja">Ler a regra da loja</Link>
          </p>
        </div>
      </aside>

      <nav className="rules-filters" aria-label="Filtros das regras">
        {filters.map((f) => {
          const href = f.slug === "todas" ? "/regras" : `/regras/${f.slug}`;
          return (
            <Link key={f.slug} to={href} className={`status-chip ${slug === f.slug ? "active" : ""}`} title={f.hint}>
              {f.label}
            </Link>
          );
        })}
      </nav>

      {(slug === "todas" || slug === "acao" || actionNav.some((a) => a.slug === slug)) && (
        <nav className="rules-filters rules-actions-nav" aria-label="Ações específicas">
          <Link to="/regras/acao" className={`status-chip ${slug === "acao" ? "active" : ""}`}>
            Todas as ações
          </Link>
          {actionNav.map((a) => (
            <Link key={a.slug} to={`/regras/${a.slug}`} className={`status-chip ${slug === a.slug ? "active" : ""}`}>
              {a.label}
            </Link>
          ))}
        </nav>
      )}

      <div className="rules-list">
        {visible.map((section) => (
          <article key={section.id} id={section.slug} className="rules-card">
            <header>
              <span className="rules-num">{section.number}</span>
              <div>
                <h2>{section.title}</h2>
                {section.intro && <p className="rules-intro">{section.intro}</p>}
              </div>
            </header>
            {section.spec && <SpecGrid spec={section.spec} />}
            <ul>
              {section.items.map((item, i) => (
                <li key={`${section.id}-${i}`}>{item}</li>
              ))}
            </ul>
            {section.category === "acao" && slug === "todas" && section.spec && (
              <Link className="rules-more" to={`/regras/${section.slug}`}>
                Ver só esta ação
              </Link>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
