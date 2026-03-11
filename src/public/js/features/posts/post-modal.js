import { createFlash } from "../../components/flash.js";
import { escapeHtml, parseCsvTags } from "../../core/formatters.js";
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

  const postTypeInputs = Array.from(form?.querySelectorAll("[data-post-type-input]") ?? []);
  const questionnaireBlock = form?.querySelector("[data-post-questionnaire-block]") ?? null;
  const questionnaireHelper = form?.querySelector("[data-post-questionnaire-helper]") ?? null;
  const mediaSummary = form?.querySelector("[data-post-media-summary]") ?? null;

  const state = {
    mode: "create",
    postType: "regular",
    editingPostId: null,
    isSubmitting: false,
    isRemovingMedia: false,
    existingMedia: [],
    hadExistingQuestionnaire: false,
    hadExistingPreviousPost: false,
    ownedPosts: [],
  };

  function isQuestionnaireMode() {
    return state.postType === "questionnaire";
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

  function updateQuestionnaireUi() {
    if (questionnaireBlock) {
      questionnaireBlock.hidden = !isQuestionnaireMode();
    }

    if (questionnaireHelper) {
      if (isQuestionnaireMode()) {
        questionnaireHelper.textContent = "Configure multiple-choice questions for this post.";
        return;
      }

      questionnaireHelper.textContent = state.hadExistingQuestionnaire && state.mode === "edit"
        ? "This post already had a questionnaire. Saving it as a regular post will remove it."
        : "Switch to questionnaire mode to configure the interactive section.";
    }
  }

  function setPostType(nextType = "regular") {
    state.postType = nextType === "questionnaire" ? "questionnaire" : "regular";

    postTypeInputs.forEach((input) => {
      input.checked = input.value === state.postType;
    });

    updateQuestionnaireUi();
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
      tags: parseCsvTags(formData.get("tags")),
    };
    const previousPostId = String(formData.get("previousPostId") ?? "").trim();
    const questionnaire = isQuestionnaireMode() ? questionnaireEditor.getPayload() : null;

    if (isQuestionnaireMode() && !questionnaire) {
      throw new Error("Add at least one question or switch back to a regular post.");
    }

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

    if (isQuestionnaireMode()) {
      payload.questionnaire = questionnaire;
      return payload;
    }

    if (state.hadExistingQuestionnaire) {
      payload.questionnaire = null;
    }

    return payload;
  }

  function getSelectedFiles() {
    return Array.from(mediaInput?.files ?? []);
  }

  function renderMediaSummary(files) {
    if (!mediaSummary) {
      return;
    }

    if (!Array.isArray(files) || files.length === 0) {
      mediaSummary.textContent = "No images selected.";
      return;
    }

    if (files.length === 1) {
      mediaSummary.textContent = files[0].name;
      return;
    }

    mediaSummary.textContent = `${files.length} images selected.`;
  }

  function renderSelectedMedia() {
    if (!selectedMediaTarget) {
      return;
    }

    const files = getSelectedFiles();
    renderMediaSummary(files);

    if (files.length === 0) {
      selectedMediaTarget.innerHTML = "<p class='muted'>No new images selected.</p>";
      return;
    }

    selectedMediaTarget.innerHTML = `
      <h4 class="modal-media-heading">New uploads</h4>
      <ul class="modal-media-list" aria-label="New selected images">
        ${files
          .map(
            (file) => `
              <li class="modal-media-item modal-media-item-simple">
                <div class="modal-media-copy">
                  <strong>${escapeHtml(file.name)}</strong>
                  <span class="muted">${escapeHtml(`${Math.max(1, Math.round(file.size / 1024))} KB`)}</span>
                </div>
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
      mediaInput.disabled = state.isSubmitting || state.isRemovingMedia;
    }

    if (previousPostSelect) {
      previousPostSelect.disabled = state.isSubmitting || state.isRemovingMedia;
    }

    postTypeInputs.forEach((input) => {
      input.disabled = state.isSubmitting || state.isRemovingMedia;
    });

    questionnaireEditor.setDisabled(
      state.isSubmitting || state.isRemovingMedia || !isQuestionnaireMode(),
    );

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
      tagsField.value = Array.isArray(post?.tags) ? post.tags.join(", ") : "";
    }

    state.existingMedia = Array.isArray(post?.media) ? [...post.media] : [];
    state.hadExistingQuestionnaire = Boolean(post?.questionnaire);
    state.hadExistingPreviousPost = Boolean(post?.sequence?.previousPostId);
    questionnaireEditor.setQuestionnaire(post?.questionnaire ?? null);
    setPostType(state.hadExistingQuestionnaire ? "questionnaire" : "regular");
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
    state.hadExistingQuestionnaire = false;
    state.hadExistingPreviousPost = false;
    setMode("create");
    setPostType("regular");
    statusFlash.clear();

    if (mediaInput) {
      mediaInput.value = "";
    }

    if (previousPostSelect) {
      previousPostSelect.innerHTML = '<option value="">Standalone post</option>';
    }

    questionnaireEditor.reset();
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
          throw new Error("Atualizacao de post indisponivel.");
        }
        result = await submitPostUpdate(state.editingPostId, payload);
      } else {
        if (typeof submitPostCreate !== "function") {
          throw new Error("Criacao de post indisponivel.");
        }
        result = await submitPostCreate(payload);
      }

      const targetPostId = state.mode === "edit" ? state.editingPostId : result?.id;
      if (selectedFiles.length > 0 && typeof uploadPostMedia === "function" && targetPostId) {
        statusFlash.show("Uploading images...", "info");
        try {
          mediaResult = await uploadPostMedia(targetPostId, selectedFiles);
          state.existingMedia = Array.isArray(mediaResult?.media) ? [...mediaResult.media] : [];
          if (mediaInput) {
            mediaInput.value = "";
          }
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
      statusFlash.show("Imagem removida.", "success");
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

  function bindEvents() {
    if (openCreateButton) {
      openCreateButton.addEventListener("click", openPostModalCreate);
    }

    if (cancelButton) {
      cancelButton.addEventListener("click", closePostModal);
    }

    if (mediaInput) {
      mediaInput.addEventListener("change", renderSelectedMedia);
    }

    if (postTypeInputs.length > 0) {
      postTypeInputs.forEach((input) => {
        input.addEventListener("change", () => {
          if (input.checked) {
            setPostType(input.value);
            syncControls();
          }
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
  }

  setModalUi();
  setPostType("regular");
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

