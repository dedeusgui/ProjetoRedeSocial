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
  selectedMediaTarget = null,
  existingMediaTarget = null,
  questionnaireTarget = null,
  resolveErrorMessage = null,
  submitPostCreate,
  submitPostUpdate,
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
  const state = {
    mode: "create",
    editingPostId: null,
    isSubmitting: false,
    isRemovingMedia: false,
    existingMedia: [],
    hadExistingQuestionnaire: false,
  };

  function setModalUi() {
    if (title) {
      title.textContent = state.mode === "edit" ? "Editar post" : "Publicar post";
    }

    if (submitButton) {
      submitButton.textContent = state.mode === "edit" ? "Salvar alterações" : "Publicar";
    }

    if (cancelButton) {
      cancelButton.textContent = state.mode === "edit" ? "Cancelar" : "Fechar";
    }
  }

  function setMode(nextMode) {
    state.mode = nextMode === "edit" ? "edit" : "create";
    setModalUi();
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

    const questionnaire = questionnaireEditor.getPayload();
    if (state.mode === "create") {
      if (questionnaire) {
        payload.questionnaire = questionnaire;
      }
      return payload;
    }

    if (questionnaire) {
      payload.questionnaire = questionnaire;
    } else if (state.hadExistingQuestionnaire) {
      payload.questionnaire = null;
    }

    return payload;
  }

  function getSelectedFiles() {
    return Array.from(mediaInput?.files ?? []);
  }

  function renderSelectedMedia() {
    if (!selectedMediaTarget) {
      return;
    }

    const files = getSelectedFiles();
    if (files.length === 0) {
      selectedMediaTarget.innerHTML = "<p class='muted'>Nenhuma nova imagem selecionada.</p>";
      return;
    }

    selectedMediaTarget.innerHTML = `
      <ul class="modal-media-list" aria-label="Novas imagens selecionadas">
        ${files
          .map(
            (file) => `
              <li class="modal-media-item modal-media-item-simple">
                <div class="modal-media-copy">
                  <strong>${escapeHtml(file.name)}</strong>
                  <span class="muted">${escapeHtml(
                    `${Math.max(1, Math.round(file.size / 1024))} KB`,
                  )}</span>
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
      existingMediaTarget.innerHTML = "<p class='muted'>Este post ainda não tem imagens salvas.</p>";
      return;
    }

    existingMediaTarget.innerHTML = `
      <ul class="modal-media-list" aria-label="Imagens atuais do post">
        ${state.existingMedia
          .map(
            (media) => `
              <li class="modal-media-item">
                <img
                  class="modal-media-thumb"
                  src="${escapeHtml(media.url ?? "")}"
                  alt="${escapeHtml(media.originalName ?? "Imagem do post")}"
                  loading="lazy"
                />
                <div class="modal-media-copy">
                  <strong>${escapeHtml(media.originalName ?? "Imagem")}</strong>
                  <span class="muted">${escapeHtml(media.mimeType ?? "")}</span>
                </div>
                <button
                  type="button"
                  class="button-reject"
                  data-remove-post-media-id="${escapeHtml(media.id ?? "")}"
                  ${state.isRemovingMedia ? "disabled" : ""}
                >
                  Remover
                </button>
              </li>
            `,
          )
          .join("")}
      </ul>
    `;
  }

  function syncMediaControls() {
    if (mediaInput) {
      mediaInput.disabled = state.isSubmitting || state.isRemovingMedia;
    }

    questionnaireEditor.setDisabled(state.isSubmitting || state.isRemovingMedia);
    renderSelectedMedia();
    renderExistingMedia();
  }

  function fillFormFromPost(post) {
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
      const tagsValue = Array.isArray(post?.tags) ? post.tags.join(", ") : "";
      tagsField.value = tagsValue;
    }

    state.existingMedia = Array.isArray(post?.media) ? [...post.media] : [];
    state.hadExistingQuestionnaire = Boolean(post?.questionnaire);
    questionnaireEditor.setQuestionnaire(post?.questionnaire ?? null);
    syncMediaControls();
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
    setMode("create");
    statusFlash.clear();
    if (mediaInput) {
      mediaInput.value = "";
    }
    questionnaireEditor.reset();
    syncMediaControls();
  }

  function closePostModal() {
    if (modal?.open) {
      modal.close();
    }
  }

  function openPostModalCreate() {
    if (!modal || !form) {
      return;
    }

    if (typeof onBeforeOpenCreate === "function") {
      const shouldOpen = onBeforeOpenCreate();
      if (!shouldOpen) {
        return;
      }
    }

    resetPostModalState();
    modal.showModal();
  }

  function openPostModalEdit(post) {
    if (!modal || !form) {
      return;
    }

    if (!post?.id) {
      return;
    }

    if (typeof onBeforeOpenEdit === "function") {
      const shouldOpen = onBeforeOpenEdit(post);
      if (!shouldOpen) {
        return;
      }
    }

    setMode("edit");
    state.editingPostId = String(post.id);
    fillFormFromPost(post);
    statusFlash.clear();
    state.existingMedia = Array.isArray(post?.media) ? [...post.media] : [];
    state.hadExistingQuestionnaire = Boolean(post?.questionnaire);
    syncMediaControls();
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
    syncMediaControls();
    statusFlash.show(
      state.mode === "edit" ? "Salvando alterações..." : "Publicando post...",
      "info",
    );

    try {
      let result = null;
      let mediaResult = null;
      let mediaError = null;
      if (state.mode === "edit") {
        if (typeof submitPostUpdate !== "function" || !state.editingPostId) {
          throw new Error("Atualização de post indisponível.");
        }
        result = await submitPostUpdate(state.editingPostId, payload);
      } else {
        if (typeof submitPostCreate !== "function") {
          throw new Error("Criação de post indisponível.");
        }
        result = await submitPostCreate(payload);
      }

      const targetPostId = state.mode === "edit" ? state.editingPostId : result?.id;
      if (selectedFiles.length > 0 && typeof uploadPostMedia === "function" && targetPostId) {
        statusFlash.show("Enviando imagens...", "info");
        try {
          mediaResult = await uploadPostMedia(targetPostId, selectedFiles);
          state.existingMedia = Array.isArray(mediaResult?.media) ? [...mediaResult.media] : [];
          if (mediaInput) {
            mediaInput.value = "";
          }
          syncMediaControls();
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
          : error?.message ?? "Falha ao salvar post.";
      statusFlash.show(message, "error");
    } finally {
      state.isSubmitting = false;
      syncMediaControls();
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
    syncMediaControls();
    statusFlash.show("Removendo imagem...", "info");

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
          : error?.message ?? "Falha ao remover imagem.";
      statusFlash.show(message, "error");
    } finally {
      state.isRemovingMedia = false;
      syncMediaControls();
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
  syncMediaControls();
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
