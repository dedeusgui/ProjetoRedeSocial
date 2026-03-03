const api = (() => {
  const MOCK_POSTS = [
    {
      id: "post_1006",
      author: "iris.data",
      title: "Indices compostos para busca textual",
      content: "Criar indice composto por status e createdAt reduz custo de leitura no feed cronologico e simplifica paginacao por cursor.",
      tags: ["mongodb", "performance"],
      trend: "positive",
      createdAt: "2026-03-03T12:40:00.000Z"
    },
    {
      id: "post_1005",
      author: "leo.ops",
      title: "Checklist de deploy sem recomendacao",
      content: "Separar feed cronologico de jobs de ranking evita acoplamento com sinal de popularidade e protege a regra de produto.",
      tags: ["arquitetura", "backend"],
      trend: "neutral",
      createdAt: "2026-03-03T10:05:00.000Z"
    },
    {
      id: "post_1004",
      author: "nina.front",
      title: "Estados de carregamento discretos",
      content: "Skeleton curto e sem ruido visual melhora leitura e nao compete com o conteudo principal quando o feed termina de carregar.",
      tags: ["frontend", "ux"],
      trend: "positive",
      createdAt: "2026-03-02T20:15:00.000Z"
    },
    {
      id: "post_1003",
      author: "caio.dev",
      title: "Padrao para validacao de payload",
      content: "Padronizar mensagens de erro por code e message acelera diagnostico e mantem contrato entre backend e frontend.",
      tags: ["api", "qualidade"],
      trend: "neutral",
      createdAt: "2026-03-01T17:35:00.000Z"
    },
    {
      id: "post_1002",
      author: "tami.res",
      title: "Escrita tecnica objetiva",
      content: "Texto curto, contexto minimo e exemplos concretos elevam entendimento sem depender de engajamento por metricas.",
      tags: ["comunicacao"],
      trend: "negative",
      createdAt: "2026-02-28T13:50:00.000Z"
    },
    {
      id: "post_1001",
      author: "rafa.db",
      title: "Cursor baseado em createdAt e id",
      content: "Quando dois posts tem mesmo horario, combinar createdAt com id evita saltos de pagina e preserva ordenacao estavel.",
      tags: ["database", "paginacao"],
      trend: "positive",
      createdAt: "2026-02-27T08:30:00.000Z"
    }
  ];

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function randomDelay(min = 300, max = 500) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function sortByCreatedAtDesc(posts) {
    return [...posts].sort((a, b) => {
      const left = new Date(a.createdAt).getTime();
      const right = new Date(b.createdAt).getTime();
      return right - left;
    });
  }

  const feed = {
    /**
     * @param {{ cursor?: string | null, limit?: number }} params
     * @returns {Promise<{ ok: true, data: { posts: Array } } | { ok: false, error: { code: string, message: string } }>} 
     */
    async list({ cursor = null, limit = 10 } = {}) {
      await wait(randomDelay());

      const ordered = sortByCreatedAtDesc(MOCK_POSTS);
      const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;

      let start = 0;
      if (cursor) {
        const index = ordered.findIndex((item) => item.id === cursor);
        start = index >= 0 ? index + 1 : 0;
      }

      const posts = ordered.slice(start, start + safeLimit);

      return {
        ok: true,
        data: { posts }
      };

      // TODO: switch mock to backend endpoint
      // const query = new URLSearchParams({ cursor: cursor ?? "", limit: String(safeLimit) });
      // const response = await fetch(`/feed?${query.toString()}`);
      // return response.json();
    }
  };

  return { feed };
})();