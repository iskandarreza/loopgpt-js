const WebSearch = require("./tools/webSearch.js");
const WebPageScraper = require('./tools/webPageScraper.js');

class Tools {
  /**
   * The function returns an array of browsing tools.
   * @returns {Array<object>} An array of browsing tools, which includes WebSearch and Browser.
   */
  browsingTools() {

    const tools = [
      WebSearch,
      WebPageScraper
    ]


    return tools
  }
}

module.exports = { Tools }