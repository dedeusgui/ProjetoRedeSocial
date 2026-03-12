import { api } from "../api.js";
import { createFlash } from "../components/flash.js";
import { initNavbar } from "../components/navbar.js";
import { bindNavigation } from "../components/navigation.js";
import { resolveAuthApiMessage, resolveModerationApiMessage } from "../core/http-state.js";
import { hasSession } from "../core/session.js";
import { reviewSavedMessage } from "../features/moderation/renderers.js";
import { createPostModalController } from "../features/posts/post-modal.js";
import { renderPostView } from "../features/post/renderers.js";

const state = {
  postId: null,
  postData: null,
  followedTags: [],
  viewerRole: null,
  viewerId: null,
  postAuthorId: null,
  commentsOpen: false,
  isReviewSubmitting: false,
  isDeletingPost: false,
  isDeletingComment: false,
  isManagingTags: false,
  questionnaireSignature: null,
  questionnaireSession: {
    answers: {},
    submittedResult: null,
  },
  commentEdit: {
    editingCommentId: null,
    draft: "",
    isSaving: false,
  },
};

const elements = {
  loginLink: document.querySelector("[data-login-link]"),
  profileLink: document.querySelector("[data-profile-link]"),
  logoutButton: document.querySelector("[data-logout]"),
  status: document.querySelector("[data-post-status]"),
  view: document.querySelector("[data-post-view]"),
  commentForm: document.querySelector("[data-comment-form]"),
  commentHelp: document.querySelector("[data-comment-help]"),
  commentComposer: document.querySelector("[data-comment-compose]"),
  modal: document.querySelector("[data-post-modal]"),
  modalTitle: document.querySelector("[data-post-modal-title]"),
  modalCancelButton: document.querySelector("[data-post-modal-cancel]"),
  modalSubmitButton: document.querySelector("[data-post-modal-submit]"),
  postModalForm: document.querySelector("[data-post-modal-form]"),
  postModalStatus: document.querySelector("[data-post-modal-status]"),
  postMediaInput: document.querySelector("[data-post-media-input]"),
  postPreviousSelect: document.querySelector("[data-post-previous-select]"),
  selectedPostMedia: document.querySelector("[data-selected-post-media]"),
  existingPostMedia: document.querySelector("[data-existing-post-media]"),
  questionnaireEditor: document.querySelector("[data-post-questionnaire-editor]"),
};

const statusFlash = createFlash(elements.status);
const commentHelpFlash = createFlash(elements.commentHelp);

const navbar = initNavbar({
  loginLink: elements.loginLink,
  profileLink: elements.profileLink,
  logoutButton: elements.logoutButton,
  logoutRedirectUrl: "./index.html",
});

function getReviewStatusElement() {
  return elements.view?.querySelector("[data-review-status]") ?? null;
}

function setReviewStatus(message, stateName = "info") {
  const el = getReviewStatusElement();
  if (!el) {
    return;
  }

  el.textContent = message ?? "";
  if (!message) {
    el.hidden = true;
    delete el.dataset.state;
    return;
  }

  el.hidden = false;
  el.dataset.state = stateName;
}

function resolveMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Authentication required. Sign in to continue.",
    "Unexpected error while communicating with the API.",
  );
}

function resolveDeleteMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Authentication required to delete content.",
    "Could not delete the content.",
  );
}

function resolveFollowTagMessage(error) {
  return resolveAuthApiMessage(
    error,
    "Authentication required. Sign in to follow tags.",
    "Could not update followed tags.",
  );
}

