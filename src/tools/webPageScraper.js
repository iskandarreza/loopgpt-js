const Agent = require('../agent.js').Agent
const { OpenAIModel } = require('../openAIModel.js')
const BaseTool = require('./baseToolClass.js')
const countTokens = require('../utils/countTokens.js')
const openDatabase = require('../utils/openDatabase.js')
const saveTextToIndexedDB = require('../utils/saveTextToIndexedDB.js')

class WebPageScraper extends BaseTool {
  static identifier = 'WebPageScraper'
  /**
   * @param {Agent|undefined} [agent]
   */
  constructor(agent) {
    super(WebPageScraper.identifier)
    this.memory = agent?.memory || null
  }

  /**
   * Dictionary of arguments for the tool.
   * @type {Object.<string, string>}
   */
  get args() {
    return {
      url: 'The URL of the web page to scrape',
      question: 'The question for summarization',
    }
  }

  /**
   * Response format of the tool.
   * @type {Object.<string, any>}
   */
  get resp() {
    return {
      text: 'The summarized text from the web page',
      links: 'The extracted links from the web page',
    }
  }

  /**
   * Scrapes a web page using the provided URL.
   * @param {string} url - The URL of the web page.
   * @returns {Promise<{ text: string | null, links: (string|null)[] }>} The scraped data from the web page.
   */
  async scrapeWebPage(url) {
    let text = null
    /**
     * @type {(string | null)[]}
     */
    let links = []

    try {
      const response = await fetch(url)
      const html = await response.text()

      let doc

      const parser = new DOMParser()
      doc = parser.parseFromString(html, 'text/html')

      // Remove script and style tags from the HTML
      const scriptTags = doc.querySelectorAll('script')
      scriptTags.forEach((/** @type {{ remove: () => any; }} */ script) =>
        script.remove()
      )

      const styleTags = doc.querySelectorAll('style')
      styleTags.forEach((/** @type {{ remove: () => any; }} */ style) =>
        style.remove()
      )

      // Extract links from the web page
      const linkElements = doc.querySelectorAll('a')
      links = Array.from(linkElements)
        .map((element) => element.getAttribute('href'))
        .slice(0, 5)

      // Convert HTML to Markdown
      // const turndownService = new TurndownService();
      // const markdown = turndownService.turndown(doc.documentElement);
      text = doc.textContent

      return { links, text }
    } catch (error) {
      console.error('An error occurred while scraping the web page:', error)
      return { links, text }
    }
  }

  /**
   * @param {string | number | boolean} url
   * @param {string | number | boolean} selector
   */
  async scrapeWebPageAPI(url, selector) {
    try {
      const apiUrl = `https://web.scraper.workers.dev?url=${encodeURIComponent(
        url
      )}&selector=${encodeURIComponent(selector)}&scrape=text`
      const response = await fetch(apiUrl)
      const data = await response.json()
      const { result } = await data
      // @ts-ignore
      const text = result[selector]

      return text
    } catch (error) {
      console.error('An error occurred while scraping the web page:', error)
      return null
    }
  }

  /**
   * Adds the web page summary to the agent's memory.
   * @param {string} pagetitle - The search query.
   * @param {(string | null | undefined)[][]} summary - The search results.
   */
  // _addToMemory(pagetitle, summary) {
  //   if (this.memory) {
  //     let entry = `Summary for ${pagetitle}:\n`
  //     for (const r of summary) {
  //       entry += `\t${r[0]}: ${r[1]}\n`
  //     }
  //     entry += '\n'
  //     this.memory.add(entry)
  //   }
  // }

  /**
   * @param {string} text
   * @param {string} title
   */
  async summarizeTextChunks(text, title) {
    const maxTokens = 1000
    const delayBetweenCalls = 10000 // Delay in milliseconds
    const chunks = this.splitTextIntoChunks(text, maxTokens)
    const totalChunks = chunks.length
    let currentChunkNumber = 1
    const summaries = []

    // Function to introduce a delay
    /**
     * @param {number} ms
     */
    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }

    // Iterate over each chunk and make API calls for summarization
    for (const chunk of chunks) {
      console.log({ chunk, title, currentChunkNumber, totalChunks })
      const message = [
        {
          role: 'user',
          content: `Summarize the following, ${currentChunkNumber} of ${totalChunks}, from a webpage titled: ${title}`,
        },
        { role: 'user', content: `${chunk}` },
      ]

      const response = await this.openAIComplete(message)
      if (response.error) {
        console.log(response.error)
      } else {
        console.log(JSON.stringify(response.usage, null, 4))
        const summary = response.choices[0].message.content
        summaries.push(summary)
      }

      currentChunkNumber++

      // Introduce a delay between API calls
      await sleep(delayBetweenCalls)
    }

    let combinedSummary = summaries.join(' ')

    console.log({ summaryTokenCount: countTokens(combinedSummary) })

