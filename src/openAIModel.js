// Credits to Fariz Rahman for https://github.com/farizrahman4u/loopgpt
/* The OpenAIModel class is a JavaScript class that represents a language model object and provides
methods for generating responses to messages and counting tokens. */

/**
 * @typedef {Object} maxTokens
 * @property {number} [max_tokens]
 * @property {number} [temperature]
 */

/* The OpenAIModel class is a JavaScript class that represents a language model object with properties
such as model name, API key, and API URL, and methods for generating AI-generated responses and
counting tokens. */
class OpenAIModel {
  /**
   * @param {string} value
   */
  #apiKey = 'API_KEY_NOT_SET'

  getApiKey() {
    return this.#apiKey
  }

  /**
   * @param {string} value
   */
  setApiKey(value) {
    this.#apiKey = value
  }

  /**
   * This is a constructor function that initializes an OpenAI chatbot with a specified model and API
   * key.
   * @param {string} [model=gpt-3.5-turbo] - The model parameter is a string that specifies the OpenAI language
   * model to use for generating responses. In this case, the default value is 'gpt-3.5-turbo', but it
   * can be changed to any other supported model.
   * @param {string} apiKey - The API key is a unique identifier that allows access to a specific OpenAI
   * API. It is required to make API requests and authenticate the user.
   */
  /**
   * This is a constructor function that initializes an OpenAI chatbot with a specified API key and
   * model.
   * @param {string} apiKey - The API key is a unique identifier that allows access to OpenAI's API services. It
   * is required to make requests to the OpenAI API.
   * @param {string} [model=gpt-3.5-turbo] - The model parameter is a string that specifies the OpenAI language
   * model to use for generating text. In this case, the default model is 'gpt-3.5-turbo'.
   */
  constructor(apiKey, model = 'gpt-3.5-turbo') {
    this.model = model
    /**
     * @type {string}
     */
    this.apiUrl = 'https://api.openai.com/v1/chat/completions'
    if (apiKey !== null) {
      this.setApiKey(apiKey)
    } else {
      // handle api not set
      throw Error('API key not set!')
    }
  }

  /**
   * This is an async function that sends a POST request to an API endpoint with specified parameters
   * and returns the response data.
   * @param {any} messages - An array of strings representing the conversation history or prompt for the
  chatbot to generate a response to.
   * @param {maxTokens} [maxTokens] - The maximum number of tokens (words) that the API should generate in
  response to the given messages. If not provided, the API will use its default value.
   * @param {number} [temperature] - The temperature parameter controls the "creativity" of the AI-generated
  responses. A higher temperature value will result in more diverse and unpredictable responses,
  while a lower temperature value will result in more conservative and predictable responses. The
  default value is 0.8.
   * @returns the result of the API call made using the provided parameters (messages, maxTokens, and
  temperature) after handling any errors that may occur during the API call.
   */
  async chat(messages, maxTokens = undefined, temperature = 0.8) {
    // @ts-ignore
    const { max_tokens } = maxTokens
    /**
     * @type {maxTokens | undefined}
     */
    this.max_tokens = maxTokens
    this.temperature = temperature

    const num_retries = 3

    for (let i = 0; i < num_retries; i++) {
      try {
        // @ts-ignore
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.getApiKey()}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            max_tokens,
            temperature,
          }),
        })

        const data = await response.json()

        return data
      } catch (error) {
        // @ts-ignore
        if (error.statusCode === 429) {
          console.warn('Rate limit exceeded. Retrying after 20 seconds.')
          await new Promise((resolve) => setTimeout(resolve, 20000))
          if (i == num_retries - 1) {
            throw error
          }
        } else {
          throw error
        }
      }
    }
  }

  /**
   * The function counts the number of tokens in a set of messages based on the selected language
   * model.
   * @param {any} messages - An array of objects representing messages, where each object has properties such
  as "name" and "text".
   * @returns the total number of tokens in the messages array, based on the model being used.
   */
  countTokens(messages) {
    const modelTokens =
      {
        'gpt-3.5-turbo': 4,
        'gpt-4': 3,
        'gpt-4-32k': 3,
      }[this.model] ?? 0 // Use 0 as the default value if modelTokens is null or undefined

    let numTokens = 0
    for (const message of messages) {
      if (message) {
        numTokens += modelTokens ?? 0 // Use 0 as the default value if modelTokens is null or undefined
        for (const value of Object.values(message)) {
          if (value) {
            numTokens += value.split(/\s+/).length
          }
        }
        numTokens += 3 // Add tokens for start and end sequences
      }
    }

    return numTokens
  }

  /**
   * The function returns the token limit for a specific language model.
   * @returns {number} The function `getTokenLimit()` returns the token limit for a specific language model
   * based on the value of `this.model`. The token limit is returned as an integer value.
   */
  getTokenLimit() {
    return (
      {
        'gpt-3.5-turbo': 4000,
        'gpt-4': 8000,
        'gpt-4-32k': 32000,
      }[this.model] || 0
    )
  }

  /**
   * The function returns an object with the model and apiKey properties.
   * @returns An object with two properties: "model" and "apiKey", both of which are being accessed
   * from the current object using "this".
   */
  config() {
    return {
      model: this.model,
      apiKey: this.#apiKey,
    }
  }

  /**
   * This function returns a new OpenAIModel object using the apiKey and model specified in the config
   * parameter.
   * @param {{apiKey: string; model: string;}} config - The `config` parameter is an object that contains the necessary information to
   * create a new `OpenAIModel` instance. It should have the following properties:
   * @returns The `fromConfig` method is returning a new instance of the `OpenAIModel` class with the
   * `apiKey` and `model` properties set based on the `config` object passed as an argument. However,
   * the code snippet is incomplete as there is a missing argument after `config.model`.
   */
  static fromConfig(config) {
    return new OpenAIModel(config.apiKey, config.model)
  }
}

module.exports = {
  OpenAIModel,
}
