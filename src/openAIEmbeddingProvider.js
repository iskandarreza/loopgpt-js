// @ts-nocheck
// Credits to Fariz Rahman for https://github.com/farizrahman4u/loopgpt
/* The OpenAIEmbeddingProvider class is a JavaScript class that provides a way to generate embeddings
for text using the OpenAI API. */
class OpenAIEmbeddingProvider {
  /**
   * This is a constructor function that takes an API key and a model as parameters.
   * @param {string} apiKey - The apiKey parameter is a string that represents the API key required to access
   * the OpenAI API. This key is used to authenticate and authorize the user to access the API
   * services.
   * @param {string} [model=text-embedding-ada-002] - The model parameter is a string that specifies the name of
   * the language model to be used for text analysis. In this case, the default model is
   * 'text-embedding-ada-002'.
   */
  constructor(apiKey, model = 'text-embedding-ada-002') {
    this.model = model
    this.apiKey = apiKey
  }

  /**
   * This is an asynchronous function that retrieves embeddings for a given text using the OpenAI API.
   * @param text - The input text for which embeddings are to be generated.
   * @returns A Float32Array containing the embeddings of the input text.
   */
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

  /**
   * The function returns an object with the model and apiKey properties.
   * @returns The `config()` function is returning an object with two properties: `model` and `apiKey`.
   * The values of these properties are being taken from the `model` and `apiKey` properties of the
   * object that the function is a method of.
   */
  config() {
    return { model: this.model, apiKey: this.apiKey }
  }

  /**
   * This function returns a new instance of the OpenAIEmbeddingProvider class using the model and
   * apiKey specified in the config parameter.
   * @param config - The `config` parameter is an object that contains the configuration information
   * needed to create a new `OpenAIEmbeddingProvider` instance. It has two properties:
   * @returns A new instance of the `OpenAIEmbeddingProvider` class with the `model` and `apiKey`
   * properties set to the values provided in the `config` object.
   */
  static fromConfig(config) {
    return new OpenAIEmbeddingProvider(config.model, config.apiKey)
  }
}

module.exports = {
  OpenAIEmbeddingProvider,
}