    // Check if the combined summary still exceeds the token limit
    if (countTokens(combinedSummary) > maxTokens) {
      const summaryChunks = this.splitTextIntoChunks(combinedSummary, maxTokens)
      const summarySummaries = []

      // Iterate over each summary chunk and make API calls for summarization
      for (const chunk of summaryChunks) {
        console.log({ chunk, currentChunkNumber, totalChunks })
        const message = [
          {
            role: 'user',
            content: `Summarize the following, continued ${currentChunkNumber} of ${totalChunks}`,
          },
          { role: 'user', content: `${chunk}` },
        ]

        const response = await this.openAIComplete(message)
        if (response.error) {
          console.log(response.error)
        } else {
          console.log(JSON.stringify(response.usage, null, 4))
          const summary = response.choices[0].message.content
          summarySummaries.push(summary)
        }

        currentChunkNumber++

        // Introduce a delay between API calls
        await sleep(delayBetweenCalls)
      }

      combinedSummary = summarySummaries.join(' ')
    }

    console.log({ summaryTokenCount: countTokens(combinedSummary) })

    return combinedSummary
  }

  // Function to split the text into chunks
  /**
   * @param {string} text
   * @param {number} maxTokens
   */
  splitTextIntoChunks(text, maxTokens) {
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
  splitLongSentenceIntoChunks(sentence, maxTokens) {
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
      const response = new OpenAIModel(this.openaiApiKey)
      const results = await response.chat(prompt, {
        max_tokens: 3000 * 0.8, // add margin
      })

      return results
    } catch (error) {
      console.error('Error:', error)
      throw new Error('Failed to make the API call.')
    }
  }

  /**
   * Executes the web page scraping and summarization.
   * @param {{url: string; question: string;}} args
   * @returns {Promise<{ text: string | null, links: (string|null)[] }>} The scraped data and summarized text.
   */
  async run({ url, question }) {
    let title = ''
    let text = ''

    let context = {
      title,
      url,
      question,
    }
    /**
     * @type {(string | null)[]}
     */
    let links = []

    // Save the text for later summarization
    const saveForLater = async () => {
      const localStorageKey = await saveTextToIndexedDB(
        'unsummarized_texts',
        context,
        text
      )
      text = `Information saved for later summarization, key: '${localStorageKey}'`
    }

    try {
      const pagetitle = await this.scrapeWebPageAPI(url, 'title')
      const results = await this.scrapeWebPageAPI(url, 'body')

      if (results) {
        context.title = JSON.stringify(pagetitle)
        text = JSON.stringify(results)

        const tokenCount = countTokens(text)
        const maxTokensThreshold = 1000 // Threshold for immediate summarization
        const rateLimitThreshold = 10000 // Maximum tokens to process within the rate limit

        if (tokenCount > maxTokensThreshold) {
          if (tokenCount <= rateLimitThreshold) {
            // Calculate parallelization
            try {
              const parallelProcesses = Math.ceil(
                tokenCount / rateLimitThreshold
              )
              text = await this.parallelizeSummarization(
                context,
                text,
                parallelProcesses
              )
            } catch (error) {
              console.error('Error occurred calculating parallelization', error)
              await saveForLater()
            }
          } else {
            await saveForLater()
          }
        } else {
          // Summarize the text immediately
          text = await this.summarizeTextChunks(text, question)
        }

        links.push(url) // TODO: use another tool to grab links, currently only pushing in page url
        // Save the summarized text in IndexedDB
        await saveTextToIndexedDB('web_page_scraper_results', context, text)
      }
    } catch (apiError) {
      console.error(
        'An error occurred while scraping the web page using the API method:',
        apiError
      )

      throw Error('Critical error, threads should be ended')
    }

    return { text, links }
  }

  /**
   * Parallelizes the summarization process.
   * @param {{ title: string; url: string; question: string; }} context
   * @param {string} text
   * @param {number} parallelProcesses
   * @returns {Promise<string>} The summarized text.
   */
  async parallelizeSummarization(context, text, parallelProcesses) {
    // Implement your own logic to parallelize the summarization process
    // Spawn parallel processes or utilize concurrency mechanisms like Promise.all or worker threads
    // Distribute the text into chunks and send them to the summarization API in parallel
    // Aggregate the summarized chunks and return the complete summary
    throw Error('Not implemented')
    return 'summarized text'
  }
}

module.exports = WebPageScraper

/**
 * Retrieves the saved text from IndexedDB using the key.
 * @param {string} storeName The name of the object store.
 * @param {string} key The key under which the text is saved.
 * @returns {Promise<{ context: object, text: string }>} The saved context and text.
 */
async function retrieveText(storeName, key) {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const objectStore = transaction.objectStore(storeName)
    const request = objectStore.get(key)

    request.onsuccess = (
      /** @type {{ target: { result: any; }; }} */ event
    ) => {
      // @ts-ignore
      const data = event.target ? event.target.result : null
      if (data) {
        resolve(data)
      } else {
        reject(new Error('Text not found'))
      }
    }

    request.onerror = (/** @type {{ target: { error: any; }; }} */ event) => {
      // @ts-ignore
      const error = event.target ? event.target.error : null
      reject(
        error ||
        new Error(
          'An error occurred while retrieving the text from the database.'
        )
      )
    }
  })
}
