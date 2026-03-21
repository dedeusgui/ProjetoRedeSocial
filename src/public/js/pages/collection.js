import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import {
  normalizeFollowTagValue,
  normalizeFollowedTags,
} from "../core/followed-tags.js";
import { resolveAuthApiMessage } from "../core/http-state.js";
import { hasSession } from "../core/session.js";
import { UI_TEXT } from "../core/ui-text.js";
import { renderCollectionView } from "../features/collections/renderers.js";

const state = {
  collectionData: null,
  followedTags: [],
  viewerId: null,
  viewerRole: null,
  isManagingTags: false,
};

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  profileLink: document.querySelector("[data-profile-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-collection-status]"),
  view: document.querySelector("[data-collection-view]"),
};

const statusFlash = createFlash(elements.status);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  profileLink: elements.profileLink,
  logoutButton: elements.logoutButton,
  logoutRedirectUrl: "./index.html",
  onLogout() {
    state.viewerId = null;
    state.viewerRole = null;
    setFollowedTags([]);
    renderCurrentCollection();
  },
});

function getCollectionId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function resolveCollectionLoadMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Authentication required.",
    "Could not load the collection.",
  );
}

function resolveFollowTagMessage(error) {
  return resolveAuthApiMessage(
    error,
    UI_TEXT.auth.loginToFollowTags,
    UI_TEXT.followTags.updateError,
  );
}

function setFollowedTags(tags) {
  state.followedTags = normalizeFollowedTags(tags);
}

function renderMissingState(message) {
  if (!elements.view) {
    return;
  }

  elements.view.innerHTML = `
      <section class="card empty-card">
      <h2 class="ink-underline">Collection unavailable</h2>
      <p class="muted">${message}</p>
      <button type="button" class="button-link button-link-inline" data-nav-href="./feed.html">Back to feed</button>
    </section>
  `;
}

function renderCurrentCollection() {
  if (!elements.view || !state.collectionData) {
    return;
  }

  const isOwner =
    String(state.viewerId ?? "").trim().length > 0 &&
    String(state.viewerId ?? "").trim() === String(state.collectionData?.author?.id ?? "").trim();

  renderCollectionView(elements.view, state.collectionData, {
    isOwner,
    canManageTagFollows: hasSession(),
    followedTagSet: new Set(state.followedTags),
  });
}

async function syncViewerContext() {
  if (!hasSession()) {
    state.viewerId = null;
    state.viewerRole = null;
    setFollowedTags([]);
    return;
  }

  const [profileResult, followedTagsResult] = await Promise.allSettled([
    api.users.meProfile(),
    api.users.listFollowedTags(),
  ]);

  if (profileResult.status === "fulfilled") {
    state.viewerId = profileResult.value.id ?? null;
    state.viewerRole = profileResult.value.role ?? null;
  } else {
    state.viewerId = null;
    state.viewerRole = null;
  }

  if (followedTagsResult.status === "fulfilled") {
    setFollowedTags(followedTagsResult.value.followedTags);
  } else {
    setFollowedTags([]);
  }
}

async function loadCollection() {
  const collectionId = getCollectionId();
  if (!collectionId) {
    state.collectionData = null;
    renderMissingState("Collection ID is missing from the URL.");
    statusFlash.show("Could not open the collection.", "error");
    return;
  }

  statusFlash.show("Loading collection...", "info");
  try {
    const collection = await api.collections.getById(collectionId);
    state.collectionData = collection;
    renderCurrentCollection();
    statusFlash.clear();
  } catch (error) {
    state.collectionData = null;
    renderMissingState("This collection cannot be displayed right now.");
    statusFlash.show(resolveCollectionLoadMessage(error), "error");
  }
}

async function toggleFollowTag(tag, currentlyFollowing) {
  if (state.isManagingTags) {
    return false;
  }

  if (!hasSession()) {
    statusFlash.show(UI_TEXT.auth.loginToFollowTags, "error");
    return false;
  }

  const normalizedTag = normalizeFollowTagValue(tag);
  if (!normalizedTag) {
    return false;
  }

  state.isManagingTags = true;
  statusFlash.show(
    currentlyFollowing
      ? UI_TEXT.followTags.loadingUnfollow(normalizedTag)
      : UI_TEXT.followTags.loadingFollow(normalizedTag),
    "info",
  );

  try {
    const result = currentlyFollowing
      ? await api.users.unfollowTag(normalizedTag)
      : await api.users.followTag(normalizedTag);

    setFollowedTags(result.followedTags);
    renderCurrentCollection();
    statusFlash.show(
      currentlyFollowing
        ? UI_TEXT.followTags.stoppedFollowing(normalizedTag)
        : UI_TEXT.followTags.nowFollowing(normalizedTag),
      "success",
    );
    return true;
  } catch (error) {
    statusFlash.show(resolveFollowTagMessage(error), "error");
    return false;
  } finally {
    state.isManagingTags = false;
  }
}

function bindEvents() {
  if (!elements.view) {
    return;
  }

  elements.view.addEventListener("click", (event) => {
    const followButton = event.target.closest("[data-follow-tag]");
    if (!followButton || !elements.view.contains(followButton)) {
      return;
    }

    const tag = String(followButton.dataset.followTag ?? "").trim();
    const currentlyFollowing = followButton.dataset.following === "true";
    if (tag) {
      toggleFollowTag(tag, currentlyFollowing);
    }
  });
}

async function init() {
  bindNavigation();
  navbar.refresh();
  bindEvents();
  await syncViewerContext();
  await loadCollection();
}

init();
