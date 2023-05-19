const BaseTool = require('./baseToolClass.js')

class WebSearch extends BaseTool {
  static identifier = 'WebSearch'
  constructor(agent = null) {
    super(WebSearch.identifier)
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
   * @param {string | number | boolean} query
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

    return results
  }

  /**
   * Adds the search query and results to the agent's memory.
   * @param {string} query - The search query.
   * @param {(string | null | undefined)[][]} results - The search results.
   */
  _addToMemory(query, results) {
    if (this.agent) {
      let entry = `Search result for ${query}:\n`
      for (const r of results) {
        entry += `\t${r[0]}: ${r[1]}\n`
      }
      entry += '\n'
      this.agent.memory.add(entry)
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
