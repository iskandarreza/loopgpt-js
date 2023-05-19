const { BaseEmbeddingProvider } = require('../embeddings/provider.js')

class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  /**
   * OpenAI Embedding Provider
   * @param {string} openaiApiKey
   */
  constructor(openaiApiKey) {
    super()
    this.model = 'text-embedding-ada-002'
    this.apiKey = openaiApiKey
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
      Authorization: `Bearer ${this.apiKey}`,
    }
    const body = JSON.stringify({
      input: text,
      model: this.model,
    })

    const response = await fetch(url, { method: 'POST', headers, body })

    if (!response.ok) {
      throw new Error(
        `Failed to get embeddings: ${response.status} ${response.statusText}`
      )
    }

    const data = await response.json()
    console.log({ response, data })

    return data
    // return data.data[0].embedding.map((value) => parseFloat(value))
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
