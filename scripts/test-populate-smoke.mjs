import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "SeedPass123!";
const DEFAULT_SEED_PORT = "3101";
const DEFAULT_UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "seed-populate");
const IMAGE_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG1wAAAAASUVORK5CYII=",
  "base64",
);

const DATASET = Object.freeze({
  users: 50,
  moderatorCandidates: 3,
  posts: 250,
  questionnaires: 30,
  sequenceLinks: 25,
  collections: 40,
  comments: 900,
  reviews: 2000,
  usersWithAvatars: 50,
  postsWithMedia: 120,
});

const TAGS = Object.freeze([
  "seed-focus",
  "backend",
  "frontend",
  "mongodb",
  "javascript",
  "testing",
  "api-design",
  "curation",
  "moderation",
  "chronology",
  "ux",
  "security",
]);

function addMinutes(date, minutes) {
  return new Date(new Date(date).getTime() + minutes * 60 * 1000);
}

function daysAgo(days, minutes = 0) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000 + minutes * 60 * 1000);
}

function trimSlash(value) {
  return String(value ?? "").replace(/\/+$/, "");
}

function sanitizeSegment(value) {
  const safeValue = String(value ?? "").replace(/[^a-zA-Z0-9_-]/g, "");
  return safeValue || "seed";
}

function parseAdminEmail(adminEmailsValue) {
  const emails = String(adminEmailsValue ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return emails[0] ?? null;
}

function createQuestionnaire(index) {
  return {
    title: `Seed Poll ${index + 1}`,
    questions: [
      {
        prompt: `Which option best describes seed scenario ${index + 1}?`,
        options: ["Stable", "Experimental", "Archived"],
        correctOptionIndex: index % 3,
      },
      {
        prompt: `Which layer owns scenario ${index + 1}?`,
        options: ["Route", "Service", "Repository", "Frontend"],
        correctOptionIndex: (index + 1) % 4,
      },
    ],
  };
}

function buildAvatarMedia({ uploadRoot, userId, createdAt }) {
  const safeUserId = sanitizeSegment(userId);
  const fileName = "seed-avatar.png";
  const storagePath = path.join(uploadRoot, "avatars", safeUserId, fileName);
  return {
    fileName,
    storagePath,
    media: {
      url: `/uploads/avatars/${encodeURIComponent(safeUserId)}/${encodeURIComponent(fileName)}`,
      storagePath,
      originalName: fileName,
      mimeType: "image/png",
      sizeBytes: IMAGE_BYTES.length,
      updatedAt: createdAt,
    },
  };
}

function buildPostMedia({ uploadRoot, postId, createdAt }) {
  const safePostId = sanitizeSegment(postId);
  const fileName = "seed-media-1.png";
  const storagePath = path.join(uploadRoot, "posts", safePostId, fileName);
  return {
    fileName,
    storagePath,
    media: {
      id: crypto.randomUUID(),
      kind: "image",
      url: `/uploads/posts/${encodeURIComponent(safePostId)}/${encodeURIComponent(fileName)}`,
      storagePath,
      originalName: fileName,
      mimeType: "image/png",
      sizeBytes: IMAGE_BYTES.length,
      createdAt,
    },
  };
}

async function ensureImageFile(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, IMAGE_BYTES);
}

function createUserDoc({ mongoose, username, email, passwordHash, createdAt, followedTags = [] }) {
  return {
    _id: new mongoose.Types.ObjectId(),
    username,
    email,
    passwordHash,
    role: "user",
    followedTags,
    privateMetrics: {
      score: 0,
      totalReviews: 0,
    },
    profileImage: {
      url: null,
      storagePath: null,
      originalName: null,
      mimeType: null,
      sizeBytes: 0,
      updatedAt: null,
    },
    createdAt,
    updatedAt: createdAt,
  };
}

function createPostDoc({ mongoose, authorId, title, content, tags, createdAt }) {
  return {
    _id: new mongoose.Types.ObjectId(),
    authorId,
    title,
    content,
    tags,
    media: [],
    questionnaire: null,
    sequence: null,
    status: "published",
    trend: "neutral",
    moderationMetrics: {
      approvedCount: 0,
      notRelevantCount: 0,
      totalReviews: 0,
      approvalPercentage: 0,
      notRelevantPercentage: 0,
    },
    createdAt,
    updatedAt: createdAt,
  };
}

function createCollectionDoc({ mongoose, authorId, title, description, tags, itemIds, createdAt }) {
  return {
    _id: new mongoose.Types.ObjectId(),
    authorId,
    title,
    description,
    tags,
    items: itemIds.map((postId, index) => ({
      postId,
      addedAt: addMinutes(createdAt, index + 1),
    })),
    status: "published",
    createdAt,
    updatedAt: addMinutes(createdAt, itemIds.length + 1),
  };
}

