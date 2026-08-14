import isArray from "./isArray.js"

export default <T>(value: T | T[]): T[] => {
  return isArray(value) ? value : [value]
}