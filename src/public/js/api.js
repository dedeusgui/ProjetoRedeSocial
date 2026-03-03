/* ==============================================
   api.js — Camada de API mock para feed
   Sem fetch real. Sem lógica de UI. Sem DOM.
   ============================================== */

const api = (() => {
  /* ── Dados mock ── */

  const MOCK_POSTS = [
    {
      id: "post_001",
      author: "marcosdev",
      title: "Como funciona o event loop no Node.js",
      content:
        "O event loop é o mecanismo que permite ao Node.js realizar operações não-bloqueantes. " +
        "Ele funciona em fases: timers, pending callbacks, idle/prepare, poll, check e close callbacks. " +
        "Cada fase tem sua própria fila de callbacks. Entender essa sequência é essencial para evitar " +
        "problemas de performance e comportamentos inesperados em aplicações que dependem de I/O intensivo.",
      tags: ["node.js", "event-loop", "backend"],
      trend: "positive",
      createdAt: "2026-03-02T18:30:00Z",
    },
    {
      id: "post_002",
      author: "ana.santos",
      title: "Reflexão sobre clean architecture em projetos pequenos",
      content:
        "Nem todo projeto precisa de quatro camadas de abstração. Clean architecture é poderosa " +
        "em sistemas complexos, mas em scripts e MVPs pode adicionar overhead desnecessário. " +
        "O ponto-chave é entender o contexto: a arquitetura deve servir ao problema, não ao contrário.",
      tags: ["arquitetura", "clean-code"],
      trend: "neutral",
      createdAt: "2026-03-01T14:15:00Z",
    },
    {
      id: "post_003",
      author: "lucas.f",
      title: "Minha lista de frameworks favoritos",
      content:
        "Aqui estão os frameworks que eu mais gosto de usar no dia a dia. Cada um tem seus pontos " +
        "fortes e fracos, mas no final das contas tudo depende do contexto do projeto e da equipe envolvida.",
      tags: ["opinião", "frameworks"],
      trend: "negative",
      createdAt: "2026-02-28T10:45:00Z",
    },
    {
      id: "post_004",
      author: "dev.carla",
      title: "Entendendo closures em JavaScript",
      content:
        "Uma closure é a combinação de uma função com referências ao seu escopo léxico. " +
        "Isso permite que funções internas acessem variáveis de funções externas mesmo após a " +
        "execução da função externa ter terminado. Closures são a base de padrões como módulos, " +
        "callbacks e currying.",
      tags: ["javascript", "fundamentos"],
      trend: "positive",
      createdAt: "2026-02-27T22:00:00Z",
    },
    {
      id: "post_005",
      author: "renato.ops",
      title: "Docker Compose para ambientes de desenvolvimento",
      content:
        "Configurar um docker-compose.yml para dev local economiza horas de setup. " +
        "Definir serviços como banco de dados, cache e a própria aplicação em containers isolados " +
        "garante que todos na equipe trabalhem com o mesmo ambiente, evitando o clássico " +
        "'funciona na minha máquina'.",
      tags: ["docker", "devops", "produtividade"],
      trend: "positive",
      createdAt: "2026-02-26T09:20:00Z",
    },
    {
      id: "post_006",
      author: "julia.code",
      title: "Por que aprender SQL ainda importa",
      content:
        "ORMs abstraem muita coisa, mas entender SQL puro é fundamental para otimizar queries, " +
        "debugar problemas de performance e compreender o que realmente acontece no banco. " +
        "Saber escrever JOINs, subqueries e window functions faz diferença real no dia a dia.",
      tags: ["sql", "banco-de-dados", "fundamentos"],
      trend: "neutral",
      createdAt: "2026-02-25T16:50:00Z",
    },
    {
      id: "post_007",
      author: "pedro.a",
      title: "Acessibilidade não é opcional",
      content:
        "Implementar atributos ARIA, contraste adequado, navegação por teclado e textos alternativos " +
        "não é luxo — é responsabilidade. Cerca de 15% da população mundial vive com alguma forma " +
        "de deficiência. Ignorar acessibilidade é excluir usuários.",
      tags: ["acessibilidade", "frontend", "ux"],
      trend: "positive",
      createdAt: "2026-02-24T11:30:00Z",
    },
    {
      id: "post_008",
      author: "thiago.m",
      title: "Meu setup de terminal customizado",
      content:
        "Uso Oh My Zsh com o tema Powerlevel10k, algumas aliases e scripts personalizados. " +
        "A produtividade melhorou bastante, mas o mais importante é adaptar a ferramenta ao seu fluxo, " +
        "não o contrário.",
      tags: ["terminal", "produtividade"],
      trend: "neutral",
      createdAt: "2026-02-23T08:10:00Z",
    },
  ];

  /* ── Helpers ── */

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function sortByDateDesc(posts) {
    return [...posts].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
  }

  /* ── API pública ── */

  const feed = {
    /**
     * Lista posts do feed em ordem cronológica descendente.
     * @param {Object}  options
     * @param {string}  [options.cursor]  - ID do último post retornado (paginação)
     * @param {number}  [options.limit=5] - Máximo de posts por página
     * @returns {Promise<{ok: boolean, data: {posts: Array}}>}
     */
    async list({ cursor = null, limit = 5 } = {}) {
      await delay(400);

      const sorted = sortByDateDesc(MOCK_POSTS);

      let startIndex = 0;
      if (cursor) {
        const cursorIndex = sorted.findIndex((p) => p.id === cursor);
        startIndex = cursorIndex === -1 ? 0 : cursorIndex + 1;
      }

      const posts = sorted.slice(startIndex, startIndex + limit);

      return {
        ok: true,
        data: {
          posts,
        },
      };
    },
  };

  return { feed };
})();
