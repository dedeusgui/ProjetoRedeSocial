/* ==============================================
   feed.js — Lógica da página de feed
   Renderiza posts via api.feed.list()
   Sem algoritmo. Sem recomendação. Cronológico.
   ============================================== */

(() => {
  "use strict";

  const feedRoot = document.getElementById("feed-root");


  /* ── Helpers de formatação ── */

  function formatDate(isoString) {
    const date = new Date(isoString);
    const day = date.getDate();
    const months = [
      "jan", "fev", "mar", "abr", "mai", "jun",
      "jul", "ago", "set", "out", "nov", "dez",
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }

  function trendLabel(trend) {
    const map = {
      positive: "Aprovado",
      neutral: "Neutro",
      negative: "Não relevante",
    };
    return map[trend] || "";
  }

  function trendClass(trend) {
    const map = {
      positive: "trend--positive",
      neutral: "trend--neutral",
      negative: "trend--negative",
    };
    return map[trend] || "";
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }


  /* ── Renderização ── */

  function renderPostCard(post) {
    const tagsHTML = post.tags && post.tags.length
      ? `<div class="post-card__tags">
           ${post.tags.map((t) => `<span class="post-card__tag">${escapeHTML(t)}</span>`).join("")}
         </div>`
      : "";

    return `
      <article class="post-card" id="post-${escapeHTML(post.id)}">
        <header class="post-card__header">
          <div class="post-card__meta">
            <span class="post-card__username">${escapeHTML(post.author)}</span>
            <span class="post-card__date">${formatDate(post.createdAt)}</span>
          </div>
          <span class="trend ${trendClass(post.trend)}">${trendLabel(post.trend)}</span>
        </header>

        <div class="post-card__body">
          <h2 class="post-card__title">${escapeHTML(post.title)}</h2>
          <p class="post-card__content">${escapeHTML(post.content)}</p>
        </div>

        ${tagsHTML}

        <footer class="post-card__footer">
          <div class="post-card__actions">
            <button class="post-card__action post-card__action--approve" type="button" id="approve-${escapeHTML(post.id)}">
              ✓ Aprovado
            </button>
            <button class="post-card__action post-card__action--reject" type="button" id="reject-${escapeHTML(post.id)}">
              ✗ Não relevante
            </button>
          </div>
        </footer>
      </article>
    `;
  }

  function renderEmptyState() {
    return `
      <div class="empty-state" id="feed-empty">
        <span class="empty-state__icon">◇</span>
        <p class="empty-state__title">Nenhum post por aqui</p>
        <p class="empty-state__description">
          O feed está vazio. Quando alguém publicar algo, aparecerá aqui em ordem cronológica.
        </p>
      </div>
    `;
  }

  function renderErrorState() {
    return `
      <div class="error-state" id="feed-error">
        <span class="error-state__icon">⚠</span>
        <p class="error-state__title">Não foi possível carregar o feed</p>
        <p class="error-state__description">
          Algo deu errado ao buscar os posts. Tente novamente em alguns instantes.
        </p>
        <div class="error-state__action">
          <button class="btn btn--ghost" type="button" id="feed-retry">Tentar novamente</button>
        </div>
      </div>
    `;
  }

  function clearSkeletons() {
    const skeletons = feedRoot.querySelectorAll("[data-feed-skeleton]");
    skeletons.forEach((el) => el.remove());
  }


  /* ── Carregamento do feed ── */

  async function loadFeed() {
    try {
      const response = await api.feed.list({ limit: 8 });

      clearSkeletons();

      if (!response.ok || !response.data.posts.length) {
        feedRoot.innerHTML = renderEmptyState();
        return;
      }

      const html = response.data.posts.map(renderPostCard).join("");
      feedRoot.innerHTML = html;

      // Bind retry caso seja necessário no futuro
      bindRetry();

    } catch (err) {
      clearSkeletons();
      feedRoot.innerHTML = renderErrorState();
      bindRetry();
    }
  }

  function bindRetry() {
    const retryBtn = document.getElementById("feed-retry");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        feedRoot.innerHTML = `
          <div class="skeleton-card">
            <div class="skeleton skeleton-line skeleton-line--short"></div>
            <div class="skeleton skeleton-line skeleton-line--title"></div>
            <div class="skeleton skeleton-line skeleton-line--long"></div>
            <div class="skeleton skeleton-line skeleton-line--medium"></div>
          </div>
          <div class="skeleton-card">
            <div class="skeleton skeleton-line skeleton-line--short"></div>
            <div class="skeleton skeleton-line skeleton-line--title"></div>
            <div class="skeleton skeleton-line skeleton-line--long"></div>
            <div class="skeleton skeleton-line skeleton-line--medium"></div>
          </div>
        `;
        loadFeed();
      });
    }
  }


  /* ── Init ── */

  document.addEventListener("DOMContentLoaded", loadFeed);

})();
