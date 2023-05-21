const Agent = require('../agent.js').Agent
const BaseTool = require('./baseToolClass.js')
const saveTextToIndexedDB = require('../utils/saveTextToIndexedDB.js')

class WebSearch extends BaseTool {
  static identifier = 'WebSearch'
  /**
   * @param {Agent} agent
   */
  constructor(agent) {
    super(WebSearch.identifier)
    this.agent = agent
  }

  /**
   * Dictionary of arguments for the tool.
   * @type {Object.<string, string>}
   */
  get args() {
    return { query: 'The query to search for' }
  }

  /**
   * Response format of the tool.
   * @type {Object.<string, string>}
   */
  get resp() {
    return {
      results:
        'A list of results. Each result is a list of the form [title, link, description]',
    }
  }

  /**
   * @param {string} query
   */
  async googleSearch(query, numResults = 8) {
    const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${
      // @ts-ignore
      this.googleApiKey
      // @ts-ignore
    }&cx=${this.googleCxId}&q=${encodeURIComponent(query)}`
    const response = await fetch(apiUrl)
    const data = await response.json()
    let resultsSummary

    // Extract the search results from the response data
    const results = await data.items?.map(
      (/** @type {{ title: string; link: any; snippet: any; }} */ item) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      })
    )

    let memEntry = {}
    memEntry.query = query
    /**
     * @type {{ title: any; link: any; indexKey: string; }[]}
     */
    memEntry.entries = []

    for (const { title, link, snippet } of results) {
      const context = {
        title,
        link,
        question: query,
      }
      const indexKey = await saveTextToIndexedDB(
        'web_search_results',
        context,
        snippet
      )

      memEntry.entries.push({ title, link, indexKey })

      await this._addToMemory(memEntry)
    }

    return `Results for query "${query}" saved to memory`
  }

  /**
   * @param {{ query: string; entries: { title: string; link: string; indexKey: string; }[]; }} memEntry
   */
  async _addToMemory(memEntry) {
    if (this.agent.memory) {
      let entry = `Search result for ${memEntry.query}:\n`
      for (const { title, link, indexKey } of memEntry.entries) {
        entry += `\t${title}: ${link} -- id:${indexKey}\n`
      }
      entry += '\n'
      await this.agent.memory.add(entry)
    }
  }

  /**
   * Executes the search.
   * @param {object} args - The args object.
   * @param {string} args.query - The search query.
   * @param {number} [args.numResults] - The number of results to retrieve.
   * @returns {Promise<any>} The search results. The search results as a string.
   */
  async run({ query, numResults = 8 }) {
    const results = await this.googleSearch(query, numResults)
    return { results }
  }
}

module.exports = WebSearch
