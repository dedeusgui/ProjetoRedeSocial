import AppError from "../errors/AppError.js";

const QUESTIONNAIRE_TITLE_MAX_LENGTH = 120;
const QUESTIONNAIRE_MAX_QUESTIONS = 10;
const QUESTIONNAIRE_QUESTION_PROMPT_MAX_LENGTH = 240;
const QUESTIONNAIRE_MIN_OPTIONS = 2;
const QUESTIONNAIRE_MAX_OPTIONS = 6;
const QUESTIONNAIRE_OPTION_TEXT_MAX_LENGTH = 140;

function validateQuestionnaireShape(questionnaire) {
  if (questionnaire === undefined) {
    return undefined;
  }

  if (questionnaire === null) {
    return null;
  }

  if (!questionnaire || typeof questionnaire !== "object" || Array.isArray(questionnaire)) {
    throw new AppError("The post questionnaire must be an object.", "VALIDATION_ERROR", 400, {
      field: "questionnaire",
    });
  }

  const rawTitle = questionnaire.title;
  const title =
    rawTitle === undefined || rawTitle === null ? null : String(rawTitle).trim();

  if (title !== null && title.length > QUESTIONNAIRE_TITLE_MAX_LENGTH) {
    throw new AppError(
      `The questionnaire title must be at most ${QUESTIONNAIRE_TITLE_MAX_LENGTH} characters.`,
      "VALIDATION_ERROR",
      400,
      {
        field: "questionnaire.title",
        maxLength: QUESTIONNAIRE_TITLE_MAX_LENGTH,
        actualLength: title.length,
      },
    );
  }

  if (!Array.isArray(questionnaire.questions)) {
    throw new AppError(
      "Questionnaire questions must be sent as a list.",
      "VALIDATION_ERROR",
      400,
      {
        field: "questionnaire.questions",
      },
    );
  }

  if (questionnaire.questions.length === 0) {
    throw new AppError(
      "Add at least one question to the questionnaire.",
      "VALIDATION_ERROR",
      400,
      {
        field: "questionnaire.questions",
        minItems: 1,
      },
    );
  }

  if (questionnaire.questions.length > QUESTIONNAIRE_MAX_QUESTIONS) {
    throw new AppError(
      `A questionnaire can include at most ${QUESTIONNAIRE_MAX_QUESTIONS} questions.`,
      "VALIDATION_ERROR",
      400,
      {
        field: "questionnaire.questions",
        maxItems: QUESTIONNAIRE_MAX_QUESTIONS,
        actualItems: questionnaire.questions.length,
      },
    );
  }

  const questions = questionnaire.questions.map((question, questionIndex) => {
    if (!question || typeof question !== "object" || Array.isArray(question)) {
      throw new AppError(
        `Question ${questionIndex + 1} is invalid.`,
        "VALIDATION_ERROR",
        400,
        {
          field: `questionnaire.questions.${questionIndex}`,
        },
      );
    }

    const prompt = String(question.prompt ?? "").trim();
    if (!prompt) {
      throw new AppError(
        `Fill in the prompt for question ${questionIndex + 1}.`,
        "VALIDATION_ERROR",
        400,
        {
          field: `questionnaire.questions.${questionIndex}.prompt`,
        },
      );
    }

    if (prompt.length > QUESTIONNAIRE_QUESTION_PROMPT_MAX_LENGTH) {
      throw new AppError(
        `The prompt for question ${questionIndex + 1} must be at most ${QUESTIONNAIRE_QUESTION_PROMPT_MAX_LENGTH} characters.`,
        "VALIDATION_ERROR",
        400,
        {
          field: `questionnaire.questions.${questionIndex}.prompt`,
          maxLength: QUESTIONNAIRE_QUESTION_PROMPT_MAX_LENGTH,
          actualLength: prompt.length,
        },
      );
    }

    if (!Array.isArray(question.options)) {
      throw new AppError(
        `The options for question ${questionIndex + 1} must be sent as a list.`,
        "VALIDATION_ERROR",
        400,
        {
          field: `questionnaire.questions.${questionIndex}.options`,
        },
      );
    }

    if (question.options.length < QUESTIONNAIRE_MIN_OPTIONS) {
      throw new AppError(
        `Question ${questionIndex + 1} needs at least ${QUESTIONNAIRE_MIN_OPTIONS} options.`,
        "VALIDATION_ERROR",
        400,
        {
          field: `questionnaire.questions.${questionIndex}.options`,
          minItems: QUESTIONNAIRE_MIN_OPTIONS,
        },
      );
    }

    if (question.options.length > QUESTIONNAIRE_MAX_OPTIONS) {
      throw new AppError(
        `Question ${questionIndex + 1} can have at most ${QUESTIONNAIRE_MAX_OPTIONS} options.`,
        "VALIDATION_ERROR",
        400,
        {
          field: `questionnaire.questions.${questionIndex}.options`,
          maxItems: QUESTIONNAIRE_MAX_OPTIONS,
          actualItems: question.options.length,
        },
      );
    }

    const options = question.options.map((option, optionIndex) => {
      const optionText = String(option ?? "").trim();
      if (!optionText) {
        throw new AppError(
          `Fill in option ${optionIndex + 1} for question ${questionIndex + 1}.`,
          "VALIDATION_ERROR",
          400,
          {
            field: `questionnaire.questions.${questionIndex}.options.${optionIndex}`,
          },
        );
      }

      if (optionText.length > QUESTIONNAIRE_OPTION_TEXT_MAX_LENGTH) {
        throw new AppError(
          `Option ${optionIndex + 1} for question ${questionIndex + 1} must be at most ${QUESTIONNAIRE_OPTION_TEXT_MAX_LENGTH} characters.`,
          "VALIDATION_ERROR",
          400,
          {
            field: `questionnaire.questions.${questionIndex}.options.${optionIndex}`,
            maxLength: QUESTIONNAIRE_OPTION_TEXT_MAX_LENGTH,
            actualLength: optionText.length,
          },
        );
      }

      return optionText;
    });

    const correctOptionIndex = Number.parseInt(question.correctOptionIndex, 10);
    const hasValidCorrectOption =
      Number.isInteger(correctOptionIndex) &&
      correctOptionIndex >= 0 &&
      correctOptionIndex < options.length;

    if (!hasValidCorrectOption) {
      throw new AppError(
        `Choose a valid correct option for question ${questionIndex + 1}.`,
        "VALIDATION_ERROR",
        400,
        {
          field: `questionnaire.questions.${questionIndex}.correctOptionIndex`,
        },
      );
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

function formatQuestionnaire(questionnaire) {
  if (!questionnaire || !Array.isArray(questionnaire.questions) || questionnaire.questions.length === 0) {
    return null;
  }

  return {
    title: questionnaire.title ?? null,
    questionCount: questionnaire.questions.length,
    questions: questionnaire.questions.map((question) => ({
      prompt: question.prompt,
      options: Array.isArray(question.options) ? [...question.options] : [],
      correctOptionIndex: question.correctOptionIndex,
    })),
  };
}

export {
  QUESTIONNAIRE_MAX_OPTIONS,
  QUESTIONNAIRE_MAX_QUESTIONS,
  QUESTIONNAIRE_MIN_OPTIONS,
  QUESTIONNAIRE_OPTION_TEXT_MAX_LENGTH,
  QUESTIONNAIRE_QUESTION_PROMPT_MAX_LENGTH,
  QUESTIONNAIRE_TITLE_MAX_LENGTH,
  formatQuestionnaire,
  validateQuestionnaireShape,
};