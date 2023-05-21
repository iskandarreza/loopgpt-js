/**
 * The function counts the number of tokens in a given text using a basic heuristic.
 * @param {string} text - The input text for which we want to count the number of tokens.
 * @returns {Promise<number>} The function `countTokens` returns the total count of tokens in the input `text`.
 */
async function countTokens(text) {
  // Basic heuristic to estimate token count
  const wordCount = text.split(/\s+/).length
  const punctuationCount = text.split(/[.,;!?]/).length - 1
  const tokenCount = wordCount + punctuationCount
  const adjustedTokenCount = Math.round(tokenCount + tokenCount * (175 / 100))

  // // Using gpt-3-encoder on server API endpoint
  // const serverCountToken = await fetch('/api/count-tokens', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({ text }),
  // })

  // if (serverCountToken.ok) {
  //   const { count } = await serverCountToken.json()
  //   console.log({
  //     tokenCount,
  //     adjustedTokenCount,
  //     count,
  //     diffPercentage: Math.round(((count - adjustedTokenCount) / count) * 100),
  //   })
  // }

  return adjustedTokenCount
}

module.exports = countTokens
