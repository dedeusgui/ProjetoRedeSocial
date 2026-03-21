export const COMMENT_MAX_LENGTH = 2000;

export function formatCommentCharacterCount(value = 0) {
  const parsedValue = Number.parseInt(value, 10);
  const count = Number.isNaN(parsedValue) ? 0 : Math.max(0, parsedValue);
  return `${count}/${COMMENT_MAX_LENGTH}`;
}
