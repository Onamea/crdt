type NonEmptyString = string

const isString = (value: unknown): value is string => {
  return typeof value === "string"
}

export const isNonEmptyString = (value: unknown, shouldTrim = false): value is NonEmptyString => {
  if (isString(value) === false) return false
  const s = shouldTrim ? value.trim() : value
  return s.length > 0
}

export default isString
