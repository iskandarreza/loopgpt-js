// Credits to Fariz Rahman for https://github.com/farizrahman4u/loopgpt
class OpenAIEmbeddingProvider {
  constructor(model = 'text-embedding-ada-002', apiKey = null) {
    this.model = model
    this.apiKey = apiKey
  }

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
    return new Float32Array(data.data[0].embedding)
  }

  config() {
    return { model: this.model, apiKey: this.apiKey }
  }

  static fromConfig(config) {
    return new OpenAIEmbeddingProvider(config.model, config.apiKey)
  }
}


module.exports = {
  OpenAIEmbeddingProvider
}