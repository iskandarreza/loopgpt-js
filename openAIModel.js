// Credits to Fariz Rahman for https://github.com/farizrahman4u/loopgpt
class OpenAIModel {
  constructor(model = 'gpt-3.5-turbo', apiKey = null, apiUrl = null) {
    this.model = model
    this.apiKey = apiKey
    this.apiUrl = apiUrl
  }

  async chat(messages, maxTokens = null, temperature = 0.8) {
    const { max_tokens } = maxTokens
    this.max_tokens = maxTokens
    this.temperature = temperature

    const num_retries = 3

    for (let i = 0; i < num_retries; i++) {
      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
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
      numTokens += modelTokens
      for (const value of Object.values(message)) {
        numTokens += value.split(/\s+/).length
      }
      numTokens += 3 // Add tokens for start and end sequences
    }

    return numTokens
  }

  getTokenLimit() {
    return {
      'gpt-3.5-turbo': 4000,
      'gpt-4': 8000,
      'gpt-4-32k': 32000,
    }[this.model]
  }

  config() {
    return {
      model: this.model,
      apiKey: this.apiKey,
    }
  }

  static fromConfig(config) {
    return new OpenAIModel(config.model, config.apiKey)
  }
}

module.exports = {
  OpenAIModel
}