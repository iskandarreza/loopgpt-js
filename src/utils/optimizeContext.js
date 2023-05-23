const countTokens = require('./countTokens.js')

/**
 * This function optimizes a chat history by removing duplicate system messages and limiting the total
 * number of tokens in the optimized history.
 * @param {Array<{role: string, content: string}>} history - The `history` parameter is an array of objects representing messages in a
 * conversation. Each object has two properties: `role` (a string representing the role of the message
 * sender, e.g. "user" or "bot") and `content` (a string representing the message content). The array
 * @param {number} maxTokens - The `maxTokens` parameter is a number that represents the maximum number of
 * tokens (a unit of measurement for text length) allowed in the optimized history context. The
 * function will stop adding messages to the optimized history once the total number of tokens exceeds
 * this value.
 * @returns {Promise<Array<{role: string, content: string}>>} an array of message objects that have been optimized based on their content length and the
 * maximum token limit.
 */
async function optimizeContext(history, maxTokens) {
  let totalTokens = 0
  const optimizedHistory = []

  /**
   * @type {Array<{role: string, content: string}>}
   */
  const uniqueHistory = []
  for (let i = history.length - 1; i >= 0; i--) {
    const message = history[i]

    // Skip duplicates
    if (
      message.role === 'system' &&
      uniqueHistory.some((msg) => msg.content === message.content)
    ) {
      continue
    }

    uniqueHistory.push(message)
  }

  if (uniqueHistory.length) {
    // Add the first two history messages to the optimized history context
    optimizedHistory.push(uniqueHistory[uniqueHistory.length - 1])
    optimizedHistory.push(uniqueHistory[uniqueHistory.length - 2])
    totalTokens +=
      (await countTokens(uniqueHistory[uniqueHistory.length - 1].content)) + 3
    totalTokens +=
      (await countTokens(uniqueHistory[uniqueHistory.length - 2].content)) + 3

    for (let i = uniqueHistory.length - 3; i >= 0; i--) {
      const message = uniqueHistory[i]
      const messageTokens = (await countTokens(message.content)) + 3

      // Break at maxTokens
      if (totalTokens + messageTokens > maxTokens) {
        break
      }

      optimizedHistory.push(message)
      totalTokens += messageTokens
    }
  }

  return optimizedHistory
}

module.exports = optimizeContext
