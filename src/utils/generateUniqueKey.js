const { v4: uuidv4 } = require('uuid')

/**
 * The function generates a unique key using the uuidv4 library.
 * @returns {string} a unique key generated using the uuidv4 function.
 */
function generateUniqueKey() {
  return uuidv4()
}

module.exports = generateUniqueKey
