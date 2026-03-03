(() => {
  "use strict";

  const feedRoot = document.getElementById("feed-root");

  function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = String(value ?? "");
    return node.innerHTML;
  }

  function toChronologicalDesc(posts) {
    return [...posts].sort((a, b) => {
      const left = new Date(a.createdAt).getTime();
      const right = new Date(b.createdAt).getTime();
      return right - left;
    });
  }

  function formatDate(value) {
    const date = new Date(value);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function trendMap(trend) {
    if (trend === "positive") {
      return { label: "Tendencia positiva", className: "trend trend--positive" };
    }
    if (trend === "negative") {
      return { label: "Tendencia negativa", className: "trend trend--negative" };
    }
    return { label: "Tendencia neutra", className: "trend trend--neutral" };
  }

  function renderTags(tags) {
    if (!Array.isArray(tags) || tags.length === 0) {
      return "";
    }

    return `
      <ul class="post-card__tags" aria-label="Tags do post">
        ${tags.map((tag) => `<li class="post-card__tag">${escapeHtml(tag)}</li>`).join("")}
      </ul>
    `;
  }

  function PostCard(post) {
    const trend = trendMap(post.trend);
    return `
      <article class="post-card" data-post-id="${escapeHtml(post.id)}">
        <header class="post-card__header">
          <div class="post-card__meta">
            <span class="post-card__author">${escapeHtml(post.author)}</span>
            <time datetime="${escapeHtml(post.createdAt)}">${escapeHtml(formatDate(post.createdAt))}</time>
          </div>
          <span class="${trend.className}" aria-label="${trend.label}">${trend.label}</span>
        </header>

        <div class="post-card__body">
          <h2 class="post-card__title">${escapeHtml(post.title)}</h2>
          <p class="post-card__content">${escapeHtml(post.content)}</p>
        </div>

        ${renderTags(post.tags)}

        <footer class="post-card__footer">
          <div class="post-card__actions" role="group" aria-label="Interacao do post">
            <button type="button" class="post-card__action post-card__action--approve" data-decision="approved">Aprovado</button>
            <button type="button" class="post-card__action post-card__action--not-relevant" data-decision="not_relevant">Nao relevante</button>
          </div>
          <small class="post-card__feedback" data-feedback aria-live="polite">Sem contagens publicas.</small>
        </footer>
      </article>
    `;
  }

  function renderLoading() {
    feedRoot.innerHTML = `
      <div class="skeleton-card" data-feed-skeleton>
        <div class="skeleton-line skeleton-line--short"></div>
        <div class="skeleton-line skeleton-line--title"></div>
        <div class="skeleton-line skeleton-line--long"></div>
        <div class="skeleton-line skeleton-line--medium"></div>
      </div>
      <div class="skeleton-card" data-feed-skeleton>
        <div class="skeleton-line skeleton-line--short"></div>
        <div class="skeleton-line skeleton-line--title"></div>
        <div class="skeleton-line skeleton-line--long"></div>
        <div class="skeleton-line skeleton-line--medium"></div>
      </div>
    `;
    feedRoot.setAttribute("aria-busy", "true");
  }

  function renderEmpty() {
    feedRoot.innerHTML = `
      <section class="state-card" role="status">
        <h2 class="state-card__title">Nenhum post disponivel</h2>
        <p>Quando novos posts forem publicados, eles aparecem aqui em ordem cronologica.</p>
      </section>
    `;
    feedRoot.setAttribute("aria-busy", "false");
  }

  function renderError() {
    feedRoot.innerHTML = `
      <section class="state-card" role="alert">
        <h2 class="state-card__title">Falha ao carregar feed</h2>
        <p>O carregamento falhou. Tente novamente.</p>
        <div class="state-card__actions">
          <button type="button" class="btn btn--ghost" data-retry>Recarregar</button>
        </div>
      </section>
    `;
    feedRoot.setAttribute("aria-busy", "false");

    const retryButton = feedRoot.querySelector("[data-retry]");
    if (retryButton) {
      retryButton.addEventListener("click", () => {
        loadFeed();
      });
    }
  }

  function bindInteractions() {
    const cards = feedRoot.querySelectorAll(".post-card");

    cards.forEach((card) => {
      const buttons = card.querySelectorAll(".post-card__action");
      const feedback = card.querySelector("[data-feedback]");
      const postId = card.getAttribute("data-post-id");

      buttons.forEach((button) => {
        button.addEventListener("click", () => {
          buttons.forEach((other) => other.classList.remove("is-selected"));
          button.classList.add("is-selected");

          const decision = button.getAttribute("data-decision");
          if (feedback) {
            feedback.textContent = "Interacao registrada.";
          }

          // TODO: connect to backend review endpoint
          // await fetch(`/posts/${postId}/review`, {
          //   method: "POST",
          //   headers: { "Content-Type": "application/json" },
          //   body: JSON.stringify({ decision })
          // });
          console.info("review-placeholder", { postId, decision });
        });
      });
    });
  }

  async function loadFeed() {
    renderLoading();

    try {
      const response = await api.feed.list({ limit: 20 });

      if (!response?.ok) {
        throw new Error("feed_error");
      }

      const posts = toChronologicalDesc(response?.data?.posts ?? []);

      if (posts.length === 0) {
        renderEmpty();
        return;
      }

      feedRoot.innerHTML = posts.map((post) => PostCard(post)).join("");
      feedRoot.setAttribute("aria-busy", "false");
      bindInteractions();
    } catch (_error) {
      renderError();
    }
  }

  document.addEventListener("DOMContentLoaded", loadFeed);
})();