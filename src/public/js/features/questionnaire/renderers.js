import { escapeHtml } from "../../core/formatters.js";

function buildQuestionnaireHeading(questionnaire) {
  const title = String(questionnaire?.title ?? "").trim();
  return title || "Question\u00e1rio";
}

export function renderQuestionnairePreview(questionnaire) {
  const questions = Array.isArray(questionnaire?.questions) ? questionnaire.questions : [];
  if (questions.length === 0) {
    return "";
  }

  const firstQuestion = questions[0];
  const extraQuestions = Math.max(0, questions.length - 1);

  return `
    <section class="questionnaire-preview" aria-label="Preview do question\u00e1rio">
      <div class="row questionnaire-preview-header">
        <strong>${escapeHtml(buildQuestionnaireHeading(questionnaire))}</strong>
        <span class="tag-item">Quiz ${escapeHtml(String(questions.length))} pergunta(s)</span>
      </div>
      <p class="questionnaire-preview-prompt">${escapeHtml(firstQuestion.prompt ?? "")}</p>
      <ol class="questionnaire-preview-options">
        ${(Array.isArray(firstQuestion.options) ? firstQuestion.options : [])
          .slice(0, 4)
          .map((option) => `<li>${escapeHtml(option)}</li>`)
          .join("")}
      </ol>
      <p class="muted">
        ${extraQuestions > 0 ? `Mais ${escapeHtml(String(extraQuestions))} pergunta(s) no post completo.` : "Abra o post para responder."}
      </p>
    </section>
  `;
}

export function renderQuestionnaireDetail(
  questionnaire,
  {
    canAnswer = false,
    answers = {},
    result = null,
  } = {},
) {
  const questions = Array.isArray(questionnaire?.questions) ? questionnaire.questions : [];
  if (questions.length === 0) {
    return "";
  }

  const isSubmitted = Boolean(result);
  const summaryText = isSubmitted
    ? `Voc\u00ea acertou ${result.correctCount} de ${result.totalQuestions} pergunta(s).`
    : canAnswer
      ? "Escolha uma alternativa por pergunta e confira o resultado."
      : "Fa\u00e7a login para responder ao question\u00e1rio deste post.";

  return `
    <section class="questionnaire-panel" data-questionnaire-panel>
      <div class="row questionnaire-panel-header">
        <div class="questionnaire-panel-copy">
          <h3 class="ink-underline">${escapeHtml(buildQuestionnaireHeading(questionnaire))}</h3>
          <p class="muted">${escapeHtml(summaryText)}</p>
        </div>
        <span class="tag-item">Quiz ${escapeHtml(String(questions.length))} pergunta(s)</span>
      </div>
      <form data-questionnaire-form>
        <div class="questionnaire-question-list">
          ${questions
            .map((question, questionIndex) => {
              const selectedOptionIndex =
                answers?.[questionIndex] !== undefined ? Number.parseInt(answers[questionIndex], 10) : null;
              const questionResult = result?.perQuestion?.[questionIndex] ?? null;

              return `
                <article class="questionnaire-question-card">
                  <div class="row questionnaire-question-head">
                    <strong>Pergunta ${escapeHtml(String(questionIndex + 1))}</strong>
                    ${
                      questionResult
                        ? `<span class="questionnaire-result-chip ${questionResult.isCorrect ? "status-positive" : "status-negative"}">${
                            questionResult.isCorrect ? "Correta" : "Incorreta"
                          }</span>`
                        : ""
                    }
                  </div>
                  <p class="questionnaire-question-prompt">${escapeHtml(question.prompt ?? "")}</p>
                  <div class="questionnaire-option-stack">
                    ${(Array.isArray(question.options) ? question.options : [])
                      .map((option, optionIndex) => {
                        const isSelected = selectedOptionIndex === optionIndex;
                        const isCorrectAnswer = question.correctOptionIndex === optionIndex;
                        const optionClasses = [
                          "questionnaire-option",
                          isSelected ? "questionnaire-option-selected" : "",
                          isSubmitted && isCorrectAnswer ? "questionnaire-option-correct" : "",
                          isSubmitted && isSelected && !isCorrectAnswer ? "questionnaire-option-wrong" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        return `
                          <label class="${optionClasses}">
                            <input
                              type="radio"
                              name="questionnaire-question-${escapeHtml(String(questionIndex))}"
                              value="${escapeHtml(String(optionIndex))}"
                              data-questionnaire-answer="${escapeHtml(String(questionIndex))}"
                              ${isSelected ? "checked" : ""}
                              ${canAnswer ? "" : "disabled"}
                            />
                            <span>${escapeHtml(option)}</span>
                          </label>
                        `;
                      })
                      .join("")}
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
        <div class="row questionnaire-panel-actions">
          ${
            canAnswer
              ? `<button type="submit">${isSubmitted ? "Conferir novamente" : "Conferir respostas"}</button>`
              : ""
          }
          ${
            canAnswer && isSubmitted
              ? '<button type="button" class="button-ghost" data-reset-questionnaire>Responder novamente</button>'
              : ""
          }
        </div>
      </form>
    </section>
  `;
}
