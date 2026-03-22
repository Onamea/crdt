const isUint8Array = (value: unknown): value is Uint8Array => {
  return value instanceof Uint8Array
}
export default isUint8Array

export const isUint8ArrayOfLength = (value: unknown, length: number): value is Uint8Array => {
  return isUint8Array(value) && value.length === length
}