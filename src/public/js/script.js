const API_BASE = "/api/v1";
const TOKEN_KEY = "thesocial_token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
}

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };

  if (options.auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    const message = result?.error?.message ?? "Request failed";
    throw new Error(message);
  }

  return result.data;
}

function setMessage(target, message) {
  if (!target) {
    return;
  }

  target.textContent = message;
}

function getTrendClass(trend) {
  if (trend === "positive") {
    return "status-positive";
  }

  if (trend === "negative") {
    return "status-negative";
  }

  return "status-neutral";
}

async function initFeedPage() {
  const container = document.querySelector("[data-feed-list]");
  const status = document.querySelector("[data-feed-status]");

  if (!container) {
    return;
  }

  setMessage(status, "Loading feed...");

  try {
    const data = await apiFetch("/feed");
    container.innerHTML = "";

    if (data.items.length === 0) {
      setMessage(status, "No posts found.");
      return;
    }

    for (const post of data.items) {
      const article = document.createElement("article");
      article.className = "card";
      article.innerHTML = `
        <p class="muted">${post.author?.username ?? "Unknown"} - ${new Date(post.createdAt).toLocaleString()}</p>
        <h2>${post.title}</h2>
        <p>${post.content}</p>
        <p class="${getTrendClass(post.trend)}">Trend: ${post.trend}</p>
        <a href="./post.html?id=${post.id}">Open post</a>
      `;
      container.appendChild(article);
    }

    setMessage(status, "Feed loaded in chronological order.");
  } catch (error) {
    setMessage(status, error.message);
  }
}

async function initPostPage() {
  const container = document.querySelector("[data-post-view]");
  const status = document.querySelector("[data-post-status]");
  const form = document.querySelector("[data-comment-form]");

  if (!container) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const postId = params.get("id");

  if (!postId) {
    setMessage(status, "Missing post id in URL.");
    return;
  }

  const loadPost = async () => {
    setMessage(status, "Loading post...");
    try {
      const post = await apiFetch(`/posts/${postId}`);
      container.innerHTML = `
        <article class="card">
          <p class="muted">${post.author?.username ?? "Unknown"} - ${new Date(post.createdAt).toLocaleString()}</p>
          <h2>${post.title}</h2>
          <p>${post.content}</p>
          <p class="${getTrendClass(post.trend)}">Trend: ${post.trend}</p>
        </article>
        <section class="card">
          <h3>Comments</h3>
          <div>${post.comments.map((comment) => `<p><strong>${comment.author?.username ?? "Unknown"}</strong>: ${comment.content}</p>`).join("") || "<p class='muted'>No comments yet.</p>"}</div>
        </section>
      `;
      setMessage(status, "Post loaded.");
    } catch (error) {
      setMessage(status, error.message);
    }
  };

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const content = String(formData.get("content") ?? "").trim();

      try {
        await apiFetch(`/posts/${postId}/comments`, {
          method: "POST",
          auth: true,
          body: { content },
        });
        form.reset();
        await loadPost();
      } catch (error) {
        setMessage(status, error.message);
      }
    });
  }

  await loadPost();
}

async function initProfilePage() {
  const target = document.querySelector("[data-profile]");
  const status = document.querySelector("[data-profile-status]");

  if (!target) {
    return;
  }

  setMessage(status, "Loading profile...");

  try {
    const profile = await apiFetch("/me/profile", { auth: true });
    target.innerHTML = `
      <div class="card">
        <h2>${profile.username}</h2>
        <p class="muted">${profile.email}</p>
        <p>Approval rate: ${profile.privateMetrics.approvalRate}%</p>
        <p>Rejection rate: ${profile.privateMetrics.rejectionRate}%</p>
      </div>
    `;
    setMessage(status, "Private metrics visible only to authenticated owner.");
  } catch (error) {
    setMessage(status, error.message);
  }
}

async function initAdminReviewPage() {
  const form = document.querySelector("[data-review-form]");
  const status = document.querySelector("[data-review-status]");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const postId = String(formData.get("postId") ?? "").trim();
    const decision = String(formData.get("decision") ?? "").trim();
    const reason = String(formData.get("reason") ?? "").trim();

    try {
      const result = await apiFetch(`/posts/${postId}/review`, {
        method: "POST",
        auth: true,
        body: { decision, reason: reason || null },
      });

      setMessage(status, `Review saved. Current trend: ${result.trend}`);
      form.reset();
    } catch (error) {
      setMessage(status, error.message);
    }
  });
}

function initAuthForms() {
  const registerForm = document.querySelector("[data-register-form]");
  const loginForm = document.querySelector("[data-login-form]");
  const status = document.querySelector("[data-auth-status]");

  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(registerForm);

      try {
        const data = await apiFetch("/auth/register", {
          method: "POST",
          body: {
            username: formData.get("username"),
            email: formData.get("email"),
            password: formData.get("password"),
          },
        });
        setToken(data.token);
        setMessage(status, "Account created and token saved.");
      } catch (error) {
        setMessage(status, error.message);
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);

      try {
        const data = await apiFetch("/auth/login", {
          method: "POST",
          body: {
            email: formData.get("email"),
            password: formData.get("password"),
          },
        });
        setToken(data.token);
        setMessage(status, "Login successful and token saved.");
      } catch (error) {
        setMessage(status, error.message);
      }
    });
  }
}

function init() {
  const path = window.location.pathname;
  initAuthForms();

  if (path.endsWith("/feed.html")) {
    initFeedPage();
  }

  if (path.endsWith("/post.html")) {
    initPostPage();
  }

  if (path.endsWith("/profile.html")) {
    initProfilePage();
  }

  if (path.endsWith("/admin/reviews.html")) {
    initAdminReviewPage();
  }
}

init();

