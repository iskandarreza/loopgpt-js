const Agent = require('../agent.js').Agent
const BaseTool = require('./baseToolClass.js')
const Summarizer = require('../utils/summarizer.js')
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
        const maxTokensThreshold = 800 // Threshold for immediate summarization
        const rateLimitThreshold = 5000 // Maximum tokens to process within the rate limit
        // @ts-ignore
        const summarizer = new Summarizer(this.openaiApiKey)

        if (tokenCount > maxTokensThreshold) {
          if (tokenCount <= rateLimitThreshold) {
            // Calculate parallelization
            try {
              const parallelProcesses = Math.ceil(
                tokenCount / rateLimitThreshold
              )
              text = await summarizer.parallelizeSummarization(
                context,
                text,
                maxTokensThreshold,
                parallelProcesses
              )
            } catch (error) {
              throw Error('Error occurred calculating parallelization')
              // await saveForLater()
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

        links.push(url) // TODO: use another tool to grab links, currently only pushing in page url
        // Save the summarized text in IndexedDB
        console.log({ context, text }) // bad results
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
