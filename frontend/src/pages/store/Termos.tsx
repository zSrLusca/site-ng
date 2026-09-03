import { Link } from "react-router-dom";
import { Scale } from "lucide-react";
import { Seo } from "../../components/store/Seo";
import { useBootstrap } from "../../hooks/useBootstrap";

const FALLBACK = `TERMOS DE COMPRA E DOAÇÃO — NOVA GAROA RP

Ao finalizar um pedido nesta loja, você declara que leu, entendeu e aceita integralmente estes termos.

1. NATUREZA DA TRANSAÇÃO
O valor pago nesta loja é uma doação voluntária para manutenção da cidade Nova Garoa RP.
Não se trata de compra de produto físico nem de serviço com direito de arrependimento.

2. SEM REEMBOLSO
Não existe reembolso, estorno, cancelamento ou devolução do valor após o pagamento, inclusive em caso de desistência, banimento, troca de personagem ou erro nos dados informados.

3. BENEFÍCIO DIGITAL
A doação pode liberar VIP, cargo ou itens digitais. Doar não garante imunidade nem tratamento especial.

4. REGRAS
O doador deve cumprir as Leis Gerais da Nova Garoa RP.

Ao marcar a caixa no checkout, você confirma que a transação é uma doação e que não há reembolso.`;

export function TermosPage() {
  const { data } = useBootstrap();
  const text = String(data?.settings?.storeTerms || FALLBACK);

  return (
    <main className="container rules-page">
      <Seo
        title="Termos de compra e doação | Nova Garoa RP"
        description="Ao comprar na loja da Nova Garoa RP você doa à cidade. Não há reembolso."
      />
      <p className="breadcrumb">
        <Link to="/">Início</Link>
        <span>/</span>
        <span>Termos</span>
      </p>

      <header className="rules-hero">
        <p className="kicker">Obrigatório para comprar</p>
        <h1>Termos de compra e doação</h1>
        <p>Leia com atenção. Sem aceitar estes termos no checkout, o pedido não é gerado.</p>
      </header>

      <aside className="rules-donate" role="note">
        <Scale size={22} />
        <div>
          <strong>Compras no site são doações. Não existe reembolso.</strong>
          <p>
            Também vale o regulamento da cidade. <Link to="/regras">Ver Leis Gerais</Link>
          </p>
        </div>
      </aside>

      <article className="rules-card terms-doc">{text}</article>

      <div className="row-actions" style={{ marginTop: 18 }}>
        <Link to="/checkout" className="btn btn-primary">Ir para o checkout</Link>
        <Link to="/regras/loja" className="btn btn-ghost">Regra da loja</Link>
      </div>
    </main>
  );
}
