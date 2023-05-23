/**
 * The function checks if a string of brackets is balanced, meaning each opening bracket has a
 * corresponding closing bracket in the correct order.
 * @param {string} str - The input string that needs to be checked for balanced parentheses, brackets, and curly
 * braces.
 * @returns {boolean} a boolean value. It returns `true` if the input string `str` has balanced parentheses,
 * square brackets, and curly braces, and `false` otherwise.
 */
function isBalanced(str) {
  const map = {
    '(': ')',
    '[': ']',
    '{': '}',
  }
  const closing = Object.values(map)
  const stack = []

  for (let char of str) {
    // @ts-ignore
    if (map[char]) {
      stack.push(char)
      // @ts-ignore
    } else if (closing.includes(char) && char !== map[stack.pop()]) {
      return false
    }
  }
  return !stack.length
}

module.exports = isBalanced
