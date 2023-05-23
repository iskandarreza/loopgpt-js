class BaseEmbeddingProvider {
  /**
   * Base class for all embedding providers.
   * @param {string|undefined} [identifier]
   */
  constructor(identifier) {
    this.identifier = identifier || this.constructor.name
  }

  /**
   * Retrieves the embedding for the given text.
   * @param {string} text - Text to retrieve embedding for
   * @returns {Array<number>} - Embedding array
   */
  get(text) {
    throw new Error('Method not implemented')
  }

  /**
   * Alias for the `get` method.
   * @param {string} text - Text to retrieve embedding for
   * @returns {Array<number>} - Embedding array
   */
  __call__(text) {
    return this.get(text)
  }

  /**
   * Returns the configuration of the embedding provider as an object.
   * @returns {Object} - Configuration object
   */
  config() {
    return {
      class: this.identifier,
      type: 'embedding_provider',
    }
  }

  /**
   * Creates an instance of the embedding provider from a configuration object.
   * @param {Object} config - Configuration object
   * @returns {BaseEmbeddingProvider} - Embedding provider instance
   */
  static fromConfig(config) {
    return new this()
  }
}

module.exports = {
  BaseEmbeddingProvider,
}
