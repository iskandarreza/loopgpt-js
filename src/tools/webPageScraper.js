import { BaseTool } from './baseToolClass';
import axios from 'axios';
import cheerio from 'cheerio';

class WebPageScraper extends BaseTool {
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
   * @returns {Promise<{ text: string | null, links: string[] }>} The scraped data from the web page.
   */
  async scrapeWebPage(url) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      // Remove script and style tags from the HTML
      $('script, style').remove();

      // Extract links from the web page
      const links = $('a')
        .map((index, element) => $(element).attr('href'))
        .get()
        .slice(0, 5);

      // Extract text content from the web page
      const text = $('body').text();

      return { links, text };
    } catch (error) {
      console.error('An error occurred while scraping the web page:', error);
      return { links: [], text: null };
    }
  }

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
   * @returns {Promise<{ text: string | null, links: string[] }>} The scraped data and summarized text.
   */
  async run(url, question) {
    const { links, text } = await this.scrapeWebPage(url);

    if (text) {
      const summary = await this.summarizeText(text, question);

      return { text: summary, links };
    } else {
      return { text: null, links };
    }
  }
}

export default WebPageScraper;
