import { escapeHtml } from "../../core/formatters.js";

function buildQuestionnaireHeading(questionnaire) {
  const title = String(questionnaire?.title ?? "").trim();
  return title || "Questionnaire";
}

function buildQuestionCountLabel(count) {
  return `${escapeHtml(String(count))} question${count === 1 ? "" : "s"}`;
}

function buildOptionLetter(index) {
  return String.fromCharCode(65 + index);
}

export function renderQuestionnairePreview(questionnaire) {
  const questions = Array.isArray(questionnaire?.questions) ? questionnaire.questions : [];
  if (questions.length === 0) {
    return "";
  }

  const firstQuestion = questions[0];

  return `
    <section class="questionnaire-preview" aria-label="Questionnaire preview">
      <div class="row questionnaire-preview-header">
        <div class="questionnaire-preview-copy">
          <p class="questionnaire-eyebrow">Questionnaire</p>
          <strong class="questionnaire-title">${escapeHtml(buildQuestionnaireHeading(questionnaire))}</strong>
          <p class="muted questionnaire-preview-summary">Self-check questions attached to this post.</p>
        </div>
        <div class="questionnaire-meta">
          <span class="tag-item questionnaire-count">${buildQuestionCountLabel(questions.length)}</span>
          <span class="tag-item questionnaire-count status-neutral">Preview</span>
        </div>
      </div>
      <article class="questionnaire-preview-card">
        <div class="row questionnaire-question-head">
          <span class="questionnaire-question-number">Question 1</span>
          <span class="questionnaire-preview-chip">Preview</span>
        </div>
        <p class="questionnaire-preview-prompt">${escapeHtml(firstQuestion.prompt ?? "")}</p>
        <ol class="questionnaire-preview-options">
          ${(Array.isArray(firstQuestion.options) ? firstQuestion.options : [])
            .slice(0, 4)
            .map(
              (option, optionIndex) => `
                <li class="questionnaire-preview-option">
                  <span class="questionnaire-option-index">${escapeHtml(buildOptionLetter(optionIndex))}</span>
                  <span>${escapeHtml(option)}</span>
                </li>
              `,
            )
            .join("")}
        </ol>
      </article>
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
  const correctCount = Number.parseInt(result?.correctCount ?? 0, 10) || 0;
  const totalQuestions = Number.parseInt(result?.totalQuestions ?? questions.length, 10) || questions.length;
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const summaryText = isSubmitted
    ? `You answered ${correctCount} of ${totalQuestions} correctly.`
    : canAnswer
      ? "Choose one option per question, then check your result."
      : "Sign in to answer this post questionnaire.";

  return `
    <section class="questionnaire-panel" data-questionnaire-panel>
      <div class="row questionnaire-panel-header">
        <div class="questionnaire-panel-copy">
          <p class="questionnaire-eyebrow">Questionnaire</p>
          <h3 class="ink-underline">${escapeHtml(buildQuestionnaireHeading(questionnaire))}</h3>
          <p class="muted">${escapeHtml(summaryText)}</p>
        </div>
        <div class="questionnaire-meta">
          <span class="tag-item questionnaire-count">${buildQuestionCountLabel(questions.length)}</span>
          ${
            isSubmitted
              ? `<span class="tag-item questionnaire-count ${scorePercent >= 70 ? "status-positive" : "status-negative"}">${escapeHtml(String(scorePercent))}%</span>`
              : '<span class="tag-item questionnaire-count status-neutral">Browser self-check</span>'
          }
        </div>
      </div>
      ${
        isSubmitted
          ? `<div class="questionnaire-panel-summary">
              <strong>Result</strong>
              <p class="muted">Review each question below to see what you got right and wrong.</p>
            </div>`
          : ""
      }
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
                    <span class="questionnaire-question-number">Question ${escapeHtml(String(questionIndex + 1))}</span>
                    ${
                      questionResult
                        ? `<span class="questionnaire-result-chip ${questionResult.isCorrect ? "status-positive" : "status-negative"}">${
                            questionResult.isCorrect ? "Correct" : "Incorrect"
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
                            <span class="questionnaire-option-index">${escapeHtml(buildOptionLetter(optionIndex))}</span>
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
          <p class="questionnaire-panel-note muted">
            ${canAnswer ? "Answer everything before checking. Results are not saved." : "The questionnaire stays visible, but answering requires a signed-in session."}
          </p>
          <div class="row questionnaire-panel-button-group">
            ${
              canAnswer
                ? `<button type="submit">${isSubmitted ? "Check again" : "Check answers"}</button>`
                : ""
            }
            ${
              canAnswer && isSubmitted
                ? '<button type="button" class="button-ghost" data-reset-questionnaire>Try again</button>'
                : ""
            }
          </div>
        </div>
      </form>
    </section>
  `;
}
