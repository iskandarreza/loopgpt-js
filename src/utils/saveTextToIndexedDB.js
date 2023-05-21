const openDatabase = require('./openDatabase.js')

/**
 * Saves the text for later summarization using IndexedDB.
 * @param {string} storeName The name of the object store.
 * @param {object} context The context associated with the text.
 * @param {string} text The text to be saved.
 * @returns {Promise<string>} The key under which the text is saved.
 */

async function saveTextToIndexedDB(storeName, context, text) {
  // Generate a unique key for the text
  const generateUniqueKey = require('./generateUniqueKey.js')
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
module.exports = saveTextToIndexedDB
