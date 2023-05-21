/**
 * @param {string} [storeName]
 */
function openDatabase(storeName) {
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

module.exports = openDatabase
