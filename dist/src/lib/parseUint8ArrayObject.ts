export const parseUint8ArrayObject = (obj: { [key: string]: number }): Uint8Array => {
  return new Uint8Array(Object.values(obj))
}