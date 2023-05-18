const BaseTool = require('./baseToolClass.js');

class WebPageScraper extends BaseTool {
  constructor() {
    super('WebPageScraper');
  }

  /**
   * Dictionary of arguments for the tool.
   * @type {Object.<string, string>}
   */
  get args() {
    return {
      url: 'The URL of the web page to scrape',
      question: 'The question for summarization',
    };
  }

  /**
   * Response format of the tool.
   * @type {Object.<string, any>}
   */
  get resp() {
    return {
      text: 'The summarized text from the web page',
      links: 'The extracted links from the web page',
    };
  }

  /**
   * Scrapes a web page using the provided URL.
   * @param {string} url - The URL of the web page.
   * @returns {Promise<{ text: string | null, links: (string|null)[] }>} The scraped data from the web page.
   */
  async scrapeWebPage(url) {
    let text = null;
    /**
     * @type {(string | null)[]}
     */
    let links = [];

    try {
      const response = await fetch(url);
      const html = await response.text();

      let doc;

      const parser = new DOMParser();
      doc = parser.parseFromString(html, 'text/html');

      // Remove script and style tags from the HTML
      const scriptTags = doc.querySelectorAll('script');
      scriptTags.forEach((/** @type {{ remove: () => any; }} */ script) => script.remove());

      const styleTags = doc.querySelectorAll('style');
      styleTags.forEach((/** @type {{ remove: () => any; }} */ style) => style.remove());

      // Extract links from the web page
      const linkElements = doc.querySelectorAll('a');
      links = Array.from(linkElements)
        .map((element) => element.getAttribute('href'))
        .slice(0, 5);

      // Convert HTML to Markdown
      // const turndownService = new TurndownService();
      // const markdown = turndownService.turndown(doc.documentElement);
      text = doc.textContent;

      return { links, text };
    } catch (error) {
      console.error('An error occurred while scraping the web page:', error);
      return { links, text };
    }
  }


  /**
   * @param {string | number | boolean} url
   * @param {string | number | boolean} selector
   */
  async scrapeWebPageAPI(url, selector, attr = '', pretty = false, spaced = false) {
    try {
      const apiUrl = `https://web.scraper.workers.dev?url=${encodeURIComponent(url)}&selector=${encodeURIComponent(selector)}&attr=${encodeURIComponent(attr)}&pretty=${pretty}&spaced=${spaced}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('An error occurred while scraping the web page:', error);
      return null;
    }
  }


  // TODO: use the AI to summarize the text
  /**
   * Summarizes the text using the provided question.
   * @param {string} text - The text content from the web page.
   * @param {string} question - The question for summarization.
   * @returns {Promise<string|null>} The summarized text.
   */
  async summarizeText(text, question) {
    try {
      // Perform summarization using the provided text and question
      // Example: Return the first 100 characters as the summary
      const summary = text.slice(0, 100);

      return summary;
    } catch (error) {
      console.error('An error occurred while summarizing the text:', error);
      return null;
    }
  }

  /**
   * Executes the web page scraping and summarization.
   * @param {string} url - The URL of the web page.
   * @param {string} question - The question for summarization.
   * @returns {Promise<{ text: string | null, links: (string|null)[] }>} The scraped data and summarized text.
   */
  async run(url, question) {
    let text = null;
    /**
     * @type {(string | null)[]}
     */
    let links = [];

    if (typeof window !== 'undefined') {

      try {
        const { text: originalText, links: originalLinks } = await this.scrapeWebPage(url);

        text = originalText;
        links = originalLinks;
      } catch (error) {
        console.error('An error occurred while scraping the web page using the original method:', error);
      }

    } else {
      try {
        const apiSelector = 'body';
        const apiResult = await this.scrapeWebPageAPI(url, apiSelector);

        if (apiResult) {
          text = apiResult;
        }
      } catch (apiError) {
        console.error('An error occurred while scraping the web page using the API method:', apiError);
      }
    }

    return { text, links };
  }


}

module.exports = WebPageScraper;
