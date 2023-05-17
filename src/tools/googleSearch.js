// This is wayy too big, 8.5MB compiled is ridiculous. Set aside for now, look for a different option
import { BaseTool } from './baseToolClass';
import { google } from 'googleapis';
const { duckIt } = require('node-duckduckgo');

class GoogleSearch extends BaseTool {
  constructor() {
    super();
    this.googleApiKey = process.env.GOOGLE_API_KEY;
    this.googleCxId = process.env.CUSTOM_SEARCH_ENGINE_ID;
    /**
     * @type {{ memory: { add: (arg0: string) => void; }; } | undefined}
     */
    this.agent = undefined;
  }

  /**
   * Dictionary of arguments for the tool.
   * @type {Object.<string, string>}
   */
  get args() {
    return { query: 'The query to search for' };
  }

  /**
   * Response format of the tool.
   * @type {Object.<string, string>}
   */
  get resp() {
    return {
      results: 'A list of results. Each result is a list of the form [title, link, description]',
    };
  }

  /**
   * Performs a search using DuckDuckGo.
   * @param {string} query - The search query.
   * @param {number} numResults - The number of results to retrieve.
   * @returns The search results.
   */
  async duckduckgoSearch(query, numResults = 8) {
    const results = await duckIt(query);
    const formattedResults = results.data.map((/** @type {{ data: { AbstractText: any; }; }} */ result) => [result.data.AbstractText]);
    this._addToMemory(query, formattedResults);
    return { results: formattedResults };
  }

  /**
   * Performs a search using Google Custom Search.
   * @param {string} query - The search query.
   * @param {number} numResults - The number of results to retrieve.
   * @returns The search results.
   */
  async googleSearch(query, numResults = 8) {
    const customsearch = google.customsearch('v1');
    const response = await customsearch.cse.list({
      q: query,
      cx: this.googleCxId,
      num: numResults,
      auth: this.googleApiKey,
    });
    const results = response.data.items || [];
    const formattedResults = results.map((result) => [result.title, result.link, result.snippet]);
    this._addToMemory(query, formattedResults);
    return { results: formattedResults };
  }

  /**
   * Adds the search query and results to the agent's memory.
   * @param {string} query - The search query.
   * @param {(string | null | undefined)[][]} results - The search results.
   */
  _addToMemory(query, results) {
    if (this.agent) {
      let entry = `Search result for ${query}:\n`;
      for (const r of results) {
        entry += `\t${r[0]}: ${r[1]}\n`;
      }
      entry += '\n';
      this.agent.memory.add(entry);
    }
  }


  /**
   * Executes the search.
   * @param {string} query - The search query.
   * @param {number} numResults - The number of results to retrieve.
   * @returns {Promise<any>} The search results. The search results as a string.
   */
  async run(query, numResults = 8) {
    try {
      const results = (await this.googleSearch(query, numResults)).results;
      return { results };
    } catch {
      const results = (await this.duckduckgoSearch(query, numResults)).results;
      return { results };
    }
  }
}

export default GoogleSearch;
