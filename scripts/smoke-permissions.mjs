import assert from "node:assert/strict";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000/api/v1";
const ADMIN_TEST_EMAIL = process.env.ADMIN_TEST_EMAIL;
const TEST_PASSWORD = process.env.SMOKE_TEST_PASSWORD ?? "12345678";

function uniqueId() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

async function request(path, { method = "GET", token, body } = {}) {
  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json();
  return {
    status: response.status,
    payload,
  };
}

async function registerUser({ username, email, password }) {
  const response = await request("/auth/register", {
    method: "POST",
    body: { username, email, password },
  });

  if (response.status === 409) {
    const loginResponse = await request("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    assert.equal(loginResponse.status, 200, `Falha ao autenticar ${email}`);
    assert.equal(loginResponse.payload.ok, true, "Resposta de login invalida");
    return loginResponse.payload.data;
  }

  assert.equal(response.status, 201, `Falha ao registrar ${email}`);
  assert.equal(response.payload.ok, true, "Resposta de registro invalida");

  return response.payload.data;
}

async function run() {
  const random = uniqueId();
  const userA = await registerUser({
    username: `user-a-${random}`,
    email: `user-a-${random}@mail.test`,
    password: TEST_PASSWORD,
  });
  const userB = await registerUser({
    username: `user-b-${random}`,
    email: `user-b-${random}@mail.test`,
    password: TEST_PASSWORD,
  });

  let adminUser = null;
  if (ADMIN_TEST_EMAIL) {
    adminUser = await registerUser({
      username: `admin-${random}`,
      email: ADMIN_TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    assert.equal(
      adminUser.user.role,
      "admin",
      "ADMIN_TEST_EMAIL nao foi promovido para admin. Confira ADMIN_EMAILS.",
    );
  }

  const createPost = await request("/posts", {
    method: "POST",
    token: userA.token,
    body: {
      title: "Post de teste",
      content: "Conteudo de teste para validacao de permissoes.",
      tags: ["smoke"],
    },
  });
  assert.equal(createPost.status, 201, "Falha ao criar post");
  const postId = createPost.payload.data.id;

  const updateByB = await request(`/posts/${postId}`, {
    method: "PATCH",
    token: userB.token,
    body: { title: "Tentativa invalida" },
  });
  assert.equal(updateByB.status, 403, "Usuario B nao deveria editar post do usuario A");

  const deleteByB = await request(`/posts/${postId}`, {
    method: "DELETE",
    token: userB.token,
  });
  assert.equal(deleteByB.status, 403, "Usuario B nao deveria deletar post do usuario A");

  const reviewByB = await request(`/posts/${postId}/review`, {
    method: "POST",
    token: userB.token,
    body: { decision: "approved", reason: "ok" },
  });
  assert.equal(reviewByB.status, 201, "Usuario autenticado deveria conseguir avaliar post");

  const commentByB = await request(`/posts/${postId}/comments`, {
    method: "POST",
    token: userB.token,
    body: { content: "Comentario do usuario B" },
  });
  assert.equal(commentByB.status, 201, "Falha ao criar comentario do usuario B");
  const commentId = commentByB.payload.data.id;

  const updateCommentByA = await request(`/comments/${commentId}`, {
    method: "PATCH",
    token: userA.token,
    body: { content: "Edicao indevida" },
  });
  assert.equal(updateCommentByA.status, 403, "Usuario A nao deveria editar comentario do usuario B");

  const deleteCommentByA = await request(`/comments/${commentId}`, {
    method: "DELETE",
    token: userA.token,
  });
  assert.equal(deleteCommentByA.status, 403, "Usuario A nao deveria remover comentario do usuario B");

  if (adminUser) {
    const deleteCommentByAdmin = await request(`/comments/${commentId}`, {
      method: "DELETE",
      token: adminUser.token,
    });
    assert.equal(deleteCommentByAdmin.status, 200, "Admin deveria conseguir remover qualquer comentario");
  } else {
    console.warn(
      "Aviso: ADMIN_TEST_EMAIL nao informado; validacao de delete por admin nao foi executada.",
    );
  }

  console.log("Smoke test finalizado com sucesso.");
}

run().catch((error) => {
  console.error("Smoke test falhou.");
  console.error(error);
  process.exit(1);
});
