const { BaseEmbeddingProvider } = require('../embeddings/provider.js')

const userProviders = {}

/**
 * Registers a custom embedding provider type.
 */
// function registerEmbeddingProviderType(provider) {
//   if (provider.prototype instanceof BaseEmbeddingProvider) {
//     provider = provider.name
//   }
//   if (typeof provider !== 'function') {
//     throw new TypeError(`${provider} is not a class`)
//   }
//   userProviders[provider.name] = provider
// }

/**
 * Creates an instance of the embedding provider from a configuration object.
 * @param {Object} config - Configuration object
 * @returns {BaseEmbeddingProvider} - Embedding provider instance
 */
// function fromConfig(config) {
//   const className = config.class
//   const ProviderClass = userProviders[className] || global[className]
//   return ProviderClass.fromConfig(config)
// }

module.exports = {
  BaseEmbeddingProvider,
  // registerEmbeddingProviderType,
  // fromConfig,
}
