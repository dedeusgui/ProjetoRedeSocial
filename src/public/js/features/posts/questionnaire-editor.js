import { escapeHtml } from "../../core/formatters.js";

const MAX_QUESTIONS = 10;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

function buildQuestionId(counter) {
  return `question-${counter}`;
}

function buildOptionId(counter) {
  return `option-${counter}`;
}

function cloneOption(text = "", counter = 0) {
  return {
    id: buildOptionId(counter),
    text: String(text ?? ""),
  };
}

function cloneQuestion(question = {}, questionCounter = 0, optionCounters = []) {
  const options = Array.isArray(question.options) ? question.options : [];
  const normalizedOptions =
    options.length >= MIN_OPTIONS
      ? options.map((option, index) => cloneOption(option, optionCounters[index]))
      : [cloneOption("", optionCounters[0]), cloneOption("", optionCounters[1])];

  const nextCorrectOptionIndex = Number.isInteger(question.correctOptionIndex)
    ? Math.max(0, Math.min(question.correctOptionIndex, normalizedOptions.length - 1))
    : 0;

  return {
    id: buildQuestionId(questionCounter),
    prompt: String(question.prompt ?? ""),
    options: normalizedOptions,
    correctOptionIndex: nextCorrectOptionIndex,
  };
}

export function createQuestionnaireEditor({ target } = {}) {
  const state = {
    disabled: false,
    title: "",
    questions: [],
  };
  let idCounter = 0;

  function nextId() {
    idCounter += 1;
    return idCounter;
  }

  function createEmptyQuestion() {
    return cloneQuestion({}, nextId(), [nextId(), nextId()]);
  }

  function addQuestion() {
    if (state.questions.length >= MAX_QUESTIONS) {
      return;
    }

    state.questions.push(createEmptyQuestion());
    render();
  }

  function addOption(questionId) {
    const question = state.questions.find((item) => item.id === questionId);
    if (!question || question.options.length >= MAX_OPTIONS) {
      return;
    }

    question.options.push(cloneOption("", nextId()));
    render();
  }

  function removeOption(questionId, optionId) {
    const question = state.questions.find((item) => item.id === questionId);
    if (!question || question.options.length <= MIN_OPTIONS) {
      return;
    }

    const optionIndex = question.options.findIndex((item) => item.id === optionId);
    if (optionIndex === -1) {
      return;
    }

    question.options.splice(optionIndex, 1);
    if (question.correctOptionIndex >= question.options.length) {
      question.correctOptionIndex = question.options.length - 1;
    }
    render();
  }

  function removeQuestion(questionId) {
    const nextQuestions = state.questions.filter((item) => item.id !== questionId);
    if (nextQuestions.length === state.questions.length) {
      return;
    }

    state.questions = nextQuestions;
    render();
  }

  function clearAll() {
    state.title = "";
    state.questions = [];
    render();
  }

  function setDisabled(disabled) {
    state.disabled = Boolean(disabled);
    render();
  }

  function setQuestionnaire(questionnaire) {
    state.title = String(questionnaire?.title ?? "");
    state.questions = Array.isArray(questionnaire?.questions)
      ? questionnaire.questions.map((question) =>
          cloneQuestion(
            question,
            nextId(),
            (Array.isArray(question?.options) ? question.options : [null, null]).map(() => nextId()),
          ),
        )
      : [];
    render();
  }

  function reset() {
    clearAll();
  }

  function getPayload() {
    const title = state.title.trim();
    const hasDraft = title.length > 0 || state.questions.length > 0;
    if (!hasDraft) {
      return null;
    }

    if (state.questions.length === 0) {
      throw new Error("Adicione pelo menos uma pergunta ou limpe o questionário.");
    }

    const questions = state.questions.map((question, questionIndex) => {
      const prompt = String(question.prompt ?? "").trim();
      if (!prompt) {
        throw new Error(`Preencha o enunciado da pergunta ${questionIndex + 1}.`);
      }

      if (question.options.length < MIN_OPTIONS) {
        throw new Error(`A pergunta ${questionIndex + 1} precisa ter pelo menos ${MIN_OPTIONS} alternativas.`);
      }

      const options = question.options.map((option, optionIndex) => {
        const optionText = String(option.text ?? "").trim();
        if (!optionText) {
          throw new Error(`Preencha a alternativa ${optionIndex + 1} da pergunta ${questionIndex + 1}.`);
        }
        return optionText;
      });

      const correctOptionIndex = Number.parseInt(question.correctOptionIndex, 10);
      if (
        !Number.isInteger(correctOptionIndex) ||
        correctOptionIndex < 0 ||
        correctOptionIndex >= options.length
      ) {
        throw new Error(`Escolha a alternativa correta da pergunta ${questionIndex + 1}.`);
      }

      return {
        prompt,
        options,
        correctOptionIndex,
      };
    });

    return {
      title: title || null,
      questions,
    };
  }

  function renderQuestions() {
    if (state.questions.length === 0) {
      return `
        <div class="questionnaire-editor-empty">
          <p class="muted">Nenhum questionário configurado neste post.</p>
        </div>
      `;
    }

    return state.questions
      .map((question, questionIndex) => {
        const optionsHtml = question.options
          .map(
            (option, optionIndex) => `
              <li class="questionnaire-editor-option-row">
                <label class="questionnaire-editor-correct">
                  <input
                    type="radio"
                    name="questionnaire-correct-${escapeHtml(question.id)}"
                    data-questionnaire-correct-for="${escapeHtml(question.id)}"
                    value="${escapeHtml(String(optionIndex))}"
                    ${question.correctOptionIndex === optionIndex ? "checked" : ""}
                    ${state.disabled ? "disabled" : ""}
                  />
                  <span class="muted">Correta</span>
                </label>
                <input
                  type="text"
                  value="${escapeHtml(option.text)}"
                  placeholder="Alternativa ${escapeHtml(String(optionIndex + 1))}"
                  maxlength="140"
                  data-questionnaire-option-input="${escapeHtml(option.id)}"
                  data-questionnaire-question-id="${escapeHtml(question.id)}"
                  ${state.disabled ? "disabled" : ""}
                />
                <button
                  type="button"
                  class="button-ghost"
                  data-remove-questionnaire-option="${escapeHtml(option.id)}"
                  data-questionnaire-question-id="${escapeHtml(question.id)}"
                  ${state.disabled || question.options.length <= MIN_OPTIONS ? "disabled" : ""}
                >
                  Remover
                </button>
              </li>
            `,
          )
          .join("");

        return `
          <article class="questionnaire-editor-card">
            <div class="row questionnaire-editor-card-header">
              <h3>Pergunta ${escapeHtml(String(questionIndex + 1))}</h3>
              <button
                type="button"
                class="button-ghost"
                data-remove-questionnaire-question="${escapeHtml(question.id)}"
                ${state.disabled ? "disabled" : ""}
              >
                Remover pergunta
              </button>
            </div>
            <label>
              Enunciado
              <textarea
                rows="3"
                maxlength="240"
                placeholder="Digite a pergunta"
                data-questionnaire-prompt="${escapeHtml(question.id)}"
                ${state.disabled ? "disabled" : ""}
              >${escapeHtml(question.prompt)}</textarea>
            </label>
            <div class="questionnaire-editor-options">
              <div class="row questionnaire-editor-options-header">
                <strong>Alternativas (${escapeHtml(String(question.options.length))}/${escapeHtml(String(MAX_OPTIONS))})</strong>
                <button
                  type="button"
                  class="button-ghost"
                  data-add-questionnaire-option="${escapeHtml(question.id)}"
                  ${state.disabled || question.options.length >= MAX_OPTIONS ? "disabled" : ""}
                >
                  Adicionar alternativa
                </button>
              </div>
              <ul class="questionnaire-editor-option-list">
                ${optionsHtml}
              </ul>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function render() {
    if (!target) {
      return;
    }

    target.innerHTML = `
      <section class="modal-questionnaire-section" aria-label="Questionário do post">
        <div class="row questionnaire-editor-header">
          <div class="questionnaire-editor-copy">
            <h3 class="ink-underline">Questionário</h3>
            <p class="muted">Monte perguntas de múltipla escolha com uma única resposta correta.</p>
          </div>
          <div class="row questionnaire-editor-actions">
            <span class="questionnaire-editor-count muted">${escapeHtml(String(state.questions.length))}/${escapeHtml(String(MAX_QUESTIONS))} perguntas</span>
            <button
              type="button"
              class="button-ghost"
              data-add-questionnaire-question
              ${state.disabled || state.questions.length >= MAX_QUESTIONS ? "disabled" : ""}
            >
              Adicionar pergunta
            </button>
            <button
              type="button"
              class="button-ghost"
              data-clear-questionnaire
              ${state.disabled || (state.questions.length === 0 && !state.title.trim()) ? "disabled" : ""}
            >
              Limpar
            </button>
          </div>
        </div>
        <label class="questionnaire-editor-title-field">
          Título do questionário
          <input
            type="text"
            maxlength="120"
            placeholder="Ex: Quiz rápido de Node.js"
            data-questionnaire-title
            value="${escapeHtml(state.title)}"
            ${state.disabled ? "disabled" : ""}
          />
        </label>
        <div class="questionnaire-editor-list">
          ${renderQuestions()}
        </div>
        <p class="muted">Limites: até ${MAX_QUESTIONS} perguntas e até ${MAX_OPTIONS} alternativas por pergunta.</p>
      </section>
    `;
  }

  if (target) {
    target.addEventListener("input", (event) => {
      const titleInput = event.target.closest("[data-questionnaire-title]");
      if (titleInput) {
        state.title = String(titleInput.value ?? "");
        return;
      }

      const promptInput = event.target.closest("[data-questionnaire-prompt]");
      if (promptInput) {
        const questionId = String(promptInput.dataset.questionnairePrompt ?? "");
        const question = state.questions.find((item) => item.id === questionId);
        if (question) {
          question.prompt = String(promptInput.value ?? "");
        }
        return;
      }

      const optionInput = event.target.closest("[data-questionnaire-option-input]");
      if (optionInput) {
        const questionId = String(optionInput.dataset.questionnaireQuestionId ?? "");
        const optionId = String(optionInput.dataset.questionnaireOptionInput ?? "");
        const question = state.questions.find((item) => item.id === questionId);
        const option = question?.options.find((item) => item.id === optionId);
        if (option) {
          option.text = String(optionInput.value ?? "");
        }
      }
    });

    target.addEventListener("change", (event) => {
      const correctInput = event.target.closest("[data-questionnaire-correct-for]");
      if (!correctInput) {
        return;
      }

      const questionId = String(correctInput.dataset.questionnaireCorrectFor ?? "");
      const question = state.questions.find((item) => item.id === questionId);
      if (!question) {
        return;
      }

      question.correctOptionIndex = Number.parseInt(correctInput.value, 10);
    });

    target.addEventListener("click", (event) => {
      const addQuestionButton = event.target.closest("[data-add-questionnaire-question]");
      if (addQuestionButton) {
        addQuestion();
        return;
      }

      const clearButton = event.target.closest("[data-clear-questionnaire]");
      if (clearButton) {
        clearAll();
        return;
      }

      const removeQuestionButton = event.target.closest("[data-remove-questionnaire-question]");
      if (removeQuestionButton) {
        removeQuestion(String(removeQuestionButton.dataset.removeQuestionnaireQuestion ?? ""));
        return;
      }

      const addOptionButton = event.target.closest("[data-add-questionnaire-option]");
      if (addOptionButton) {
        addOption(String(addOptionButton.dataset.addQuestionnaireOption ?? ""));
        return;
      }

      const removeOptionButton = event.target.closest("[data-remove-questionnaire-option]");
      if (removeOptionButton) {
        removeOption(
          String(removeOptionButton.dataset.questionnaireQuestionId ?? ""),
          String(removeOptionButton.dataset.removeQuestionnaireOption ?? ""),
        );
      }
    });
  }

  render();

  return {
    getPayload,
    reset,
    setDisabled,
    setQuestionnaire,
  };
}
