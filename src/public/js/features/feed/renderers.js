import { escapeHtml, formatDateTime, trendClass } from "../../core/formatters.js";


export function ensureChronologicalOrder(items) {
  return [...items].sort((a, b) => {
    const dateDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return String(b.id).localeCompare(String(a.id));
  });
}

export function createPostCard(post) {
  const article = document.createElement("article");
  article.className = "card post-card";

  const tags = Array.isArray(post.tags) && post.tags.length > 0 ? post.tags : [];
  const createdAtText = formatDateTime(post.createdAt);

  article.innerHTML = `
    <p class="muted post-meta">@${escapeHtml(post.author?.username ?? "desconhecido")} - ${escapeHtml(createdAtText)}</p>
    <h2 class="post-title"></h2>
    <p class="post-content"></p>
    <p class="muted post-tags"></p>
    <p class="${escapeHtml(trendClass(post.trend))}">Tendencia: ${escapeHtml(post.trend ?? "neutral")}</p>
    <p><a class="link-inline" href="./post.html?id=${escapeHtml(post.id)}">Abrir post e comentarios</a></p>
  `;


  article.querySelector(".post-title").textContent = post.title ?? "";
  article.querySelector(".post-content").textContent = post.content ?? "";
  article.querySelector(".post-tags").textContent =
    tags.length > 0 ? tags.map((tag) => `#${tag}`).join(" ") : "";

  return article;
}

export function renderFeedList(target, items) {
  if (!target) {
    return;
  }

  target.innerHTML = "";
  ensureChronologicalOrder(items).forEach((post) => {
    target.appendChild(createPostCard(post));
  });
}
