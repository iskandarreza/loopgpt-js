const WebSearch = require('./tools/webSearch.js')
const WebPageScraper = require('./tools/webPageScraper.js')
/**
 * Abstract base class for tools.
 * @typedef {Object} BaseTool
 * @property {Function} constructor - The constructor function of the base tool.
 * @property {string} id - The unique identifier for the tool.
 * @property {string} desc - The description of the tool.
 * @property {Object.<string, string>} args - Dictionary of arguments for the tool.
 * @property {Object.<string, string>} resp - Response format of the tool.
 * @property {Function} prompt - Returns the tool information as a JSON string.
 * @property {Function} config - Returns the configuration object for the tool.
 */

class Tools {
  /**
   * @param {{ name: any }} classToSet
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
   * @param {{ apiKey: string }} keys
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
   * @param {{ googleApiKey: string, googleCxId: string }} keys
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
   * @param {{google: { googleApiKey: string, googleCxId: string }, openai: {apiKey: string}}} [keys]
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
