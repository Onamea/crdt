export default (value: unknown): value is boolean => {
  return typeof value === "boolean"
}