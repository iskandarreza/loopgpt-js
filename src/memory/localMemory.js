const { BaseMemory } = require('./baseMemoryClass.js')

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
    this.embedding_provider = embeddingProvider
  }

  /**
   * Adds a document to memory along with its key (or uses the document as the key)
   * Retrieves the embedding using the embeddingProvider
   * Stores the embedding in the embs ndarray and the document in the docs array
   * @param {string} doc - Document to add
   * @param {string|null} [key] - Key for the document (optional)
   */
  async add(doc, key = null) {
    if (!key) {
      key = doc
    }
    // @ts-ignore
    const emb = await this.embedding_provider.get(key)

    if (emb.data[0].embedding) {
      const embedding = emb.data[0].embedding
      if (this.embs === null) {
        this.embs = [embedding]
      } else {
        this.embs.push(embedding)
      }

      this.docs.push(doc)
    } else {
      throw Error('Error getting embedding from provider')
    }
  }

  /**
   * This function takes a query and a value k, retrieves embeddings for the query, calculates scores
   * for stored embeddings, and returns the top k documents based on the scores.
   * @param {string} query - The query parameter is the input query for which the function will retrieve the top
   * k most similar documents.
   * @param {number} k - `k` is a positive integer representing the number of top results to return. The
   * function will return the `k` documents with the highest scores based on their dot product with the
   * provided query embedding.
   * @returns {Promise<string[]|[]>} The function `get` returns an array of documents that are most similar to the input
   * query, based on their embeddings. The number of documents returned is determined by the value of
   * the `k` parameter. If there are no embeddings stored or they are not in the expected format, an
   * empty array is returned. If there is an error getting the embedding from the provider, an error is
   * thrown.
   */
  async get(query, k) {
    if (this.embs === null || !Array.isArray(this.embs)) {
      return []
    }

    // @ts-ignore
    const emb = await this.embedding_provider.get(query)

    if (emb.data[0].embedding && Array.isArray(emb.data[0].embedding)) {
      const scores = this.embs.map((storedEmb) => {
        if (Array.isArray(storedEmb) && storedEmb.length === 1536) {
          return dotProduct(storedEmb, emb.data[0].embedding)
        } else {
          return 0 // or any default value if the storedEmb is invalid
        }
      })

      const sortedIdxs = scores
        .map((score, idx) => [score, idx])
        .sort((a, b) => b[0] - a[0])

      const uniqueIdxs = new Set()
      const topKIdxs = []
      for (const [score, idx] of sortedIdxs) {
        if (uniqueIdxs.size >= k) {
          break
        }
        if (!uniqueIdxs.has(idx)) {
          uniqueIdxs.add(idx)
          topKIdxs.push(idx)
        }
      }

      const results = topKIdxs.map((idx) => this.docs[idx])
      return results
    } else {
      throw Error('Error getting embedding from provider')
    }
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
