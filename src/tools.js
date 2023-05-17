const WebSearch = require('./tools/webSearch.js')
const WebPageScraper = require('./tools/webPageScraper.js')

class Tools {
  /**
   * @param {{ name: any; }} classToSet
   */
  setToolId(classToSet) {
    Object.defineProperty(classToSet, 'toolId', {
      value: classToSet.name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase(),
      writable: false,
      configurable: false,
    })
  }

  /**
   * @param {typeof WebPageScraper} classToSet
   * @param {{ apiKey: string; }} keys
   */
  addOpenAIKey(classToSet, keys) {
    Object.defineProperty(classToSet.prototype, 'openaiApiKey', {
      value: keys?.apiKey,
      writable: false,
      configurable: false,
    })
  }

  /**
   * @param {typeof WebSearch} classToSet
   * @param {{ googleApiKey: string; googleCxId: string; }} keys
   */
  addGoogleKeys(classToSet, keys) {
    // @ts-ignore
    Object.defineProperty(classToSet.prototype, 'googleApiKey', {
      value: keys?.googleApiKey,
      writable: false,
      configurable: false,
    })
    // @ts-ignore
    Object.defineProperty(classToSet.prototype, 'googleCxId', {
      value: keys?.googleCxId,
      writable: false,
      configurable: false,
    })
  }

  /**
   * The function returns an array of browsing tools.
   * @param {object} [keys]
   * @param {{ googleApiKey: string; googleCxId: string; }} keys.google
   * @param {object} keys.openai
   * @param {string} keys.openai.apiKey
   * @returns {Array<any>} An array of browsing tools, which includes WebSearch and Browser.
   */
  browsingTools(keys) {
    const tools = [WebSearch, WebPageScraper]

    if (!!keys) {
      this.addGoogleKeys(WebSearch, keys.google)
      this.addOpenAIKey(WebPageScraper, keys.openai)
    }

    return tools
  }
}

module.exports = { Tools }
