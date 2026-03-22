import isArray from "./isArray.ts"

export default (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && isArray(value) === false
}