const { OpenAIModel } = require('../openAIModel.js')
const countTokens = require('./countTokens.js')

class Summarizer {
  #key
  /**
   * @param {string} openaiApiKey
   */
  constructor(openaiApiKey) {
    this.#key = openaiApiKey
  }
  /**
   * Parallelizes the summarization process.
   * @param {{title: string;url: string;question: string;}} context
   * @param {string} text
   * @param {number} maxTokens
   * @param {number} parallelProcesses
   * @returns {Promise<string>} The summarized text.
   */
  async parallelizeSummarization(context, text, maxTokens, parallelProcesses) {
    const chunks = Summarizer.splitTextIntoChunks(text, maxTokens)
    const totalChunks = chunks.length

    /**
     * @type {any[]}
     */
    const results = []

    // Function to process a single chunk
    const processChunk = async (
      /** @type {string} */ chunk,
      /** @type {number} */ index
    ) => {
      const title = context.title // Preserve the original title
      const summary = await this.summarizeText({ text: chunk, title })
      results[index] = { index, summary }
    }

    // Function to process the next available chunk in parallel
    const processNextChunk = async () => {
      if (currentIndex < totalChunks) {
        const index = currentIndex
        currentIndex++
        await processChunk(chunks[index], index)
        await processNextChunk() // Recursively process the next available chunk
      } else {
        return // Exit the function when all chunks are processed
      }
    }

    let currentIndex = 0

    // Process chunks in parallel, limited to `parallelProcesses` at a time
    while (currentIndex < totalChunks) {
      const chunkPromises = []
      const remainingChunks = totalChunks - currentIndex
      const chunksToProcess = Math.min(remainingChunks, parallelProcesses)

      // Start processing `chunksToProcess` chunks in parallel
      for (let i = 0; i < chunksToProcess; i++) {
        chunkPromises.push(processNextChunk())
      }

      // Wait for all parallel chunk processing to complete
      await Promise.all(chunkPromises)
    }

    // Combine the individual summaries into a single summarized text
    const summarizedText = results
      .sort((a, b) => a.index - b.index)
      .map((result) => result.summary)
      .join(' ')

    // Check if the combined summary still exceeds the token limit
    if (countTokens(summarizedText) > maxTokens) {
      return await this.retrySummarization(context, summarizedText, maxTokens)
    } else {
      return summarizedText
    }
  }

  /**
   * @param {{text: string; title: string;}} textData
   * @param {{currentChunk: number; totalChunks: number;}} [chunkData]   */
  summarizePrompt(textData, chunkData) {
    const contentHeader = `Summarize the following${
      !!chunkData
        ? `, ${chunkData.currentChunk} of ${chunkData.totalChunks})`
        : ''
    }, from a webpage titled: ${textData.title}:`

