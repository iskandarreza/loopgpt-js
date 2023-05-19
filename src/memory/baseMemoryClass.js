// loopgpt/memory/baseMemory.js
class BaseMemory {
  /**
   * Adds a document to the memory
   * @param {string} doc
   */
  add(doc, key = null) {
    throw new Error('Method add() must be implemented in a subclass.')
  }

  /**
   * Retrieves k documents from memory based on a query
   * @param {string} query - Query for document retrieval
   * @param {number} k - Number of documents to retrieve
   * @returns {Array<string>} - Array of retrieved documents
   */
  get(query, k) {
    throw new Error('Method get() must be implemented in a subclass.')
  }

  /**
   * Returns the configuration of the BaseMemory instance as an object
   * @returns {Object} - Configuration object
   */
  config() {
    return {
      class: this.constructor.name,
      type: 'memory',
    }
  }

  /**
   * Creates a BaseMemory instance from a configuration object
   * @param {Object} config - Configuration object
   * @returns {BaseMemory} - BaseMemory instance
   */
  static fromConfig(config) {
    throw new Error('Method fromConfig() must be implemented in a subclass.')
  }

  /**
   * Clears the memory
   */
  clear() {
    throw new Error('Method clear() must be implemented in a subclass.')
  }
}

module.exports = {
  BaseMemory,
}
