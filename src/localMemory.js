// @ts-nocheck
// Credits to Fariz Rahman for https://github.com/farizrahman4u/loopgpt
/* The LocalMemory class is a JavaScript class that provides methods for adding documents to a list,
generating embeddings for them, and retrieving the most similar documents based on a query. */
class LocalMemory {
  /**
   * This is a constructor function that initializes an empty array for documents and a null value for
   * embeddings, and takes an embedding provider as a parameter.
   * @param embeddingProvider - The `embeddingProvider` parameter is a variable that holds a reference
   * to an object or function that provides word embeddings. Word embeddings are a way to represent
   * words as numerical vectors, which can be used in natural language processing tasks such as text
   * classification, language translation, and sentiment analysis. The `embeddingProvider
   */
  constructor(embeddingProvider) {
    this.docs = []
    this.embs = null
    this.embeddingProvider = embeddingProvider
  }

  /**
   * The function adds a document to a list and creates an embedding for it if necessary.
   * @param doc - The document to be added to the list of documents.
   * @param [key=null] - The key parameter is an optional argument that can be passed to the add()
   * function. If a key is provided, it will be used to generate an embedding for the document. If no
   * key is provided, the document itself will be used as the key.
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
   * The function takes a query and a number k, calculates the similarity scores between the query and
   * a set of embeddings, sorts the scores in descending order, and returns the top k documents based
   * on the highest scores.
   * @param query - The query is a vector representation of the search query that the user inputs. It
   * is used to find the most relevant documents from a collection of documents.
   * @param k - The number of top results to return.
   * @returns an array of documents that are most similar to the given query, based on their
   * embeddings. The number of documents returned is determined by the value of the parameter `k`.
   */
  get(query, k) {
    if (this.embs === null) {
      return []
    }
    const emb = this.embeddingProvider(query)
    const scores = this.embs.map((e) =>
      e.reduce((acc, val, i) => acc + val * emb[i], 0)
    )
    const idxs = scores
      .map((score, i) => [i, score])
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map((pair) => pair[0])
    return idxs.map((i) => this.docs[i])
  }

  /**
   * This function serializes an array of embeddings into an object with dtype, data, and shape
   * properties.
   * @returns The function `_serializeEmbs()` is returning an object with three properties: `dtype`,
   * `data`, and `shape`. The `dtype` property is a string representing the name of the constructor of
   * the first element in the `embs` array. The `data` property is an array of arrays, where each inner
   * array is a copy of the corresponding array in the `embs` array
   */
  _serializeEmbs() {
    if (this.embs === null) {
      return null
    }
    return {
      dtype: this.embs[0].constructor.name,
      data: this.embs.map((arr) => Array.from(arr)),
      shape: [this.embs.length, this.embs[0].length],
    }
  }

  /**
   * The function clears an array and sets a variable to null.
   */
  clear() {
    this.docs = []
    this.embs = null
  }
}

module.exports = {
  LocalMemory,
}