function createCommentDoc({ mongoose, postId, authorId, content, createdAt }) {
  return {
    _id: new mongoose.Types.ObjectId(),
    postId,
    authorId,
    content,
    status: "visible",
    createdAt,
    updatedAt: createdAt,
  };
}

function createReviewDoc({ mongoose, postId, reviewerId, decision, createdAt }) {
  return {
    _id: new mongoose.Types.ObjectId(),
    postId,
    reviewerId,
    decision,
    reason: `Seed review marked as ${decision}.`,
    createdAt,
    updatedAt: createdAt,
  };
}

function pickReviewers(users, authorId, count, offset) {
  const pool = users.filter((user) => String(user._id) !== String(authorId));
  const picked = [];
  for (let index = 0; index < count; index += 1) {
    picked.push(pool[(offset + index) % pool.length]);
  }
  return picked;
}

function createRequest(baseUrl) {
  return async function request(
    pathname,
    {
      method = "GET",
      token,
      body,
      headers = {},
      isJson = true,
    } = {},
  ) {
    const requestHeaders = {
      Accept: "application/json",
      ...headers,
    };

    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }

    let requestBody = body;
    if (body !== undefined && isJson) {
      requestHeaders["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${pathname}`, {
      method,
      headers: requestHeaders,
      body: requestBody,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    return {
      status: response.status,
      payload,
    };
  };
}

function assertSuccess(response, expectedStatus, message) {
  assert.equal(response.status, expectedStatus, `${message} (status inesperado)`);
  assert.equal(response.payload?.ok, true, `${message} (envelope invalido)`);
}

function assertError(response, expectedStatus, expectedCode, message) {
  assert.equal(response.status, expectedStatus, `${message} (status inesperado)`);
  assert.equal(response.payload?.ok, false, `${message} (envelope invalido)`);
  assert.equal(response.payload?.error?.code, expectedCode, `${message} (code inesperado)`);
}

async function resetEnvironment({ connection, uploadRoot }) {
  await connection.dropDatabase();
  await fs.rm(uploadRoot, { recursive: true, force: true });
  await fs.mkdir(uploadRoot, { recursive: true });
}

async function buildSeedDataset({
  mongoose,
  User,
  Post,
  Collection,
  Comment,
  PostReview,
  hashPassword,
  uploadRoot,
  adminEmail,
}) {
  const users = [];
  const posts = [];
  const collections = [];
  const comments = [];
  const reviews = [];
  const postsByAuthorId = new Map();

  const adminUser = createUserDoc({
    mongoose,
    username: "seed-admin",
    email: adminEmail,
    passwordHash: hashPassword(SEED_PASSWORD),
    createdAt: daysAgo(40),
    followedTags: [],
  });
  users.push(adminUser);

  const candidateUsers = Array.from({ length: DATASET.moderatorCandidates }, (_, index) =>
    createUserDoc({
      mongoose,
      username: `candidate-${index + 1}`,
      email: `candidate-${index + 1}@seed.local`,
      passwordHash: hashPassword(SEED_PASSWORD),
      createdAt: index === 2 ? daysAgo(6, index) : daysAgo(30 + index, index),
      followedTags: [TAGS[index], TAGS[index + 3]],
    }),
  );
  users.push(...candidateUsers);

  const regularUsers = Array.from({ length: DATASET.users - users.length }, (_, index) =>
    createUserDoc({
      mongoose,
      username: `seed-user-${String(index + 1).padStart(2, "0")}`,
      email: `seed-user-${String(index + 1).padStart(2, "0")}@seed.local`,
      passwordHash: hashPassword(SEED_PASSWORD),
      createdAt: daysAgo(22 - (index % 18), index * 7),
      followedTags: [TAGS[index % TAGS.length], TAGS[(index + 4) % TAGS.length]],
    }),
  );
  users.push(...regularUsers);

  for (const user of users) {
    postsByAuthorId.set(String(user._id), []);
    const avatar = buildAvatarMedia({
      uploadRoot,
      userId: user._id,
      createdAt: addMinutes(user.createdAt, 5),
    });
    await ensureImageFile(avatar.storagePath);
    user.profileImage = avatar.media;
  }

  for (let index = 0; index < candidateUsers.length; index += 1) {
    const author = candidateUsers[index];
    for (let postIndex = 0; postIndex < 6; postIndex += 1) {
      const createdAt =
        index === 2 ? daysAgo(8 - postIndex, postIndex * 11) : daysAgo(28 - postIndex - index, postIndex * 11);
      const post = createPostDoc({
        mongoose,
        authorId: author._id,
        title: `Candidate ${index + 1} Post ${postIndex + 1}`,
        content: `Seed content for candidate ${index + 1}, post ${postIndex + 1}.`,
        tags: ["seed-focus", TAGS[(index + postIndex) % TAGS.length], "longform"],
        createdAt,
      });
      posts.push(post);
      postsByAuthorId.get(String(author._id)).push(post);
    }
  }

  const remainingPosts = DATASET.posts - posts.length;
  for (let index = 0; index < remainingPosts; index += 1) {
    const author = regularUsers[index % regularUsers.length];
    const createdAt = daysAgo(24 - (index % 24), (index % 120) * 9);
    const post = createPostDoc({
      mongoose,
      authorId: author._id,
      title: `Seed Post ${index + 1}`,
      content: `This is seeded post ${index + 1} to exercise feeds, searches, comments, and moderation paths.`,
      tags: [
        index % 5 === 0 ? "seed-focus" : TAGS[index % TAGS.length],
        TAGS[(index + 2) % TAGS.length],
        TAGS[(index + 5) % TAGS.length],
      ],
      createdAt,
    });
    posts.push(post);
    postsByAuthorId.get(String(author._id)).push(post);
  }

  const featuredAuthor = candidateUsers[0];
  const featuredAuthorPosts = postsByAuthorId.get(String(featuredAuthor._id));
  featuredAuthorPosts[1].title = "Featured Sequence Post";
  featuredAuthorPosts[1].content =
    "Featured seeded post used by the smoke run to verify questionnaire, comments, sequence context, and collection membership.";
  featuredAuthorPosts[1].tags = ["seed-focus", "featured", "testing"];
  featuredAuthorPosts[1].questionnaire = createQuestionnaire(1);

  let assignedQuestionnaires = featuredAuthorPosts[1].questionnaire ? 1 : 0;
  for (const post of posts) {
    if (assignedQuestionnaires >= DATASET.questionnaires) {
      break;
    }
    if (!post.questionnaire) {
      post.questionnaire = createQuestionnaire(assignedQuestionnaires + 1);
      assignedQuestionnaires += 1;
    }
  }

  let assignedSequenceLinks = 0;
  function linkPosts(previousPost, nextPost) {
    nextPost.sequence = { previousPostId: previousPost._id };
    assignedSequenceLinks += 1;
  }

  linkPosts(featuredAuthorPosts[0], featuredAuthorPosts[1]);
  linkPosts(featuredAuthorPosts[1], featuredAuthorPosts[2]);

  const candidateTwoPosts = postsByAuthorId.get(String(candidateUsers[1]._id));
  linkPosts(candidateTwoPosts[0], candidateTwoPosts[1]);
  linkPosts(candidateTwoPosts[1], candidateTwoPosts[2]);
  linkPosts(candidateTwoPosts[2], candidateTwoPosts[3]);

  const candidateThreePosts = postsByAuthorId.get(String(candidateUsers[2]._id));
  linkPosts(candidateThreePosts[0], candidateThreePosts[1]);
  linkPosts(candidateThreePosts[1], candidateThreePosts[2]);

  for (const author of regularUsers) {
    if (assignedSequenceLinks >= DATASET.sequenceLinks) {
      break;
    }
    const authorPosts = postsByAuthorId
      .get(String(author._id))
      .slice()
      .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
    for (let index = 1; index < authorPosts.length; index += 1) {
      if (assignedSequenceLinks >= DATASET.sequenceLinks) {
        break;
      }
      if (!authorPosts[index].sequence) {
        linkPosts(authorPosts[index - 1], authorPosts[index]);
      }
    }
  }

  let assignedMedia = 0;
  for (const post of posts) {
    if (assignedMedia >= DATASET.postsWithMedia) {
      break;
    }
    const media = buildPostMedia({
      uploadRoot,
      postId: post._id,
      createdAt: addMinutes(post.createdAt, 8),
    });
    await ensureImageFile(media.storagePath);
    post.media = [media.media];
    assignedMedia += 1;
  }

  const featuredCollection = createCollectionDoc({
    mongoose,
    authorId: featuredAuthor._id,
    title: "Featured Seed Collection",
    description: "Collection used by the smoke runner to verify collection context on posts.",
    tags: ["seed-focus", "featured", "curation"],
    itemIds: [featuredAuthorPosts[0]._id, featuredAuthorPosts[1]._id, featuredAuthorPosts[2]._id],
    createdAt: daysAgo(18, 12),
  });
  collections.push(featuredCollection);

  const collectionOwners = [featuredAuthor, ...candidateUsers.slice(1), ...regularUsers];
  for (let index = 1; index < DATASET.collections; index += 1) {
    const owner = collectionOwners[index % collectionOwners.length];
    const ownerPosts = postsByAuthorId.get(String(owner._id));
    const itemCount = 3 + (index % 4);
    const startIndex = index % Math.max(ownerPosts.length - itemCount + 1, 1);
    const itemIds = ownerPosts.slice(startIndex, startIndex + itemCount).map((post) => post._id);
    collections.push(
      createCollectionDoc({
        mongoose,
        authorId: owner._id,
        title: `Seed Collection ${index + 1}`,
        description: `Collection ${index + 1} curated for heavy feed browsing.`,
        tags: [
          index % 5 === 0 ? "seed-focus" : TAGS[index % TAGS.length],
          TAGS[(index + 3) % TAGS.length],
        ],
        itemIds,
        createdAt: daysAgo(17 - (index % 10), index * 5),
      }),
    );
  }

  const targetCommentAuthor = regularUsers[0];
  const targetComment = createCommentDoc({
    mongoose,
    postId: featuredAuthorPosts[1]._id,
    authorId: targetCommentAuthor._id,
    content: "Seed target comment that the promoted moderator will delete.",
    createdAt: addMinutes(featuredAuthorPosts[1].createdAt, 20),
  });
  comments.push(targetComment);

  for (let index = 1; index < DATASET.comments; index += 1) {
    const post = posts[index % posts.length];
    const author = users[(index * 3) % users.length];
    comments.push(
      createCommentDoc({
        mongoose,
        postId: post._id,
        authorId: author._id,
        content: `Seed comment ${index + 1} for ${post.title}.`,
        createdAt: addMinutes(post.createdAt, 30 + (index % 90)),
      }),
    );
  }

  const allUsers = [...users];
  const positiveLimit = 100;
  const neutralLimit = 175;
  for (let index = 0; index < posts.length; index += 1) {
    const post = posts[index];
    const pattern =
      index < positiveLimit
        ? { approved: 7, notRelevant: 1 }
        : index < neutralLimit
          ? { approved: 4, notRelevant: 4 }
          : { approved: 2, notRelevant: 6 };
    const pickedReviewers = pickReviewers(
      allUsers,
      post.authorId,
      pattern.approved + pattern.notRelevant,
      index * 2,
    );

    for (let approvedIndex = 0; approvedIndex < pattern.approved; approvedIndex += 1) {
      reviews.push(
        createReviewDoc({
          mongoose,
          postId: post._id,
          reviewerId: pickedReviewers[approvedIndex]._id,
          decision: "approved",
          createdAt: addMinutes(post.createdAt, 60 + approvedIndex),
        }),
      );
    }

    for (let rejectedIndex = 0; rejectedIndex < pattern.notRelevant; rejectedIndex += 1) {
      reviews.push(
        createReviewDoc({
          mongoose,
          postId: post._id,
          reviewerId: pickedReviewers[pattern.approved + rejectedIndex]._id,
          decision: "not_relevant",
          createdAt: addMinutes(post.createdAt, 90 + rejectedIndex),
        }),
      );
    }
  }

  assert.equal(users.length, DATASET.users, "A contagem de usuarios semeados divergiu.");
  assert.equal(posts.length, DATASET.posts, "A contagem de posts semeados divergiu.");
  assert.equal(collections.length, DATASET.collections, "A contagem de colecoes semeadas divergiu.");
  assert.equal(comments.length, DATASET.comments, "A contagem de comentarios semeados divergiu.");
  assert.equal(reviews.length, DATASET.reviews, "A contagem de reviews semeadas divergiu.");
  assert.equal(assignedQuestionnaires, DATASET.questionnaires, "A contagem de questionarios divergiu.");
  assert.equal(assignedSequenceLinks, DATASET.sequenceLinks, "A contagem de sequencias divergiu.");
  assert.equal(assignedMedia, DATASET.postsWithMedia, "A contagem de posts com imagem divergiu.");

  await User.insertMany(users);
  await Post.insertMany(posts);
  await Collection.insertMany(collections);
  await Comment.insertMany(comments);
  await PostReview.insertMany(reviews);

  return {
    seedUsers: {
      admin: adminUser,
      candidateForPromotion: candidateUsers[0],
      recentCandidate: candidateUsers[2],
      targetCommentAuthor,
    },
    seedEntities: {
      featuredPost: featuredAuthorPosts[1],
      targetComment,
      featuredCollection,
    },
    counts: {
      users: users.length,
      posts: posts.length,
      collections: collections.length,
      comments: comments.length,
      reviews: reviews.length,
      questionnaires: assignedQuestionnaires,
      sequenceLinks: assignedSequenceLinks,
      usersWithAvatars: users.length,
      postsWithMedia: assignedMedia,
    },
  };
}

async function runSmoke({
  apiBaseUrl,
  appBaseUrl,
  metadata,
}) {
  const request = createRequest(apiBaseUrl);

  const unauthenticatedProfile = await request("/me/profile");
  assertError(
    unauthenticatedProfile,
    401,
    "UNAUTHENTICATED",
    "Perfil sem token deveria falhar",
  );

  const rootResponse = await fetch(`${appBaseUrl}/`);
  assert.equal(rootResponse.status, 200, "Metadata root deveria responder 200");
  const rootPayload = await rootResponse.json();
  assert.equal(rootPayload.ok, true, "Metadata root deveria usar envelope padrao");

  const publicFeed = await request("/feed?limit=10");
  assertSuccess(publicFeed, 200, "Feed publico deveria carregar");
  assert.equal(publicFeed.payload.data.items.length, 10, "Feed publico deveria respeitar limit=10");
  assert.ok(publicFeed.payload.data.pageInfo.nextCursor, "Feed deveria retornar nextCursor");

  const pagedFeed = await request(
    `/feed?limit=10&cursor=${encodeURIComponent(publicFeed.payload.data.pageInfo.nextCursor)}`,
  );
  assertSuccess(pagedFeed, 200, "Feed com cursor deveria carregar");
  assert.notEqual(
    pagedFeed.payload.data.items[0]?.id,
    publicFeed.payload.data.items[0]?.id,
    "Feed paginado deveria trocar os itens da pagina",
  );

  const searchFeed = await request("/feed?search=Featured%20Sequence%20Post");
  assertSuccess(searchFeed, 200, "Busca no feed deveria carregar");
  assert.equal(
    searchFeed.payload.data.items.some((item) => item.id === String(metadata.seedEntities.featuredPost._id)),
    true,
    "Busca no feed deveria encontrar o post destacado",
  );

  const publicCollectionFeed = await request("/collections/feed?limit=10");
  assertSuccess(publicCollectionFeed, 200, "Feed de colecoes deveria carregar");
  assert.equal(
    publicCollectionFeed.payload.data.items.length,
    10,
    "Feed de colecoes deveria respeitar limit=10",
  );

  const searchCollections = await request("/collections/feed?search=Featured%20Seed%20Collection");
  assertSuccess(searchCollections, 200, "Busca em colecoes deveria carregar");
  assert.equal(
    searchCollections.payload.data.items.some(
      (item) => item.id === String(metadata.seedEntities.featuredCollection._id),
    ),
    true,
    "Busca em colecoes deveria encontrar a colecao destacada",
  );

  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const freshEmail = `smoke-user-${uniqueId}@seed.local`;
  const freshUsername = `smoke-user-${uniqueId}`;

  const registerResponse = await request("/auth/register", {
    method: "POST",
    body: {
      username: freshUsername,
      email: freshEmail,
      password: SEED_PASSWORD,
    },
  });
  assertSuccess(registerResponse, 201, "Registro smoke deveria funcionar");
  const freshUserToken = registerResponse.payload.data.token;

  const loginResponse = await request("/auth/login", {
    method: "POST",
    body: {
      email: freshEmail,
      password: SEED_PASSWORD,
    },
  });
  assertSuccess(loginResponse, 200, "Login smoke deveria funcionar");

  const profileResponse = await request("/me/profile", {
    token: freshUserToken,
  });
  assertSuccess(profileResponse, 200, "Perfil autenticado deveria carregar");
  assert.equal(profileResponse.payload.data.email, freshEmail, "Perfil deveria refletir o usuario smoke");

  const followSeedTag = await request("/me/followed-tags", {
    method: "POST",
    token: freshUserToken,
    body: { tag: "Seed-Focus" },
  });
  assertSuccess(followSeedTag, 201, "Seguir tag deveria funcionar");
  assert.equal(
    followSeedTag.payload.data.followedTags.includes("seed-focus"),
    true,
    "Tag seguida deveria ser normalizada",
  );

  const followedTags = await request("/me/followed-tags", {
    token: freshUserToken,
  });
  assertSuccess(followedTags, 200, "Listagem de tags seguidas deveria funcionar");
  assert.equal(
    followedTags.payload.data.followedTags.includes("seed-focus"),
    true,
    "Listagem de tags seguidas deveria incluir a tag seguida",
  );

  const followingFeed = await request("/feed/following?limit=10", {
    token: freshUserToken,
  });
  assertSuccess(followingFeed, 200, "Feed seguido deveria funcionar");
  assert.ok(
    followingFeed.payload.data.items.length > 0,
    "Feed seguido deveria retornar posts com a tag seguida",
  );

  const followingCollections = await request("/collections/feed/following?limit=10", {
    token: freshUserToken,
  });
  assertSuccess(followingCollections, 200, "Feed seguido de colecoes deveria funcionar");
  assert.ok(
    followingCollections.payload.data.items.length > 0,
    "Feed seguido de colecoes deveria retornar colecoes com a tag seguida",
  );

  const createPost = await request("/posts", {
    method: "POST",
    token: freshUserToken,
    body: {
      title: "Smoke Created Post",
      content: "Created during the smoke run to validate owner flows and uploads.",
      tags: ["seed-focus", "smoke-demo"],
    },
  });
  assertSuccess(createPost, 201, "Criacao de post smoke deveria funcionar");
  const createdPostId = createPost.payload.data.id;

  const avatarForm = new FormData();
  avatarForm.append("avatar", new Blob([IMAGE_BYTES], { type: "image/png" }), "avatar.png");
  const uploadAvatar = await request("/me/avatar", {
    method: "POST",
    token: freshUserToken,
    body: avatarForm,
    isJson: false,
  });
  assertSuccess(uploadAvatar, 201, "Upload de avatar deveria funcionar");
  const avatarUrl = uploadAvatar.payload.data.avatarUrl;
  assert.ok(avatarUrl, "Upload de avatar deveria retornar avatarUrl");

  const avatarFetch = await fetch(`${appBaseUrl}${avatarUrl}`);
  assert.equal(avatarFetch.status, 200, "Avatar enviado deveria ser acessivel");

  const postMediaForm = new FormData();
  postMediaForm.append("media", new Blob([IMAGE_BYTES], { type: "image/png" }), "post.png");
  const uploadPostMedia = await request(`/posts/${createdPostId}/media`, {
    method: "POST",
    token: freshUserToken,
    body: postMediaForm,
    isJson: false,
  });
  assertSuccess(uploadPostMedia, 201, "Upload de imagem do post deveria funcionar");
  assert.equal(uploadPostMedia.payload.data.media.length, 1, "Post smoke deveria ter uma imagem");

  const uploadedMediaUrl = uploadPostMedia.payload.data.media[0]?.url;
  const mediaFetch = await fetch(`${appBaseUrl}${uploadedMediaUrl}`);
  assert.equal(mediaFetch.status, 200, "Imagem enviada do post deveria ser acessivel");

  const myPosts = await request("/me/posts", {
    token: freshUserToken,
  });
  assertSuccess(myPosts, 200, "Listagem de posts do autor deveria funcionar");
  assert.equal(
    myPosts.payload.data.some((item) => item.id === createdPostId),
    true,
    "Listagem de posts do autor deveria incluir o post smoke",
  );

  const createCollection = await request("/collections", {
    method: "POST",
    token: freshUserToken,
    body: {
      title: "Smoke Collection",
      description: "Collection created during the smoke run.",
      tags: ["seed-focus", "smoke-demo"],
    },
  });
  assertSuccess(createCollection, 201, "Criacao de colecao deveria funcionar");
  const createdCollectionId = createCollection.payload.data.id;

  const addCollectionItems = await request(`/collections/${createdCollectionId}/items`, {
    method: "POST",
    token: freshUserToken,
    body: {
      postIds: [createdPostId],
    },
  });
  assertSuccess(addCollectionItems, 200, "Adicionar item na colecao deveria funcionar");

  const myCollections = await request("/me/collections", {
    token: freshUserToken,
  });
  assertSuccess(myCollections, 200, "Listagem de colecoes do autor deveria funcionar");
  assert.equal(
    myCollections.payload.data.some((item) => item.id === createdCollectionId),
    true,
    "Minhas colecoes deveriam incluir a colecao smoke",
  );

  const featuredDetail = await request(`/posts/${metadata.seedEntities.featuredPost._id}`);
  assertSuccess(featuredDetail, 200, "Detalhe do post destacado deveria carregar");
  assert.ok(featuredDetail.payload.data.questionnaire, "Post destacado deveria incluir questionario");
  assert.equal(
    featuredDetail.payload.data.sequence?.isPartOfSequence,
    true,
    "Post destacado deveria fazer parte de uma sequencia",
  );
  assert.equal(
    featuredDetail.payload.data.sequence?.hasNext,
    true,
    "Post destacado deveria apontar para o proximo item da sequencia",
  );
  assert.ok(
    featuredDetail.payload.data.collections.length > 0,
    "Post destacado deveria pertencer a pelo menos uma colecao",
  );
  assert.ok(
    featuredDetail.payload.data.comments.length > 0,
    "Post destacado deveria ter comentarios visiveis",
  );

  const reviewResponse = await request(`/posts/${metadata.seedEntities.featuredPost._id}/review`, {
    method: "POST",
    token: freshUserToken,
    body: {
      decision: "approved",
      reason: "Smoke validation approval.",
    },
  });
  assertSuccess(reviewResponse, 201, "Criacao de review deveria funcionar");
  assert.ok(
    reviewResponse.payload.data.moderationMetrics.totalReviews > 0,
    "Review deveria retornar metricas atualizadas",
  );

  const adminLogin = await request("/auth/login", {
    method: "POST",
    body: {
      email: metadata.seedUsers.admin.email,
      password: SEED_PASSWORD,
    },
  });
  assertSuccess(adminLogin, 200, "Login admin deveria funcionar");
  assert.equal(adminLogin.payload.data.user.role, "admin", "Admin configurado deveria permanecer admin");
  const adminToken = adminLogin.payload.data.token;

  const adminUsers = await request("/admin/users", {
    token: adminToken,
  });
  assertSuccess(adminUsers, 200, "Listagem admin de usuarios deveria funcionar");
  assert.equal(
    adminUsers.payload.data.some(
      (item) => item.id === String(metadata.seedUsers.candidateForPromotion._id),
    ),
    true,
    "Listagem admin deveria incluir o candidato elegivel",
  );

  const moderatorEligibility = await request("/admin/moderator-eligibility", {
    token: adminToken,
  });
  assertSuccess(moderatorEligibility, 200, "Elegibilidade de moderador deveria funcionar");
  assert.equal(
    moderatorEligibility.payload.data.eligibleUsers.some(
      (item) => item.id === String(metadata.seedUsers.candidateForPromotion._id),
    ),
    true,
    "Candidato elegivel deveria aparecer na elegibilidade",
  );
  assert.equal(
    moderatorEligibility.payload.data.eligibleUsers.some(
      (item) => item.id === String(metadata.seedUsers.recentCandidate._id),
    ),
    false,
    "Candidato recente nao deveria aparecer como elegivel",
  );

  const grantModerator = await request(
    `/admin/users/${metadata.seedUsers.candidateForPromotion._id}/moderator`,
    {
      method: "PATCH",
      token: adminToken,
      body: { action: "grant" },
    },
  );
  assertSuccess(grantModerator, 200, "Admin deveria conceder moderacao para candidato elegivel");
  assert.equal(grantModerator.payload.data.role, "moderator", "Role deveria virar moderator");

  const promotedLogin = await request("/auth/login", {
    method: "POST",
    body: {
      email: metadata.seedUsers.candidateForPromotion.email,
      password: SEED_PASSWORD,
    },
  });
  assertSuccess(promotedLogin, 200, "Login do moderador promovido deveria funcionar");
  const promotedToken = promotedLogin.payload.data.token;

  const moderatorDeleteComment = await request(`/comments/${metadata.seedEntities.targetComment._id}`, {
    method: "DELETE",
    token: promotedToken,
  });
  assertSuccess(
    moderatorDeleteComment,
    200,
    "Moderador promovido deveria conseguir remover comentario de outro usuario",
  );

  const featuredDetailAfterDelete = await request(`/posts/${metadata.seedEntities.featuredPost._id}`);
  assertSuccess(featuredDetailAfterDelete, 200, "Detalhe do post destacado deveria recarregar");
  assert.equal(
    featuredDetailAfterDelete.payload.data.comments.some(
      (comment) => comment.id === String(metadata.seedEntities.targetComment._id),
    ),
    false,
    "Comentario removido pelo moderador nao deveria aparecer mais",
  );

  return {
    freshUser: {
      email: freshEmail,
      password: SEED_PASSWORD,
    },
    createdPostId,
    createdCollectionId,
  };
}

function printSummary({
  seedMongoUri,
  uploadRoot,
  port,
  adminEmail,
  candidateEmail,
  smokeAccount,
  counts,
}) {
  const appBaseUrl = `http://localhost:${port}`;
  console.log("");
  console.log("Seed + smoke finalizado com sucesso.");
  console.log("");
  console.log("Resumo:");
  console.log(`- Mongo URI: ${seedMongoUri}`);
  console.log(`- Upload root: ${uploadRoot}`);
  console.log(`- Base URL usada no smoke: ${appBaseUrl}`);
  console.log(`- Usuarios: ${counts.users}`);
  console.log(`- Posts: ${counts.posts}`);
  console.log(`- Colecoes: ${counts.collections}`);
  console.log(`- Comentarios: ${counts.comments}`);
  console.log(`- Reviews: ${counts.reviews}`);
  console.log(`- Questionarios: ${counts.questionnaires}`);
  console.log(`- Sequencias: ${counts.sequenceLinks}`);
  console.log(`- Usuarios com avatar: ${counts.usersWithAvatars}`);
  console.log(`- Posts com imagem: ${counts.postsWithMedia}`);
  console.log("");
  console.log("Credenciais uteis:");
  console.log(`- Admin: ${adminEmail} / ${SEED_PASSWORD}`);
  console.log(`- Candidato promovivel: ${candidateEmail} / ${SEED_PASSWORD}`);
  console.log(`- Usuario criado no smoke: ${smokeAccount.email} / ${smokeAccount.password}`);
  console.log("");
  console.log("Paginas uteis:");
  console.log(`- ${appBaseUrl}/pages/feed.html`);
  console.log(`- ${appBaseUrl}/pages/profile.html`);
  console.log(`- ${appBaseUrl}/pages/collections.html`);
  console.log(`- ${appBaseUrl}/pages/admin/reviews.html`);
  console.log("");
  console.log("Os dados permanecem no banco e no upload root configurados. Para navegar manualmente depois, inicie a app com os mesmos valores de MONGO_URI, UPLOAD_ROOT, PORT e ADMIN_EMAILS.");
}

async function main() {
  const seedMongoUri = process.env.SEED_MONGO_URI;
  if (!seedMongoUri) {
    throw new Error("Defina SEED_MONGO_URI antes de executar o populate smoke.");
  }

  if (process.env.SEED_ALLOW_RESET !== "true") {
    throw new Error("Defina SEED_ALLOW_RESET=true para autorizar o reset destrutivo do banco de seed.");
  }

  const adminEmail = parseAdminEmail(process.env.ADMIN_EMAILS);
  if (!adminEmail) {
    throw new Error("Defina ADMIN_EMAILS com pelo menos um email para criar o admin de seed.");
  }

  process.env.MONGO_URI = seedMongoUri;
  process.env.PORT = process.env.SEED_PORT ?? DEFAULT_SEED_PORT;
  process.env.UPLOAD_ROOT = process.env.SEED_UPLOAD_ROOT ?? DEFAULT_UPLOAD_ROOT;

  const uploadRoot = path.resolve(process.env.UPLOAD_ROOT);
  const port = Number.parseInt(process.env.PORT, 10);
  const apiBaseUrl = `${trimSlash(`http://localhost:${port}`)}/api/v1`;
  const appBaseUrl = trimSlash(`http://localhost:${port}`);

  const [
    mongooseModule,
    dbModule,
    serverModule,
    userModule,
    postModule,
    collectionModule,
    commentModule,
    reviewModule,
    passwordModule,
  ] = await Promise.all([
    import("mongoose"),
    import("../src/config/db.js"),
    import("../src/server.js"),
    import("../src/models/user.js"),
    import("../src/models/post.js"),
    import("../src/models/collection.js"),
    import("../src/models/comment.js"),
    import("../src/models/post_review.js"),
    import("../src/common/security/password.js"),
  ]);

  const mongoose = mongooseModule.default;
  const connectDB = dbModule.default;
  const { createApp } = serverModule;
  const User = userModule.default;
  const Post = postModule.default;
  const Collection = collectionModule.default;
  const Comment = commentModule.default;
  const PostReview = reviewModule.default;
  const { hashPassword } = passwordModule;

  let server = null;
  try {
    const connection = await connectDB();
    const app = createApp();

    await resetEnvironment({
      connection,
      uploadRoot,
    });

    const metadata = await buildSeedDataset({
      mongoose,
      User,
      Post,
      Collection,
      Comment,
      PostReview,
      hashPassword,
      uploadRoot,
      adminEmail,
    });

    const accountDeletionService = app.locals.adminService?.accountDeletionService;
    if (!accountDeletionService?.recalculateDerivedStats) {
      throw new Error("Account deletion service is unavailable for seed stat recalculation.");
    }

    await accountDeletionService.recalculateDerivedStats();
    await app.locals.adminService.syncAdminUsers();

    const userCount = await User.countDocuments();
    const postCount = await Post.countDocuments();
    const collectionCount = await Collection.countDocuments();
    const commentCount = await Comment.countDocuments();
    const reviewCount = await PostReview.countDocuments();
    assert.equal(userCount, DATASET.users, "Banco semeado com contagem inesperada de usuarios.");
    assert.equal(postCount, DATASET.posts, "Banco semeado com contagem inesperada de posts.");
    assert.equal(collectionCount, DATASET.collections, "Banco semeado com contagem inesperada de colecoes.");
    assert.equal(commentCount, DATASET.comments, "Banco semeado com contagem inesperada de comentarios.");
    assert.equal(reviewCount, DATASET.reviews, "Banco semeado com contagem inesperada de reviews.");

    const moderatorEligibility = await app.locals.adminService.listModeratorEligibility();
    assert.equal(
      moderatorEligibility.eligibleUsers.some(
        (item) => item.id === String(metadata.seedUsers.candidateForPromotion._id),
      ),
      true,
      "Candidato promovivel nao ficou elegivel apos o seed.",
    );
    assert.equal(
      moderatorEligibility.eligibleUsers.some(
        (item) => item.id === String(metadata.seedUsers.recentCandidate._id),
      ),
      false,
      "Candidato recente nao deveria ficar elegivel.",
    );

    server = app.listen(port);
    await once(server, "listening");

    const smokeResult = await runSmoke({
      apiBaseUrl,
      appBaseUrl,
      metadata,
    });

    printSummary({
      seedMongoUri,
      uploadRoot,
      port,
      adminEmail,
      candidateEmail: metadata.seedUsers.candidateForPromotion.email,
      smokeAccount: smokeResult.freshUser,
      counts: metadata.counts,
    });
  } finally {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}

main().catch((error) => {
  console.error("");
  console.error("Seed + smoke falhou.");
  console.error(error);
  process.exit(1);
});
