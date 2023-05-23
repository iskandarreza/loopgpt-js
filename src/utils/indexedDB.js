/**
 * @param {string} [storeName]
 */
export async function openDatabase(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('loopgpt_js_data')

    request.onupgradeneeded = (ev) => {
      // @ts-ignore
      const db = ev.target ? ev.target.result : null
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName)
      }
    }

    request.onsuccess = (ev) => {
      // @ts-ignore
      const db = ev.target ? ev.target.result : null
      if (db) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.close()
          const version = db.version + 1
          const upgradeRequest = indexedDB.open('loopgpt_js_data', version)
          upgradeRequest.onupgradeneeded = (upgradeEv) => {
            // @ts-ignore
            const upgradedDb = upgradeEv.target ? upgradeEv.target.result : null
            if (!upgradedDb.objectStoreNames.contains(storeName)) {
              upgradedDb.createObjectStore(storeName)
            }
          }
          upgradeRequest.onsuccess = (upgradeEv) => {
            // @ts-ignore
            const upgradedDb = upgradeEv.target ? upgradeEv.target.result : null
            resolve(upgradedDb)
          }
          upgradeRequest.onerror = (upgradeEv) => {
            const error =
              // @ts-ignore
              upgradeEv.target.error ||
              new Error('An error occurred while opening the database.')
            reject(error)
          }
        } else {
          resolve(db)
        }
      } else {
        reject(new Error('Failed to open the database.'))
      }
    }

    request.onerror = (ev) => {
      // @ts-ignore
      const error = ev.target ? ev.target.error : null
      reject(
        error || new Error('An error occurred while opening the database.')
      )
    }
  })
}

/**
 * Saves the text for later summarization using IndexedDB.
 * @param {string} storeName The name of the object store.
 * @param {object} context The context associated with the text.
 * @param {string} text The text to be saved.
 * @returns {Promise<string>} The key under which the text is saved.
 */

export async function saveTextToIndexedDB(storeName, context, text) {
  // Generate a unique key for the text
  const generateUniqueKey = require('../utils/generateUniqueKey.js')
  const key = generateUniqueKey()

  // Create a new IndexedDB database or open an existing one
  const db = await openDatabase(storeName)

  // Create a transaction and access the object store
  const transaction = db.transaction(storeName, 'readwrite')
  const objectStore = transaction.objectStore(storeName)

  // Save the context and text using the generated key
  const data = { context, text }
  objectStore.put(data, key)

  // Wait for the transaction to complete
  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve
    transaction.onerror = reject
  })

  // Close the database connection
  db.close()

  return key
}

/**
 * Retrieves the saved text from IndexedDB using the key.
 * @param {string} storeName The name of the object store.
 * @param {string} key The key under which the text is saved.
 * @returns {Promise<{ context: object, text: string }>} The saved context and text.
 */
export async function retrieveText(storeName, key) {
  const db = await openDatabase(storeName)

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const objectStore = transaction.objectStore(storeName)
    const request = objectStore.get(key)

    request.onsuccess = (
      /** @type {{ target: { result: any } }} */ event
    ) => {
      // @ts-ignore
      const data = event.target ? event.target.result : null
      if (data) {
        resolve(data)
      } else {
        reject(new Error('Text not found'))
      }
    }

    request.onerror = (/** @type {{ target: { error: any } }} */ event) => {
      // @ts-ignore
      const error = event.target ? event.target.error : null
      reject(
        error ||
        new Error(
          'An error occurred while retrieving the text from the database.'
        )
      )
    }
  })
}

/**
 * Retrieves the saved text from IndexedDB using the key.
 * @param {string} storeName The name of the object store.
 * @returns {Promise<Array<{ key: string, context: object }>>} The list of keys and corresponding context.
 */
export async function retrieveKeysAndContext(storeName) {
  const db = await openDatabase(storeName)

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const objectStore = transaction.objectStore(storeName)
    const request = objectStore.openCursor()

    /**
     * @type {PromiseLike<Array<{ key: string, context: object }>> | Array<{ key: string, context: object }>}
     */
    const keysAndContext = []

    request.onsuccess = (
      /** @type {{ target: { result: any } }} */ event
    ) => {
      const cursor = event.target.result
      if (cursor) {
        const key = cursor.key
        const context = cursor.value.context
        keysAndContext.push({ key, context })
        cursor.continue()
      } else {
        resolve(keysAndContext)
      }
    }

    request.onerror = (/** @type {{ target: { error: Error } }} */ event) => {
      const error =
        event.target.error ||
        new Error(
          'An error occurred while retrieving the data from the database.'
        )
      reject(error)
    }
  })
}