function normalizeFollowTagValue(value) {
  return String(value ?? "")
    .trim()
    .replace(/^#+/, "")
    .toLowerCase();
}

function setFollowedTags(tags) {
  state.followedTags = [...new Set((Array.isArray(tags) ? tags : [])
    .map((tag) => normalizeFollowTagValue(tag))
    .filter((tag) => tag.length > 0))]
    .sort((left, right) => left.localeCompare(right));
}

function resetCommentEditState() {
  state.commentEdit.editingCommentId = null;
  state.commentEdit.draft = "";
  state.commentEdit.isSaving = false;
}

function buildQuestionnaireSignature(questionnaire) {
  if (!questionnaire) {
    return null;
  }

  try {
    return JSON.stringify(questionnaire);
  } catch {
    return null;
  }
}

function resetQuestionnaireSession() {
  state.questionnaireSession = {
    answers: {},
    submittedResult: null,
  };
}

function renderSessionState() {
  const isAuthenticated = navbar.refresh();
  const commentsVisible = state.commentsOpen;

  if (elements.commentForm) {
    const textarea = elements.commentForm.querySelector("textarea[name='content']");
    const submit = elements.commentForm.querySelector("button[type='submit']");

    if (textarea) {
      textarea.disabled = !isAuthenticated || !commentsVisible;
    }

    if (submit) {
      submit.disabled = !isAuthenticated || !commentsVisible;
    }
  }

  if (elements.commentComposer) {
    elements.commentComposer.hidden = !commentsVisible;
  }

  commentHelpFlash.show(
    !commentsVisible
      ? "Comments are hidden. Click Open comments to view them again."
      : !isAuthenticated
        ? "Sign in to comment on this post."
        : "",
    "info",
  );

  if (commentsVisible && isAuthenticated) {
    commentHelpFlash.clear();
  }
}

function getPostId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderMissingPostState(message) {
  if (!elements.view) {
    return;
  }

  elements.view.innerHTML = `
    <section class="card empty-card">
      <h2 class="ink-underline">Post unavailable</h2>
      <p class="muted">${message}</p>
      <p class="muted">Return to the feed to continue.</p>
      <button type="button" class="button-link button-link-inline" data-nav-href="./feed.html">Back to feed</button>
    </section>
  `;
}

function renderCurrentPost() {
  if (!elements.view || !state.postData) {
    return;
  }

  const canDeletePost =
    ["moderator", "admin"].includes(state.viewerRole ?? "") ||
    String(state.viewerId ?? "") === String(state.postAuthorId ?? "");
  const canEditPost = String(state.viewerId ?? "") === String(state.postAuthorId ?? "");

  renderPostView(elements.view, state.postData, {
    canDeletePost,
    canEditPost,
    canDeleteAnyComment: ["moderator", "admin"].includes(state.viewerRole ?? ""),
    canReviewPosts: hasSession(),
    viewerId: state.viewerId,
    commentsOpen: state.commentsOpen,
    commentEdit: state.commentEdit,
    canManageTagFollows: hasSession(),
    followedTagSet: new Set(state.followedTags),
    questionnaireSession: state.questionnaireSession,
  });

  refreshReviewActions();
}

function focusCommentEditInput(commentId) {
  if (!elements.view || !commentId) {
    return;
  }

  const input = elements.view.querySelector(
    `[data-comment-edit-input-id="${String(commentId)}"]`,
  );
  if (!input) {
    return;
  }

  input.focus();
  const valueLength = String(input.value ?? "").length;
  input.setSelectionRange(valueLength, valueLength);
}

function refreshReviewActions({ preserveStatus = false } = {}) {
  const isAuthenticated = hasSession();
  const reviewButtons = Array.from(
    elements.view?.querySelectorAll("[data-review-action]") ?? [],
  );

  reviewButtons.forEach((button) => {
    button.disabled = !isAuthenticated || state.isReviewSubmitting;
  });

  if (preserveStatus || state.isReviewSubmitting) {
    return;
  }

  setReviewStatus("", "info");
}

async function loadPost() {
  const postId = getPostId();
  state.postId = postId;

  if (!postId) {
    state.postData = null;
    state.postAuthorId = null;
    state.questionnaireSignature = null;
    resetQuestionnaireSession();
    resetCommentEditState();
    renderMissingPostState("Post ID is missing from the URL.");
    statusFlash.show("Could not open the post.", "error");
    return;
  }

  statusFlash.show("Loading post...", "info");

  try {
    const post = await api.posts.getById(postId);
    if (post.sequence?.isPartOfSequence) {
      try {
        const sequenceData = await api.posts.getSequence(postId);
        post.sequenceItems = Array.isArray(sequenceData.items) ? sequenceData.items : [];
      } catch {
        post.sequenceItems = [];
      }
    } else {
      post.sequenceItems = [];
    }

    const nextQuestionnaireSignature = buildQuestionnaireSignature(post.questionnaire);
    if (state.questionnaireSignature !== nextQuestionnaireSignature) {
      state.questionnaireSignature = nextQuestionnaireSignature;
      resetQuestionnaireSession();
    }
    state.postData = post;
    state.postAuthorId = post.author?.id ?? null;
    resetCommentEditState();
    renderCurrentPost();
    renderSessionState();
    statusFlash.clear();
  } catch (error) {
    state.postData = null;
    state.postAuthorId = null;
    state.questionnaireSignature = null;
    resetQuestionnaireSession();
    resetCommentEditState();
    renderMissingPostState("This post cannot be displayed right now.");
    statusFlash.show(resolveMessage(error), "error");
  }
}

async function syncViewerContext() {
  if (!hasSession()) {
    state.viewerRole = null;
    state.viewerId = null;
    setFollowedTags([]);
    return;
  }

  const [profileResult, followedTagsResult] = await Promise.allSettled([
    api.users.meProfile(),
    api.users.listFollowedTags(),
  ]);

  if (profileResult.status === "fulfilled") {
    const profile = profileResult.value;
    state.viewerRole = profile.role ?? null;
    state.viewerId = profile.id ?? null;
  } else {
    state.viewerRole = null;
    state.viewerId = null;
  }

  if (followedTagsResult.status === "fulfilled") {
    setFollowedTags(followedTagsResult.value.followedTags);
  } else {
    setFollowedTags([]);
  }
}

async function toggleFollowTag(tag, currentlyFollowing) {
  if (state.isManagingTags) {
    return false;
  }

  if (!hasSession()) {
    statusFlash.show("Sign in to follow tags.", "error");
    return false;
  }

  const normalizedTag = normalizeFollowTagValue(tag);
  if (!normalizedTag) {
    return false;
  }

  state.isManagingTags = true;
  statusFlash.show(
    currentlyFollowing ? `Unfollowing #${normalizedTag}...` : `Following #${normalizedTag}...`,
    "info",
  );

  try {
    const result = currentlyFollowing
      ? await api.users.unfollowTag(normalizedTag)
      : await api.users.followTag(normalizedTag);

    setFollowedTags(result.followedTags);
    renderCurrentPost();
    statusFlash.show(
      currentlyFollowing
        ? `You no longer follow #${normalizedTag}.`
        : `You now follow #${normalizedTag}.`,
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

async function handleCommentSubmit(event) {
  event.preventDefault();
  if (!elements.commentForm || !state.commentsOpen) {
    return;
  }

  const postId = state.postId;
  if (!postId) {
    statusFlash.show("Post ID is missing from the URL.", "error");
    return;
  }

  if (!hasSession()) {
    statusFlash.show("Sign in to comment on this post.", "error");
    return;
  }

  const formData = new FormData(elements.commentForm);
  const content = String(formData.get("content") ?? "").trim();
  if (!content) {
    statusFlash.show("Write a comment before submitting.", "error");
    return;
  }

  try {
    await api.posts.createComment(postId, content);
    elements.commentForm.reset();
    await loadPost();
    statusFlash.show("Comment posted.", "success");
  } catch (error) {
    statusFlash.show(resolveMessage(error), "error");
  }
}

async function handleReview(decision) {
  if (!state.postId) {
    setReviewStatus("Invalid post for review.", "error");
    return;
  }

  if (!hasSession()) {
    setReviewStatus("Sign in to review this post.", "error");
    return;
  }

  state.isReviewSubmitting = true;
  refreshReviewActions({ preserveStatus: true });
  setReviewStatus("Saving review...", "info");

  try {
    const result = await api.posts.review(state.postId, decision, null);
    setReviewStatus(reviewSavedMessage(result), "success");
    await loadPost();
  } catch (error) {
    setReviewStatus(resolveModerationApiMessage(error, "Could not save the review."), "error");
  } finally {
    state.isReviewSubmitting = false;
    refreshReviewActions({ preserveStatus: true });
  }
}

async function handleDeletePost() {
  if (!state.postId || state.isDeletingPost) {
    return;
  }

  const isOwner = String(state.viewerId ?? "") === String(state.postAuthorId ?? "");
  if (!hasSession() || (!["moderator", "admin"].includes(state.viewerRole ?? "") && !isOwner)) {
    statusFlash.show("Only the author, a moderator, or an admin can delete posts.", "error");
    return;
  }

  state.isDeletingPost = true;
  statusFlash.show("Deleting post...", "info");
  try {
    await api.posts.delete(state.postId);
    window.location.href = "./feed.html";
  } catch (error) {
    statusFlash.show(resolveDeleteMessage(error), "error");
  } finally {
    state.isDeletingPost = false;
  }
}

async function submitPostUpdate(postId, payload) {
  return api.posts.update(postId, payload);
}

const postModalController = createPostModalController({
  modal: elements.modal,
  form: elements.postModalForm,
  title: elements.modalTitle,
  submitButton: elements.modalSubmitButton,
  cancelButton: elements.modalCancelButton,
  statusTarget: elements.postModalStatus,
  mediaInput: elements.postMediaInput,
  previousPostSelect: elements.postPreviousSelect,
  selectedMediaTarget: elements.selectedPostMedia,
  existingMediaTarget: elements.existingPostMedia,
  questionnaireTarget: elements.questionnaireEditor,
  resolveErrorMessage: resolveMessage,
  onBeforeOpenEdit() {
    const isOwner = String(state.viewerId ?? "") === String(state.postAuthorId ?? "");
    if (!hasSession() || !isOwner) {
      statusFlash.show("Only the author can edit this post.", "error");
      return false;
    }
    return true;
  },
  async submitPostCreate() {
    throw new Error("Post creation is not available on this screen.");
  },
  submitPostUpdate,
  loadOwnedPosts() {
    return api.posts.listMine();
  },
  uploadPostMedia(postId, files) {
    return api.posts.uploadMedia(postId, files);
  },
  deletePostMedia(postId, mediaId) {
    return api.posts.deleteMedia(postId, mediaId);
  },
  async onMediaChanged({ action }) {
    if (action === "delete") {
      await loadPost();
    }
  },
  async onAfterSuccess({ mode, mediaError, mediaErrorMessage }) {
    await loadPost();
    if (mode === "edit") {
      statusFlash.show(
        mediaError
          ? `Post updated, but the images could not be uploaded: ${mediaErrorMessage ?? "check the selected files."}`
          : "Post updated.",
        mediaError ? "error" : "success",
      );
    }
  },
});

function handleEditPost() {
  if (!state.postData?.id) {
    return;
  }

  postModalController.openPostModalEdit(state.postData);
}

function setQuestionnaireAnswer(questionIndex, optionIndex) {
  state.questionnaireSession.answers = {
    ...state.questionnaireSession.answers,
    [questionIndex]: optionIndex,
  };
}

function resetQuestionnaireAnswers() {
  resetQuestionnaireSession();
  renderCurrentPost();
}

function submitQuestionnaireAnswers() {
  const questions = Array.isArray(state.postData?.questionnaire?.questions)
    ? state.postData.questionnaire.questions
    : [];
  if (questions.length === 0) {
    return;
  }

  if (!hasSession()) {
    statusFlash.show("Sign in to answer the questionnaire.", "error");
    return;
  }

  const missingQuestionIndex = questions.findIndex(
    (_, questionIndex) => state.questionnaireSession.answers[questionIndex] === undefined,
  );
  if (missingQuestionIndex !== -1) {
    statusFlash.show(
      `Answer question ${missingQuestionIndex + 1} before checking the result.`,
      "error",
    );
    return;
  }

  const perQuestion = questions.map((question, questionIndex) => {
    const selectedOptionIndex = Number.parseInt(
      state.questionnaireSession.answers[questionIndex],
      10,
    );
    const correctOptionIndex = Number.parseInt(question.correctOptionIndex, 10);

    return {
      selectedOptionIndex,
      correctOptionIndex,
      isCorrect: selectedOptionIndex === correctOptionIndex,
    };
  });

  state.questionnaireSession.submittedResult = {
    correctCount: perQuestion.filter((entry) => entry.isCorrect).length,
    totalQuestions: questions.length,
    perQuestion,
  };
  renderCurrentPost();
  statusFlash.show("Answers checked.", "success");
}

function startCommentEdit(commentId) {
  const comment = (state.postData?.comments ?? []).find(
    (item) => String(item.id) === String(commentId),
  );
  const isOwner = String(comment?.author?.id ?? "") === String(state.viewerId ?? "");
  if (!hasSession() || !isOwner || !comment) {
    statusFlash.show("Only the author can edit the comment.", "error");
    return;
  }

  state.commentEdit.editingCommentId = String(commentId);
  state.commentEdit.draft = String(comment.content ?? "");
  state.commentEdit.isSaving = false;
  renderCurrentPost();
  focusCommentEditInput(commentId);
}

function cancelCommentEdit(commentId) {
  if (String(state.commentEdit.editingCommentId ?? "") !== String(commentId ?? "")) {
    return;
  }

  resetCommentEditState();
  renderCurrentPost();
}

async function saveCommentEdit(commentId) {
  if (String(state.commentEdit.editingCommentId ?? "") !== String(commentId ?? "")) {
    return;
  }

  if (state.commentEdit.isSaving) {
    return;
  }

  const nextContent = String(state.commentEdit.draft ?? "").trim();
  if (!nextContent) {
    statusFlash.show("The comment cannot be empty.", "error");
    focusCommentEditInput(commentId);
    return;
  }

  state.commentEdit.isSaving = true;
  renderCurrentPost();
  statusFlash.show("Saving comment changes...", "info");

  try {
    const updated = await api.comments.update(commentId, { content: nextContent });
    state.postData = {
      ...state.postData,
      comments: (state.postData?.comments ?? []).map((comment) =>
        String(comment.id) === String(commentId)
          ? {
              ...comment,
              content: updated.content ?? nextContent,
              updatedAt: updated.updatedAt ?? comment.updatedAt,
            }
          : comment,
      ),
    };
    resetCommentEditState();
    renderCurrentPost();
    statusFlash.show("Comment updated.", "success");
  } catch (error) {
    state.commentEdit.isSaving = false;
    renderCurrentPost();
    statusFlash.show(resolveMessage(error), "error");
    focusCommentEditInput(commentId);
  }
}

async function handleDeleteComment(commentId) {
  if (!commentId || state.isDeletingComment) {
    return;
  }

  const comment = (state.postData?.comments ?? []).find(
    (item) => String(item.id) === String(commentId),
  );
  const isOwner = String(comment?.author?.id ?? "") === String(state.viewerId ?? "");
  const isPrivileged = ["moderator", "admin"].includes(state.viewerRole ?? "");

  if (!hasSession() || (!isOwner && !isPrivileged)) {
    statusFlash.show("You do not have permission to delete this comment.", "error");
    return;
  }

  state.isDeletingComment = true;
  statusFlash.show("Deleting comment...", "info");
  try {
    await api.comments.delete(commentId);
    state.postData = {
      ...state.postData,
      comments: (state.postData?.comments ?? []).filter(
        (item) => String(item.id) !== String(commentId),
      ),
    };
    if (String(state.commentEdit.editingCommentId ?? "") === String(commentId)) {
      resetCommentEditState();
    }
    renderCurrentPost();
    statusFlash.show("Comment deleted.", "success");
  } catch (error) {
    statusFlash.show(resolveDeleteMessage(error), "error");
  } finally {
    state.isDeletingComment = false;
  }
}

function setCommentsOpen(nextValue) {
  state.commentsOpen = nextValue;
  renderSessionState();
  renderCurrentPost();
}

function bindEvents() {
  if (elements.commentForm) {
    elements.commentForm.addEventListener("submit", handleCommentSubmit);
  }

  if (elements.view) {
    elements.view.addEventListener("click", (event) => {
      const followButton = event.target.closest("[data-follow-tag]");
      if (followButton && elements.view.contains(followButton)) {
        const tag = String(followButton.dataset.followTag ?? "").trim();
        const currentlyFollowing = followButton.dataset.following === "true";
        if (tag) {
          toggleFollowTag(tag, currentlyFollowing);
        }
        return;
      }

      const resetQuestionnaireButton = event.target.closest("[data-reset-questionnaire]");
      if (resetQuestionnaireButton && elements.view.contains(resetQuestionnaireButton)) {
        resetQuestionnaireAnswers();
        return;
      }

      const reviewButton = event.target.closest("[data-review-action]");
      if (reviewButton && elements.view.contains(reviewButton)) {
        const decision = String(reviewButton.dataset.reviewAction ?? "").trim();
        if (decision) {
          handleReview(decision);
        }
        return;
      }

      const deletePostButton = event.target.closest("[data-delete-post-id]");
      if (deletePostButton && elements.view.contains(deletePostButton)) {
        handleDeletePost();
        return;
      }

      const editPostButton = event.target.closest("[data-edit-post-id]");
      if (editPostButton && elements.view.contains(editPostButton)) {
        handleEditPost();
        return;
      }

      const deleteCommentButton = event.target.closest("[data-delete-comment-id]");
      if (deleteCommentButton && elements.view.contains(deleteCommentButton)) {
        const commentId = String(deleteCommentButton.dataset.deleteCommentId ?? "").trim();
        if (commentId) {
          handleDeleteComment(commentId);
        }
        return;
      }

      const editCommentButton = event.target.closest("[data-edit-comment-id]");
      if (editCommentButton && elements.view.contains(editCommentButton)) {
        const commentId = String(editCommentButton.dataset.editCommentId ?? "").trim();
        if (commentId) {
          startCommentEdit(commentId);
        }
        return;
      }

      const saveCommentEditButton = event.target.closest("[data-save-comment-edit-id]");
      if (saveCommentEditButton && elements.view.contains(saveCommentEditButton)) {
        const commentId = String(saveCommentEditButton.dataset.saveCommentEditId ?? "").trim();
        if (commentId) {
          saveCommentEdit(commentId);
        }
        return;
      }

      const cancelCommentEditButton = event.target.closest("[data-cancel-comment-edit-id]");
      if (cancelCommentEditButton && elements.view.contains(cancelCommentEditButton)) {
        const commentId = String(cancelCommentEditButton.dataset.cancelCommentEditId ?? "").trim();
        if (commentId) {
          cancelCommentEdit(commentId);
        }
        return;
      }

      const closeCommentsButton = event.target.closest("[data-close-comments]");
      if (closeCommentsButton && elements.view.contains(closeCommentsButton)) {
        setCommentsOpen(false);
        return;
      }

      const openCommentsButton = event.target.closest("[data-open-comments]");
      if (openCommentsButton && elements.view.contains(openCommentsButton)) {
        setCommentsOpen(true);
      }
    });

    elements.view.addEventListener("change", (event) => {
      const answerInput = event.target.closest("[data-questionnaire-answer]");
      if (!answerInput || !elements.view.contains(answerInput)) {
        return;
      }

      const questionIndex = String(answerInput.dataset.questionnaireAnswer ?? "").trim();
      const optionIndex = String(answerInput.value ?? "").trim();
      if (questionIndex === "" || optionIndex === "") {
        return;
      }

      setQuestionnaireAnswer(questionIndex, optionIndex);
      if (state.questionnaireSession.submittedResult) {
        state.questionnaireSession.submittedResult = null;
        renderCurrentPost();
      }
    });

    elements.view.addEventListener("submit", (event) => {
      const questionnaireForm = event.target.closest("[data-questionnaire-form]");
      if (!questionnaireForm || !elements.view.contains(questionnaireForm)) {
        return;
      }

      event.preventDefault();
      submitQuestionnaireAnswers();
    });

    elements.view.addEventListener("input", (event) => {
      const input = event.target.closest("[data-comment-edit-input-id]");
      if (!input || !elements.view.contains(input)) {
        return;
      }

      const commentId = String(input.dataset.commentEditInputId ?? "").trim();
      if (!commentId || String(state.commentEdit.editingCommentId ?? "") !== commentId) {
        return;
      }

      state.commentEdit.draft = String(input.value ?? "");
    });

    elements.view.addEventListener("keydown", (event) => {
      const input = event.target.closest("[data-comment-edit-input-id]");
      if (!input || !elements.view.contains(input)) {
        return;
      }

      const commentId = String(input.dataset.commentEditInputId ?? "").trim();
      if (!commentId || String(state.commentEdit.editingCommentId ?? "") !== commentId) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        cancelCommentEdit(commentId);
        return;
      }

      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        saveCommentEdit(commentId);
      }
    });
  }
}

async function init() {
  bindNavigation();
  renderSessionState();
  bindEvents();
  await syncViewerContext();
  await loadPost();
}

init();
