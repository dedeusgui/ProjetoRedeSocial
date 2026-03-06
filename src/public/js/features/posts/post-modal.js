import { createFlash } from "../../components/flash.js";
import { parseCsvTags } from "../../core/formatters.js";

export function createPostModalController({
  modal,
  form,
  title,
  submitButton,
  cancelButton,
  statusTarget = null,
  openCreateButton = null,
  resolveErrorMessage = null,
  submitPostCreate,
  submitPostUpdate,
  onAfterSuccess = null,
  onBeforeOpenCreate = null,
  onBeforeOpenEdit = null,
} = {}) {
  const statusFlash = createFlash(statusTarget);
  const state = {
    mode: "create",
    editingPostId: null,
    isSubmitting: false,
  };

  function setModalUi() {
    if (title) {
      title.textContent = state.mode === "edit" ? "Editar post" : "Publicar post";
    }

    if (submitButton) {
      submitButton.textContent = state.mode === "edit" ? "Salvar alteracoes" : "Publicar";
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
    return {
      title: String(formData.get("title") ?? "").trim(),
      content: String(formData.get("content") ?? "").trim(),
      tags: parseCsvTags(formData.get("tags")),
    };
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
  }

  function resetPostModalState() {
    if (form) {
      form.reset();
    }

    state.editingPostId = null;
    state.isSubmitting = false;
    setMode("create");
    statusFlash.clear();
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
    modal.showModal();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form || state.isSubmitting) {
      return;
    }

    const payload = buildPayload();
    state.isSubmitting = true;
    statusFlash.show(
      state.mode === "edit" ? "Salvando alteracoes..." : "Publicando post...",
      "info",
    );

    try {
      let result = null;
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

      if (typeof onAfterSuccess === "function") {
        await onAfterSuccess({
          mode: state.mode,
          payload,
          postId: state.editingPostId,
          result,
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
    }
  }

  function bindEvents() {
    if (openCreateButton) {
      openCreateButton.addEventListener("click", openPostModalCreate);
    }

    if (cancelButton) {
      cancelButton.addEventListener("click", closePostModal);
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
  }

  setModalUi();
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
