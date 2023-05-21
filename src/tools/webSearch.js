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
    this.memory = agent.memory
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

    // Extract the search results from the response data
    const results = await data.items?.map(
      (/** @type {{ title: any; link: any; snippet: any; }} */ item) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      })
    )

    for (const { title, link: url, snippet } of results) {
      const context = {
        title,
        url,
        question: query,
      }
      await saveTextToIndexedDB('web_search_results', context, snippet)
    }

    await this._addToMemory(query, results)
    return results
  }

  /**
   * Adds the search query and results to the agent's memory.
   * @param {string} query - The search query.
   * @param {{title: string; link: string; question: string;}[]} results - The search results.
   */
  async _addToMemory(query, results) {
    console.log({ results })
    if (this.memory) {
      let entry = `Search result for ${query}:\n`
      for (const { title, link } of results) {
        entry += `\t${title}: ${link}\n`
        console.log({ memoryEntry: entry, memory: this.memory })
      }
      entry += '\n'

      await this.memory.add(entry)
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
