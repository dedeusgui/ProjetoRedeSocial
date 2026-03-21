import { createFlash } from "../../components/flash.js";
import { createTagInputController } from "../../components/tag-input.js";
import { resolveContentTagValidationMessage } from "../../core/content-tags.js";
import { escapeHtml } from "../../core/formatters.js";
import {
  POST_MEDIA_MAX_ITEMS,
  appendPostImageSelection,
  getRemainingPostImageSlots,
} from "./media-selection.js";
import { createQuestionnaireEditor } from "./questionnaire-editor.js";

export function createPostModalController({
  modal,
  form,
  title,
  submitButton,
  cancelButton,
  statusTarget = null,
  openCreateButton = null,
  mediaInput = null,
  previousPostSelect = null,
  selectedMediaTarget = null,
  existingMediaTarget = null,
  questionnaireTarget = null,
  resolveErrorMessage = null,
  submitPostCreate,
  submitPostUpdate,
  loadOwnedPosts = null,
  uploadPostMedia = null,
  deletePostMedia = null,
  onAfterSuccess = null,
  onMediaChanged = null,
  onBeforeOpenCreate = null,
  onBeforeOpenEdit = null,
} = {}) {
  const statusFlash = createFlash(statusTarget);
  const questionnaireEditor = createQuestionnaireEditor({
    target: questionnaireTarget,
  });

  const questionnaireShell = form?.querySelector("[data-post-questionnaire-shell]") ?? null;
  const questionnaireToggle = form?.querySelector("[data-post-questionnaire-toggle]") ?? null;
  const questionnairePanel = form?.querySelector("[data-post-questionnaire-panel]") ?? null;
  const questionnaireHelper = form?.querySelector("[data-post-questionnaire-helper]") ?? null;
  const mediaSummary = form?.querySelector("[data-post-media-summary]") ?? null;
  const tagInput = form?.querySelector("[name='tags']") ?? null;
  const tagInputController = createTagInputController({
    input: tagInput,
    noun: "tags",
  });

  if (questionnaireToggle && questionnairePanel) {
    if (!questionnairePanel.id) {
      questionnairePanel.id = "post-questionnaire-panel";
    }

    questionnaireToggle.setAttribute("aria-controls", questionnairePanel.id);
  }

  const state = {
    mode: "create",
    editingPostId: null,
    isSubmitting: false,
    isRemovingMedia: false,
    existingMedia: [],
    selectedMedia: [],
    hadExistingQuestionnaire: false,
    hadExistingPreviousPost: false,
    ownedPosts: [],
  };
  let nextSelectedMediaId = 0;

  function setQuestionnaireExpanded(shouldExpand = false) {
    const isExpanded = Boolean(shouldExpand);

    if (questionnaireShell) {
      questionnaireShell.dataset.open = isExpanded ? "true" : "false";
    }

    if (questionnaireToggle) {
      questionnaireToggle.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    }

    if (questionnairePanel) {
      questionnairePanel.hidden = !isExpanded;
    }

    updateQuestionnaireUi();
  }

  function setModalUi() {
    if (title) {
      title.textContent = state.mode === "edit" ? "Edit post" : "Publish post";
    }

    if (submitButton) {
      submitButton.textContent = state.mode === "edit" ? "Save changes" : "Publish";
    }

    if (cancelButton) {
      cancelButton.textContent = state.mode === "edit" ? "Cancel" : "Close";
    }
  }

  function buildQuestionnaireHelperText(summary) {
    if (summary.hasContent) {
      return state.mode === "edit" && state.hadExistingQuestionnaire
        ? "Edit the questionnaire below. Clear it and save to remove it from this post."
        : "This optional questionnaire will be saved with the post when every question is complete.";
    }

    if (state.mode === "edit" && state.hadExistingQuestionnaire) {
      return "This post already had a questionnaire. Save now to remove it, or add new questions before saving.";
    }

    return "Build an optional multiple-choice questionnaire below, or leave it empty to publish a regular post.";
  }

  function updateQuestionnaireUi() {
    const summary = questionnaireEditor.getSummary();

    if (questionnaireHelper) {
      questionnaireHelper.textContent = buildQuestionnaireHelperText(summary);
    }
  }

  function setMode(nextMode) {
    state.mode = nextMode === "edit" ? "edit" : "create";
    setModalUi();
  }

  function formatPreviousPostLabel(post) {
    const titleText = String(post?.title ?? "").trim();
    const contentPreview = String(post?.content ?? "").trim().slice(0, 48);
    return titleText || contentPreview || `Post ${String(post?.id ?? "")}`;
  }

  function renderPreviousPostOptions({ excludePostId = null, selectedPostId = "" } = {}) {
    if (!previousPostSelect) {
      return;
    }

    const options = (Array.isArray(state.ownedPosts) ? state.ownedPosts : []).filter(
      (post) => String(post.id ?? "") !== String(excludePostId ?? ""),
    );

    previousPostSelect.innerHTML = `
      <option value="">Standalone post</option>
      ${options
        .map(
          (post) => `
            <option
              value="${escapeHtml(String(post.id ?? ""))}"
              ${String(post.id ?? "") === String(selectedPostId ?? "") ? "selected" : ""}
            >
              ${escapeHtml(formatPreviousPostLabel(post))}
            </option>
          `,
        )
        .join("")}
    `;
  }

  async function syncPreviousPostOptions({ excludePostId = null, selectedPostId = "" } = {}) {
    if (!previousPostSelect) {
      return;
    }

    previousPostSelect.disabled = true;

    if (typeof loadOwnedPosts === "function") {
      try {
        const posts = await loadOwnedPosts();
        state.ownedPosts = Array.isArray(posts) ? posts : [];
      } catch {
        state.ownedPosts = [];
      }
    }

    renderPreviousPostOptions({ excludePostId, selectedPostId });
    previousPostSelect.disabled = state.isSubmitting || state.isRemovingMedia;
  }

  function buildPayload() {
    if (!form) {
      return { title: "", content: "", tags: [] };
    }

    const formData = new FormData(form);
    const payload = {
      title: String(formData.get("title") ?? "").trim(),
      content: String(formData.get("content") ?? "").trim(),
      tags: tagInputController.getNormalizedTags(),
    };
    const previousPostId = String(formData.get("previousPostId") ?? "").trim();
    const questionnaireSummary = questionnaireEditor.getSummary();
    const questionnaire = questionnaireSummary.hasContent ? questionnaireEditor.getPayload() : null;

    if (previousPostId) {
      payload.previousPostId = previousPostId;
    } else if (state.mode === "edit" && state.hadExistingPreviousPost) {
      payload.previousPostId = null;
    }

    if (state.mode === "create") {
      if (questionnaire) {
        payload.questionnaire = questionnaire;
      }
      return payload;
    }

    if (questionnaire) {
      payload.questionnaire = questionnaire;
      return payload;
    }

    if (state.hadExistingQuestionnaire) {
      payload.questionnaire = null;
    }

    return payload;
  }

  function getSelectedFiles() {
    return state.selectedMedia.map((item) => item.file);
  }

  function getRemainingMediaSlots() {
    return getRemainingPostImageSlots({
      occupiedSlots: state.existingMedia.length,
      selectedCount: state.selectedMedia.length,
      maxItems: POST_MEDIA_MAX_ITEMS,
    });
  }

  function createSelectedMediaItem(file) {
    return {
      id: String(nextSelectedMediaId++),
      file,
      previewUrl: URL.createObjectURL(file),
    };
  }

  function revokeSelectedMediaItem(item) {
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  }

  function clearSelectedMedia() {
    state.selectedMedia.forEach(revokeSelectedMediaItem);
    state.selectedMedia = [];

    if (mediaInput) {
      mediaInput.value = "";
    }
  }

  function renderMediaSummary(files) {
    if (!mediaSummary) {
      return;
    }

    const safeFiles = Array.isArray(files) ? files : [];
    const totalCount = state.existingMedia.length + safeFiles.length;
    const remainingSlots = getRemainingMediaSlots();

    if (safeFiles.length === 0) {
      if (totalCount === 0) {
        mediaSummary.textContent = `No images selected. Up to ${POST_MEDIA_MAX_ITEMS} images.`;
        return;
      }

      mediaSummary.textContent =
        remainingSlots > 0
          ? `${totalCount} of ${POST_MEDIA_MAX_ITEMS} image slots filled. ${remainingSlots} left.`
          : `${POST_MEDIA_MAX_ITEMS} of ${POST_MEDIA_MAX_ITEMS} image slots filled.`;
      return;
    }

    if (safeFiles.length === 1) {
      mediaSummary.textContent =
        remainingSlots > 0
          ? `${safeFiles[0].name}. ${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} left.`
          : `${safeFiles[0].name}. Image limit reached.`;
      return;
    }

    mediaSummary.textContent =
      remainingSlots > 0
        ? `${safeFiles.length} new images selected. ${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} left.`
        : `${safeFiles.length} new images selected. Image limit reached.`;
  }

  function renderSelectedMedia() {
    if (!selectedMediaTarget) {
      return;
    }

    renderMediaSummary(getSelectedFiles());

    if (state.selectedMedia.length === 0) {
      selectedMediaTarget.innerHTML = "<p class='muted'>No new images selected.</p>";
      return;
    }

    selectedMediaTarget.innerHTML = `
      <h4 class="modal-media-heading">New uploads</h4>
      <ul class="modal-media-list" aria-label="New selected images">
        ${state.selectedMedia
          .map(
            (item) => `
              <li class="modal-media-item">
                <img
                  class="modal-media-thumb"
                  src="${escapeHtml(item.previewUrl)}"
                  alt="${escapeHtml(item.file.name)}"
                  loading="lazy"
                  decoding="async"
                />
                <div class="modal-media-copy">
                  <strong>${escapeHtml(item.file.name)}</strong>
                  <span class="muted">${escapeHtml(`${Math.max(1, Math.round(item.file.size / 1024))} KB`)}</span>
                </div>
                <button
                  type="button"
                  class="button-ghost"
                  data-remove-selected-post-media-id="${escapeHtml(item.id)}"
                  ${state.isSubmitting || state.isRemovingMedia ? "disabled" : ""}
                >
                  Remove
                </button>
              </li>
            `,
          )
          .join("")}
      </ul>
    `;
  }

  function renderExistingMedia() {
    if (!existingMediaTarget) {
      return;
    }

    if (state.mode !== "edit") {
      existingMediaTarget.hidden = true;
      existingMediaTarget.innerHTML = "";
      return;
    }

    existingMediaTarget.hidden = false;

    if (!Array.isArray(state.existingMedia) || state.existingMedia.length === 0) {
      existingMediaTarget.innerHTML = "<p class='muted'>This post has no saved images yet.</p>";
      return;
    }

    existingMediaTarget.innerHTML = `
      <h4 class="modal-media-heading">Current images</h4>
      <ul class="modal-media-list" aria-label="Current post images">
        ${state.existingMedia
          .map(
            (media) => `
              <li class="modal-media-item">
                <img
                  class="modal-media-thumb"
                  src="${escapeHtml(media.url ?? "")}"
                  alt="${escapeHtml(media.originalName ?? "Post image")}"
                  loading="lazy"
                  decoding="async"
                />
                <div class="modal-media-copy">
                  <strong>${escapeHtml(media.originalName ?? "Image")}</strong>
                  <span class="muted">${escapeHtml(media.mimeType ?? "")}</span>
                </div>
                <button
                  type="button"
                  class="button-reject"
                  data-remove-post-media-id="${escapeHtml(media.id ?? "")}"
                  ${state.isRemovingMedia ? "disabled" : ""}
                >
                  Remove
                </button>
              </li>
            `,
          )
          .join("")}
      </ul>
    `;
  }

  function syncControls() {
    if (mediaInput) {
      mediaInput.disabled =
        state.isSubmitting || state.isRemovingMedia || getRemainingMediaSlots() === 0;
    }

    if (previousPostSelect) {
      previousPostSelect.disabled = state.isSubmitting || state.isRemovingMedia;
    }

    if (questionnaireToggle) {
      questionnaireToggle.disabled = state.isSubmitting || state.isRemovingMedia;
    }

    questionnaireEditor.setDisabled(state.isSubmitting || state.isRemovingMedia);

    updateQuestionnaireUi();
    renderSelectedMedia();
    renderExistingMedia();
  }

  async function fillFormFromPost(post) {
    if (!form) {
      return;
    }

    const titleField = form.querySelector("[name='title']");
    const contentField = form.querySelector("[name='content']");
    const tagsField = form.querySelector("[name='tags']");

    if (titleField) {
      titleField.value = String(post?.title ?? "");
    }

    if (contentField) {
      contentField.value = String(post?.content ?? "");
    }

    if (tagsField) {
      const nextValue = Array.isArray(post?.tags) ? post.tags.join(", ") : "";
      tagsField.value = nextValue;
      tagInputController.setValue(nextValue);
    }

    clearSelectedMedia();
    state.existingMedia = Array.isArray(post?.media) ? [...post.media] : [];
    state.hadExistingQuestionnaire = Boolean(post?.questionnaire);
    state.hadExistingPreviousPost = Boolean(post?.sequence?.previousPostId);
    questionnaireEditor.setQuestionnaire(post?.questionnaire ?? null);
    setQuestionnaireExpanded(state.hadExistingQuestionnaire);
    await syncPreviousPostOptions({
      excludePostId: post?.id ?? null,
      selectedPostId: post?.sequence?.previousPostId ?? "",
    });
    syncControls();
  }

  function resetPostModalState() {
    if (form) {
      form.reset();
    }

    state.editingPostId = null;
    state.isSubmitting = false;
    state.isRemovingMedia = false;
    state.existingMedia = [];
    clearSelectedMedia();
    state.hadExistingQuestionnaire = false;
    state.hadExistingPreviousPost = false;
    setMode("create");
    statusFlash.clear();

    if (previousPostSelect) {
      previousPostSelect.innerHTML = '<option value="">Standalone post</option>';
    }

    tagInputController.sync();
    questionnaireEditor.reset();
    setQuestionnaireExpanded(false);
    syncControls();
  }

  function closePostModal() {
    if (modal?.open) {
      modal.close();
    }
  }

  async function openPostModalCreate(seed = null) {
    if (!modal || !form) {
      return;
    }

    if (typeof onBeforeOpenCreate === "function") {
      const shouldOpen = await onBeforeOpenCreate();
      if (!shouldOpen) {
        return;
      }
    }

    resetPostModalState();
    await syncPreviousPostOptions();
    if (seed?.previousPostId && previousPostSelect) {
      previousPostSelect.value = String(seed.previousPostId);
    }
    modal.showModal();
  }

  async function openPostModalEdit(post) {
    if (!modal || !form) {
      return;
    }

    if (!post?.id) {
      return;
    }

    if (typeof onBeforeOpenEdit === "function") {
      const shouldOpen = await onBeforeOpenEdit(post);
      if (!shouldOpen) {
        return;
      }
    }

    setMode("edit");
    state.editingPostId = String(post.id);
    await fillFormFromPost(post);
    statusFlash.clear();
    syncControls();
    modal.showModal();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form || state.isSubmitting) {
      return;
    }

    const tagValidation = tagInputController.getValidation();
    if (tagValidation.hasErrors) {
      statusFlash.show(resolveContentTagValidationMessage(tagValidation), "error");
      tagInputController.focus();
      return;
    }

    const payload = buildPayload();
    const selectedFiles = getSelectedFiles();
    state.isSubmitting = true;
    syncControls();
    statusFlash.show(
      state.mode === "edit" ? "Saving changes..." : "Publishing post...",
      "info",
    );

    try {
      let result = null;
      let mediaResult = null;
      let mediaError = null;

      if (state.mode === "edit") {
        if (typeof submitPostUpdate !== "function" || !state.editingPostId) {
          throw new Error("Post update is unavailable.");
        }
        result = await submitPostUpdate(state.editingPostId, payload);
      } else {
        if (typeof submitPostCreate !== "function") {
          throw new Error("Post creation is unavailable.");
        }
        result = await submitPostCreate(payload);
      }

      const targetPostId = state.mode === "edit" ? state.editingPostId : result?.id;
      if (selectedFiles.length > 0 && typeof uploadPostMedia === "function" && targetPostId) {
        statusFlash.show("Uploading images...", "info");
        try {
          mediaResult = await uploadPostMedia(targetPostId, selectedFiles);
          state.existingMedia = Array.isArray(mediaResult?.media) ? [...mediaResult.media] : [];
          clearSelectedMedia();
          syncControls();
          if (typeof onMediaChanged === "function") {
            await onMediaChanged({
              postId: targetPostId,
              media: state.existingMedia,
              action: "upload",
            });
          }
        } catch (error) {
          mediaError = error;
        }
      }

      if (typeof onAfterSuccess === "function") {
        const mediaErrorMessage =
          mediaError && typeof resolveErrorMessage === "function"
            ? resolveErrorMessage(mediaError)
            : mediaError?.message ?? null;

        await onAfterSuccess({
          mode: state.mode,
          payload,
          postId: targetPostId,
          result,
          mediaResult,
          mediaError,
          mediaErrorMessage,
        });
      }

      closePostModal();
    } catch (error) {
      const message =
        typeof resolveErrorMessage === "function"
          ? resolveErrorMessage(error)
          : error?.message ?? "Could not save the post.";
      statusFlash.show(message, "error");
    } finally {
      state.isSubmitting = false;
      syncControls();
    }
  }

  async function handleRemoveExistingMedia(event) {
    const button = event.target.closest("[data-remove-post-media-id]");
    if (!button || state.mode !== "edit" || !state.editingPostId || state.isRemovingMedia) {
      return;
    }

    const mediaId = String(button.dataset.removePostMediaId ?? "").trim();
    if (!mediaId || typeof deletePostMedia !== "function") {
      return;
    }

    state.isRemovingMedia = true;
    syncControls();
    statusFlash.show("Removing image...", "info");

    try {
      const result = await deletePostMedia(state.editingPostId, mediaId);
      state.existingMedia = Array.isArray(result?.media) ? [...result.media] : [];
      renderExistingMedia();
      if (typeof onMediaChanged === "function") {
        await onMediaChanged({
          postId: state.editingPostId,
          media: state.existingMedia,
          action: "delete",
        });
      }
      statusFlash.show("Image removed.", "success");
    } catch (error) {
      const message =
        typeof resolveErrorMessage === "function"
          ? resolveErrorMessage(error)
          : error?.message ?? "Could not remove the image.";
      statusFlash.show(message, "error");
    } finally {
      state.isRemovingMedia = false;
      syncControls();
    }
  }

  function handleRemoveSelectedMedia(event) {
    const button = event.target.closest("[data-remove-selected-post-media-id]");
    if (!button || state.isSubmitting || state.isRemovingMedia) {
      return;
    }

    const selectedMediaId = String(button.dataset.removeSelectedPostMediaId ?? "").trim();
    if (!selectedMediaId) {
      return;
    }

    const selectedMediaItem = state.selectedMedia.find((item) => item.id === selectedMediaId);
    if (!selectedMediaItem) {
      return;
    }

    revokeSelectedMediaItem(selectedMediaItem);
    state.selectedMedia = state.selectedMedia.filter((item) => item.id !== selectedMediaId);
    syncControls();
  }

  function handleMediaSelectionChange(event) {
    const incomingFiles = Array.from(event.target?.files ?? []);
    if (incomingFiles.length === 0) {
      return;
    }

    const selectionResult = appendPostImageSelection(
      getSelectedFiles(),
      incomingFiles,
      {
        occupiedSlots: state.existingMedia.length,
        maxItems: POST_MEDIA_MAX_ITEMS,
      },
    );

    if (selectionResult.acceptedIncomingFiles.length > 0) {
      state.selectedMedia = [
        ...state.selectedMedia,
        ...selectionResult.acceptedIncomingFiles.map(createSelectedMediaItem),
      ];
    }

    if (mediaInput) {
      mediaInput.value = "";
    }

    if (selectionResult.invalidTypeCount > 0 && selectionResult.overflowCount > 0) {
      statusFlash.show(
        `Some files were ignored. Only images are allowed, and each post supports up to ${POST_MEDIA_MAX_ITEMS} images.`,
        "warn",
      );
    } else if (selectionResult.invalidTypeCount > 0) {
      statusFlash.show("Only image files can be selected here.", "warn");
    } else if (selectionResult.overflowCount > 0) {
      statusFlash.show(`Each post supports up to ${POST_MEDIA_MAX_ITEMS} images.`, "warn");
    }

    syncControls();
  }

  function bindEvents() {
    if (openCreateButton) {
      openCreateButton.addEventListener("click", openPostModalCreate);
    }

    if (cancelButton) {
      cancelButton.addEventListener("click", closePostModal);
    }

    if (mediaInput) {
      mediaInput.addEventListener("change", handleMediaSelectionChange);
    }

    if (questionnaireToggle) {
      questionnaireToggle.addEventListener("click", () => {
        const isExpanded = questionnaireToggle.getAttribute("aria-expanded") === "true";
        setQuestionnaireExpanded(!isExpanded);
      });
    }

    if (questionnaireTarget) {
      ["input", "change", "click"].forEach((eventName) => {
        questionnaireTarget.addEventListener(eventName, () => {
          updateQuestionnaireUi();
        });
      });
    }

    if (modal) {
      modal.addEventListener("click", (event) => {
        if (event.target === modal) {
          closePostModal();
        }
      });
      modal.addEventListener("close", () => {
        resetPostModalState();
      });
    }

    if (form) {
      form.addEventListener("submit", handleSubmit);
    }

    if (existingMediaTarget) {
      existingMediaTarget.addEventListener("click", handleRemoveExistingMedia);
    }

    if (selectedMediaTarget) {
      selectedMediaTarget.addEventListener("click", handleRemoveSelectedMedia);
    }
  }

  setModalUi();
  setQuestionnaireExpanded(false);
  syncControls();
  bindEvents();

  return {
    openPostModalCreate,
    openPostModalEdit,
    closePostModal,
    resetPostModalState,
    getState() {
      return { ...state };
    },
  };
}

