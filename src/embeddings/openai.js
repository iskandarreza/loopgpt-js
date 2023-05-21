const { BaseEmbeddingProvider } = require('../embeddings/provider.js')

class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  static identifier = 'OpenAIEmbeddingProvider'

  #apiKey
  /**
   * OpenAI Embedding Provider
   * @param {string} openaiApiKey
   */
  constructor(openaiApiKey) {
    super(OpenAIEmbeddingProvider.identifier)
    this.model = 'text-embedding-ada-002'
    this.#apiKey = openaiApiKey
  }

  /**
   * Retrieves the embedding for the given text using the OpenAI API.
   * @param {string} text - Text to retrieve embedding for
   */
  // @ts-ignore
  async get(text) {
    const url = 'https://api.openai.com/v1/embeddings'
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.#apiKey}`,
    }
    const body = JSON.stringify({
      input: text,
      model: this.model,
    })

    const response = await this.makeRateLimitedRequest(url, {
      method: 'POST',
      headers,
      body,
    })

    if (!response.ok) {
      throw new Error(
        `Failed to get embeddings: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()

    // if (data?.usage) {
    // console.info('embeddings', JSON.stringify(data?.usage, null, 4))
    // }

    return data
  }

  /**
   * @param {RequestInfo | URL} url
   * @param {RequestInit | undefined} options
   */
  async makeRateLimitedRequest(url, options) {
    const delayBetweenCalls = 4000 // Delay in milliseconds

    // Function to introduce a delay
    /**
     * @param {number | undefined} ms
     */
    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }

    // Make the API request with rate limiting
    async function makeRequest() {
      const response = await fetch(url, options)
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining')
      const rateLimitReset = response.headers.get('x-ratelimit-reset') || ''

      if (rateLimitRemaining === '0') {
        // Sleep until the rate limit reset time if the limit is reached
        const currentTime = Math.floor(Date.now() / 1000)
        const resetTime = parseInt(rateLimitReset)
        const sleepTime = (resetTime - currentTime) * 1000
        await sleep(sleepTime)
      }

      return response
    }

    return makeRequest()
  }

  /**
   * Returns the configuration of the OpenAI embedding provider as an object.
   * @returns {{model: string; apiKey: string}} - Configuration object
   */
  // config() {
  //   const cfg = super.config()
  //   cfg.model = this.model
  //   cfg.apiKey = this.apiKey
  //   return cfg
  // }

  /**
   * Creates an instance of the OpenAI embedding provider from a configuration object.
   * @param {Object} config - Configuration object
   * @returns {OpenAIEmbeddingProvider} - OpenAI embedding provider instance
   */
  // static fromConfig(config) {
  //   return new this(config.model, config.api_key)
  // }
}

module.exports = {
  OpenAIEmbeddingProvider,
}
