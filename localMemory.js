// Credits to Fariz Rahman for https://github.com/farizrahman4u/loopgpt
export class LocalMemory {
  constructor(embeddingProvider) {
    this.docs = []
    this.embs = null
    this.embeddingProvider = embeddingProvider
  }

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

  clear() {
    this.docs = []
    this.embs = null
  }
}