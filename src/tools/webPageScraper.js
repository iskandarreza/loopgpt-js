const { OpenAIModel } = require('../openAIModel.js')
const BaseTool = require('./baseToolClass.js')

class WebPageScraper extends BaseTool {
  static identifier = 'WebPageScraper'
  constructor(agent = null) {
    super(WebPageScraper.identifier)
    /**
     * @type {{ memory: { add: (arg0: string) => void; }; } | undefined}
     */
    this.agent = agent || undefined
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
      console.log({ data, result, text })

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
    if (this.agent) {
      let entry = `Summary for ${pagetitle}:\n`
      for (const r of summary) {
        entry += `\t${r[0]}: ${r[1]}\n`
      }
      entry += '\n'
      this.agent.memory.add(entry)
    }
  }

  /**
   * @param {string} text
   * @param {string} title
   */
  async summarizeTextChunks(text, title) {
    const maxTokens = 1500
    const delayBetweenCalls = 4000 // Delay in milliseconds
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
          content: `Summarize this partial chunk, ${currentChunkNumber} of ${totalChunks} from a webpage titled: ${title}`,
        },
        { role: 'user', content: `${chunk}` },
      ]

      const response = await this.openAIComplete(message)
      if (response.error) {
        console.log(response.error)
      } else {
        console.log(JSON.stringify(response, null, 4))
        const summary = response.choices[0].message.content
        summaries.push(summary)
      }

      currentChunkNumber++

      // Introduce a delay between API calls
      await sleep(delayBetweenCalls)
    }

    const combinedSummary = summaries.join(' ')

    return combinedSummary
  }

  // Function to split the text into chunks
  /**
   * @param {string} text
   * @param {number} maxTokens
   */
  splitTextIntoChunks(text, maxTokens) {
    const chunks = []
    let currentChunk = ''
    const sentences = text.split(/[.:]\s*\n|\s*,\s+/)

    for (const sentence of sentences) {
      const sentenceTokens = sentence.split(/\s+/).length

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
          currentChunk = sentence + '.'
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

    for (const word of words) {
      const wordTokens = word.split(/\s+/).length
      const chunkTokens = currentChunk.split(/\s+/).length

      if (chunkTokens + wordTokens < maxTokens) {
        currentChunk += word + ' '
      } else {
        if (currentChunk !== '') {
          chunks.push(currentChunk.trim())
          currentChunk = ''
        }
        currentChunk = word + ' '
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
        max_tokens: response.getTokenLimit(),
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
