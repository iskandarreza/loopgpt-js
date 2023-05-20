const Agent = require('../agent.js').Agent
const { OpenAIModel } = require('../openAIModel.js')
const BaseTool = require('./baseToolClass.js')

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
  _addToMemory(pagetitle, summary) {
    if (this.memory) {
      let entry = `Summary for ${pagetitle}:\n`
      for (const r of summary) {
        entry += `\t${r[0]}: ${r[1]}\n`
      }
      entry += '\n'
      this.memory.add(entry)
    }
  }

  /**
   * @param {string} text
   * @param {string} title
   */
  async summarizeTextChunks(text, title) {
    const maxTokens = 1500
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

    console.log({ summaryTokenCount: this.countTokens(combinedSummary) })

    // Check if the combined summary still exceeds the token limit
    if (this.countTokens(combinedSummary) > maxTokens) {
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

    console.log({ summaryTokenCount: this.countTokens(combinedSummary) })

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
      const sentenceTokens = this.countTokens(sentence)

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
      const wordTokens = this.countTokens(word)
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
   * @param {string} text
   */
  countTokens(text) {
    // Basic heuristic to estimate token count
    const wordCount = text.split(/\s+/).length
    const punctuationCount = text.split(/[.,;!?]/).length - 1
    const tokenCount = wordCount + punctuationCount

    return tokenCount
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
    let title = null
    let text = null
    /**
     * @type {(string | null)[]}
     */
    let links = []

    try {
      const pagetitle = await this.scrapeWebPageAPI(url, 'title')
      const results = await this.scrapeWebPageAPI(url, 'body')

      if (results) {
        title = JSON.stringify(pagetitle)
        text = JSON.stringify(results)
        // add logic here to determine if this will be summarized now or later based on 
        // token count, if above a certain threshold, save it for later
        // if later, save the text somewhere and not it in memory that the unsummarized 
        // text has been saved [title, url, localStorage key]
        text = await this.summarizeTextChunks(text, question)
        links.push(url) // TODO: use another tool to grab links, currently only pushing in page url
        // @ts-ignore
        this._addToMemory(title, text)
      }
    } catch (apiError) {
      console.error(
        'An error occurred while scraping the web page using the API method:',
        apiError
      )
    }

    return { text, links }
  }
}

module.exports = WebPageScraper
