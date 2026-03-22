export default (path: string, char: string, escapeChar = "\\"): number => {
  for (let i = path.length - 1; i >= 0; i--) {
    if (path[i] === char) {
      let escapeCharCount = 0
      let j = i - 1
      while (j >= 0 && path[j] === escapeChar) {
        escapeCharCount++
        j--
      }
      // If even number of escapeChar, char is not escaped
      if (escapeCharCount % 2 === 0) {
        return i
      }
    }
  }
  return -1
}