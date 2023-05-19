// loopgpt/memory/localMemory.js
const { BaseMemory } = require('./baseMemoryClass.js')
// const {
//   fromConfig: embeddingProviderFromConfig,
// } = require('../embeddings/embeddings.js')

class LocalMemory extends BaseMemory {
  /**
   * @param {Function} embeddingProvider - Function to retrieve embeddings
   */
  constructor(embeddingProvider) {
    super()
    /**
     * @type {any[]}
     */
    this.docs = []
    this.embs = null
    this.embeddingProvider = embeddingProvider
  }

  /**
   * Adds a document to memory along with its key (or uses the document as the key)
   * Retrieves the embedding using the embeddingProvider
   * Stores the embedding in the embs ndarray and the document in the docs array
   * @param {string} doc - Document to add
   * @param {string|null} [key] - Key for the document (optional)
   */
  add(doc, key = null) {
    if (!key) {
      key = doc
    }
    const emb = this.embeddingProvider(key)
    if (this.embs === null) {
      this.embs = [emb]
    } else {
      this.embs.push(emb)
    }
    this.docs.push(doc)
  }

  /**
   * Retrieves k documents from memory based on the similarity to the query
   * Retrieves the embedding using the embeddingProvider
   * Computes the similarity scores between the query embedding and stored embeddings
   * Returns the top k documents based on the similarity scores
   * @param {string} query - Query for document retrieval
   * @param {number} k - Number of documents to retrieve
   * @returns {Array<string>} - Array of retrieved documents
   */
  get(query, k) {
    if (this.embs === null) {
      return []
    }
    const emb = this.embeddingProvider(query)
    const scores = this.embs.map((storedEmb) => dotProduct(storedEmb, emb))
    const sortedIdxs = scores
      .map((score, idx) => [score, idx])
      .sort((a, b) => b[0] - a[0])
    const topKIdxs = sortedIdxs.slice(0, k).map((item) => item[1])
    return topKIdxs.map((idx) => this.docs[idx])
  }

  /**
   * Serializes the embs array to an object representation
   * @returns {Object|null} - Serialized embs array or null if embs is empty
   */
  _serializeEmbs() {
    if (this.embs === null || this.embs.length === 0) {
      return null
    }
    const embSize = this.embs[0].length
    const data = this.embs.flat()
    return {
      dtype: 'float32',
      data: Array.from(data),
      shape: [this.embs.length, embSize],
    }
  }

  /**
   * Returns the configuration of the LocalMemory instance as an object
   * @returns {Object} - Configuration object
   */
  // config() {
  //   const cfg = super.config();
  //   cfg.docs = this.docs;
  //   cfg.embs = this._serializeEmbs();
  //   cfg.embeddingProvider = this.embeddingProvider.config();
  //   return cfg;
  // }

  /**
   * Creates a LocalMemory instance from a configuration object
   * @param {Object} config - Configuration object
   * @returns {LocalMemory} - LocalMemory instance
   */
  // static fromConfig(config) {
  //   const provider = embeddingProviderFromConfig(config.embeddingProvider);
  //   const obj = new LocalMemory(provider);
  //   obj.docs = config.docs;
  //   const embs = config.embs;
  //   if (embs !== null) {
  //     const embSize = embs.shape[1];
  //     obj.embs = new Array(embs.shape[0]);
  //     for (let i = 0; i < embs.shape[0]; i++) {
  //       obj.embs[i] = embs.data.slice(i * embSize, (i + 1) * embSize);
  //     }
  //   }
  //   return obj;
  // }

  /**
   * Clears the memory
   */
  clear() {
    this.docs = []
    this.embs = null
  }
}

/**
 * Computes the dot product between two arrays
 * @param {Array<number>} arr1 - First array
 * @param {Array<number>} arr2 - Second array
 * @returns {number} - Dot product
 */
function dotProduct(arr1, arr2) {
  return arr1.reduce((acc, val, i) => acc + val * arr2[i], 0)
}

module.exports = {
  LocalMemory,
}
