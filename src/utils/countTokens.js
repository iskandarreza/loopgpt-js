/**
 * The function counts the number of tokens in a given text using a basic heuristic.
 * @param {string} text - The input text for which we want to count the number of tokens.
 * @returns {number} The function `countTokens` returns the total count of tokens in the input `text`.
 */
function countTokens(text) {
  // Basic heuristic to estimate token count
  const wordCount = text.split(/\s+/).length
  const punctuationCount = text.split(/[.,;!?]/).length - 1
  const tokenCount = wordCount + punctuationCount

  return tokenCount
}

module.exports = countTokens
