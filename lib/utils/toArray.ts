import isArray from "./isArray.ts"

export default <T>(value: T | T[]): T[] => {
  return isArray(value) ? value : [value]
}