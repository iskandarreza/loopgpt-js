const WebSearch = require("./tools/webSearch.js");
const WebPageScraper = require('./tools/webPageScraper.js');

class Tools {

  /**
   * @param {{ name: any; }} classToSet
   */
  setToolId(classToSet) {
    Object.defineProperty(classToSet, 'toolId', {
      value: classToSet.name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase(),
      writable: false,
      configurable: false
    });
  }

  /**
   * @param {{name: any;}} classToSet
   * @param {{ googleApiKey: string; googleCxId: string; }} [keys]
   */
  addGoogleKeys(classToSet, keys) {
    // @ts-ignore
    Object.defineProperty(classToSet.prototype, 'googleApiKey', {
      value: keys?.googleApiKey,
      writable: false,
      configurable: false,
    });
    // @ts-ignore
    Object.defineProperty(classToSet.prototype, 'googleCxId', {
      value: keys?.googleCxId,
      writable: false,
      configurable: false,
    });
  }

  /**
   * The function returns an array of browsing tools.
   * @returns {Array<object>} An array of browsing tools, which includes WebSearch and Browser.
   * @param {{ googleApiKey: string; googleCxId: string; }} [keys]
   */
  browsingTools(keys) {

    const tools = [
      WebSearch,
      WebPageScraper
    ]

    tools.forEach((v) => {
      if (v.identifier === 'WebSearch' && keys?.googleApiKey && keys.googleCxId) {
        this.addGoogleKeys(v, keys)
      }
    })


    return tools
  }
}

module.exports = { Tools }