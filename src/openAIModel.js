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
  #apiKey = 'API_KEY_NOT_SET';

  getApiKey() {
    return this.#apiKey;
  }

  /**
   * @param {string} value
   */
  setApiKey(value) {
    this.#apiKey = value;
  }
  
  /**
   * This is a constructor function that initializes an OpenAI chatbot with a specified model and API
   * key.
   * @param {string} [model=gpt-3.5-turbo] - The model parameter is a string that specifies the OpenAI language
   * model to use for generating responses. In this case, the default value is 'gpt-3.5-turbo', but it
   * can be changed to any other supported model.
   * @param {string|null} [apiKey=null] - The API key is a unique identifier that allows access to a specific OpenAI
   * API. It is required to make API requests and authenticate the user.
   * @param {string} [apiUrl] - The `apiUrl` parameter is a string that represents the URL of the OpenAI API
   * endpoint that will be used to make requests for chat completions. If this parameter is not
   * provided, the default URL `https://api.openai.com/v1/chat/completions` will be used.
   */
  constructor(model = 'gpt-3.5-turbo', apiKey = null, apiUrl) {
    this.model = model
    /**
     * @type {string}
     */
    this.apiUrl = apiUrl || 'https://api.openai.com/v1/chat/completions'
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
    // Can't get tiktoken to load with a web worker...
    // const [tokens_per_message, tokens_per_name] = {
    //   'gpt-3.5-turbo': [4, -1],
    //   'gpt-4': [3, -1],
    //   'gpt-4-32k': [3, -1],
    // }[this.model];
    // const enc = encoding_for_model(this.model);
    // let num_tokens = 0;
    // for (const message of messages) {
    //   num_tokens += tokens_per_message;
    //   for (const [key, value] of Object.entries(message)) {
    //     num_tokens += enc.encode(value).length;
    //     if (key === "name") {
    //       num_tokens += tokens_per_name;
    //     }
    //   }
    // }
    // num_tokens += 3;
    // return num_tokens;

    // oversimplied implementation
    const modelTokens = {
      'gpt-3.5-turbo': 4,
      'gpt-4': 3,
      'gpt-4-32k': 3,
    }[this.model]

    let numTokens = 0
    for (const message of messages) {
      // @ts-ignore
      numTokens += modelTokens
      for (const value of Object.values(message)) {
        numTokens += value.split(/\s+/).length
      }
      numTokens += 3 // Add tokens for start and end sequences
    }

    return numTokens
  }

  /**
   * The function returns the token limit for a specific language model.
   * @returns {number} The function `getTokenLimit()` returns the token limit for a specific language model
   * based on the value of `this.model`. The token limit is returned as an integer value.
   */
  getTokenLimit() {
    return {
      'gpt-3.5-turbo': 4000,
      'gpt-4': 8000,
      'gpt-4-32k': 32000,
    }[this.model] || 0
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
   * This function returns a new OpenAIModel object using the model and apiKey specified in the config
   * parameter.
   * @param {{ model: string | undefined; apiKey: string | undefined; }} config - The `config` parameter is an object that contains the configuration information
  needed to create a new `OpenAIModel` instance. It has two properties:
   * @returns A new instance of the `OpenAIModel` class with the `model` and `apiKey` properties set to
  the values provided in the `config` object.
   */
  static fromConfig(config) {
    return new OpenAIModel(config.model, config.apiKey)
  }
}

module.exports = {
  OpenAIModel
}