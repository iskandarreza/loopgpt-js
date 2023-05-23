const Agent = require('../agent.js').Agent
const BaseTool = require('./baseToolClass.js')
const Summarizer = require('../utils/summarizer.js')
const countTokens = require('../utils/countTokens.js')
const { saveTextToIndexedDB } = require('../utils/indexedDB.js')

class WebPageScraper extends BaseTool {
  static identifier = 'WebPageScraper'
  /**
   * @param {Agent} agent
   */
  constructor(agent) {
    super(WebPageScraper.identifier)
    this.agent = agent
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

      text = doc.textContent

      return { links, text }
    } catch (error) {
      console.error('An error occurred while scraping the web page:', error)
      return { links, text }
    }
  }

  /**
   * @param {string} url
   * @param {string} selector
   */
  async scrapeWebPageAPI(url, selector) {
    try {
      const apiUrl = `https://web.scraper.workers.dev?url=${encodeURIComponent(
        url
      )}&selector=${encodeURIComponent(selector)}&scrape=text`
      const response = await fetch(apiUrl)
      const data = await response.json()
      const { result } = await data
      const text = result ? result[selector] : 'No data'

      return text
    } catch (error) {
      console.error('An error occurred while scraping the web page:', error)
      return null
    }
  }

  /**
   * Executes the web page scraping and summarization.
   * @param {Array<{url: string; question: string;}>|{url: string; question: string;}} args
   * @returns {Promise<{ text: string | null, links: (string|null)[] } | string>} The scraped data and summarized text.
   */
  async run(args) {
    console.log({ args })

    if (!args) {
      return 'Error: args is missing'
    }

    let _url
    let _question
    if (Array.isArray(args)) {
      if (args.length === 0) {
        return 'Error: args array is empty'
      }

      const { url, question } = args[0]

      if (!url || !question) {
        if (!url && !question) {
          return 'Error: both url and question arguments are missing'
        } else if (!url) {
          return 'Error: url argument is missing'
        } else {
          return 'Error: question argument is missing'
        }
      }
      _url = url
      _question = question
    } else {
      const { url, question } = args

      if (!url || !question) {
        if (!url && !question) {
          return 'Error: both url and question arguments are missing'
        } else if (!url) {
          return 'Error: url argument is missing'
        } else {
          return 'Error: question argument is missing'
        }
      }

      _url = url
      _question = question
    }

    let title = ''
    let text = ''

    let context = {
      title,
      url: _url,
      question: _question,
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
      const pagetitle = await this.scrapeWebPageAPI(_url, 'title')
      const results = await this.scrapeWebPageAPI(_url, 'body')

      if (results) {
        context.title = JSON.stringify(pagetitle)
        text = JSON.stringify(results)

        const tokenCount = await countTokens(text)
        const maxTokensThreshold = 800 // Threshold for immediate summarization
        const rateLimitThreshold = 5000 // Maximum tokens to process within the rate limit
        // @ts-ignore
        const summarizer = new Summarizer(this.openaiApiKey)

        if (tokenCount > maxTokensThreshold) {
          if (tokenCount <= rateLimitThreshold) {
            // Calculate parallelization
            const parallelProcesses = Math.ceil(tokenCount / rateLimitThreshold)
            try {
              text = await summarizer.parallelizeSummarization(
                context,
                text,
                maxTokensThreshold,
                parallelProcesses
              )

              console.debug({ tokenCount, parallelProcesses, text })
            } catch (error) {
              console.error({
                context,
                text,
                maxTokensThreshold,
                parallelProcesses,
              })
              throw Error('Error occurred calculating parallelization')
            }
          } else {
            await saveForLater()
          }
        } else {
          // Summarize the text immediately
          const response = await summarizer.openAIComplete(
            summarizer.summarizePrompt({ text, title: pagetitle })
          )
          text = response.choices[0].message.content
        }

        // TODO: use another tool to grab links, currently only pushing in page url
        links.push(_url)
        // Save the summarized text in IndexedDB
        const indexKey = await saveTextToIndexedDB(
          'web_page_scraper_results',
          context,
          text
        )
        await this._addToMemory(pagetitle, { text, url: _url, indexKey })
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
   * @param {any} pagetitle
   * @param {{ text: string; url: string; indexKey: string; }} results
   */
  async _addToMemory(pagetitle, results) {
    if (this.agent.memory) {
      let entry = `Summary for ${pagetitle}:\n`
      entry += `\t${results.text}: {${results.url}} -- ${results.indexKey}\n`
      entry += '\n'

      const memoryEntries = this.agent.memory.docs.filter(
        (/** @type {string} */ doc) => (doc = entry)
      )
      if (memoryEntries.length === 0) {
        await this.agent.memory.add(entry)
      }
      // }
    }
  }
}

module.exports = WebPageScraper