    return [
      {
        role: 'user',
        content: contentHeader,
      },
      { role: 'user', content: `${textData.text}` },
    ]
  }

  /**
   * @param {{text: string; title: string;}} textData
   * @param {{currentChunk: number; totalChunks: number;}} [chunkData]
   */
  async summarizeText(textData, chunkData) {
    const delayBetweenCalls = 10000 // Delay in milliseconds

    // Function to introduce a delay
    /**
     * @param {number} ms
     */
    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }

    // Function to handle API completion with retries
    // @ts-ignore
    const handleAPICompletion = async (
      /** @type {{ role: string; content: string; }[]} */ prompt
    ) => {
      while (true) {
        const response = await this.openAIComplete(prompt)
        if (response.error) {
          console.error(response.error)
          if (response.error.code === 'context_length_exceeded') {
            // Split the chunk in half and retry
            const { text } = textData
            const halfLength = Math.floor(textData.text.length / 2)
            const firstHalf = text.slice(0, halfLength)
            const secondHalf = text.slice(halfLength)

            const firstHalfPrompt = this.summarizePrompt(
              { text: firstHalf, title: textData.title },
              { currentChunk: 1, totalChunks: 2 }
            )
            const secondHalfPrompt = this.summarizePrompt(
              { text: secondHalf, title: textData.title },
              { currentChunk: 2, totalChunks: 2 }
            )

            console.error('handleAPICompletionError', {
              error: response.error,
              firstHalfPrompt,
              secondHalfPrompt,
            })
            // @ts-ignore
            const firstHalfResponse = await handleAPICompletion(firstHalfPrompt)
            // @ts-ignore
            const secondHalfResponse = await handleAPICompletion(
              secondHalfPrompt
            )

            // Combine the responses
            // @ts-ignore
            const combinedSummary =
              firstHalfResponse.choices[0].message.content +
              secondHalfResponse.choices[0].message.content

            return { choices: [{ message: { content: combinedSummary } }] }
          } else {
            // Retry the API call after a delay
            await sleep(delayBetweenCalls)
          }
        } else {
          return response.choices[0].message.content
        }
      }
    }

    // Make sure to await the API completion
    return await handleAPICompletion(this.summarizePrompt(textData, chunkData))
  }

  // Function to split the text into chunks
  /**
   * @param {string} text
   * @param {number} maxTokens
   */
  static splitTextIntoChunks(text, maxTokens) {
    const chunks = []
    const sentences = text.split(/[.:]\s*\n|\s*,\s+/)
    let currentChunk = ''

    for (const sentence of sentences) {
      const sentenceTokens = countTokens(sentence)

      if (currentChunk.length + sentenceTokens < maxTokens) {
        currentChunk += sentence + '.'
      } else {
        if (currentChunk !== '') {
          chunks.push(currentChunk.trim())
          currentChunk = ''
        }

        if (sentenceTokens >= maxTokens) {
          const sentenceChunks = this.splitLongSentenceIntoChunks(
            sentence,
            maxTokens
          )
          chunks.push(...sentenceChunks)
        } else {
          chunks.push(sentence + '.')
        }
      }
    }

    if (currentChunk !== '') {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }

  /**
   * @param {string} sentence
   * @param {number} maxTokens
   */
  static splitLongSentenceIntoChunks(sentence, maxTokens) {
    const words = sentence.split(/\s+/)
    const chunks = []
    let currentChunk = ''
    let currentTokenCount = 0

    for (const word of words) {
      const wordTokens = countTokens(word)
      const chunkTokens = currentTokenCount

      if (chunkTokens + wordTokens < maxTokens) {
        currentChunk += word + ' '
        currentTokenCount += wordTokens
      } else {
        if (currentChunk !== '') {
          chunks.push(currentChunk.trim())
          currentChunk = ''
          currentTokenCount = 0
        }
        currentChunk = word + ' '
        currentTokenCount = wordTokens
      }
    }

    if (currentChunk !== '') {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }

  /**
   * @param {{ role: string; content: string; }[]} prompt
   */
  async openAIComplete(prompt) {
    try {
      // @ts-ignore
      const response = new OpenAIModel(this.#key)
      const results = await response.chat(prompt, {
        max_tokens: 3000 * 0.8, // add margin
      })
      return results
    } catch (error) {
      console.error(error)
      throw new Error('Failed to make the API call.')
    }
  }

  /**
   * @param {{ title: any; url?: string; question?: string; }} context
   * @param {string} text
   * @param {number} maxTokens
   */
  // @ts-ignore
  async retrySummarization(context, text, maxTokens) {
    const halfLength = Math.floor(text.length / 2)
    const firstHalf = text.slice(0, halfLength)
    const secondHalf = text.slice(halfLength)

    const firstHalfSummary = await this.summarizeText(
      { text: firstHalf, title: context.title },
      { currentChunk: 1, totalChunks: 2 }
    )
    const secondHalfSummary = await this.summarizeText(
      { text: secondHalf, title: context.title },
      { currentChunk: 2, totalChunks: 2 }
    )

    const combinedSummary =
      firstHalfSummary.choices[0].message.content +
      ' ' +
      secondHalfSummary.choices[0].message.content

    if (countTokens(combinedSummary) > maxTokens) {
      return await this.retrySummarization(context, combinedSummary, maxTokens)
    } else {
      return combinedSummary
    }
  }
}

module.exports = Summarizer
