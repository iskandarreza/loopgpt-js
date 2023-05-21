const countTokens = require('./countTokens.js')

/**
 * The function optimizes a chat history by removing messages that exceed a maximum token count while
 * preserving the most recent system messages.
 * @param {{role: string; content: string;}[]} history - an array of message objects representing the chat history
 * @param {number} maxTokens - The maximum number of tokens (words) allowed in the optimized history.
 * @returns {Promise<{role: string; content: string;}[]>} an array of chat messages that have been optimized based on a maximum number of tokens
 * allowed.
 */
async function optimizeContext(history, maxTokens) {
  let totalTokens = 0
  const optimizedHistory = []

  if (history.length) {
    // Add the first two history message to the optimized history context
    optimizedHistory.push(history[0])
    optimizedHistory.push(history[1])
    totalTokens += (await countTokens(history[0].content)) + 3
    totalTokens += (await countTokens(history[1].content)) + 3

    for (let i = history.length - 1; i >= 2; i--) {
      const message = history[i]
      const messageTokens = (await countTokens(message.content)) + 3

      // Skip duplicates
      if (
        message.role === 'system' &&
        optimizedHistory[optimizedHistory.length - 1].role === 'system' &&
        optimizedHistory[optimizedHistory.length - 1].content ===
          message.content
      ) {
        continue
      }

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
