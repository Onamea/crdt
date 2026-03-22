import splitGraphemeString from "./splitGraphemeString.ts"

type Char = string
type Chars = Char[]

export default (str: string, separator: Char, escapeChar: Char = "\\"): string[] => {
  const ret: string[] = []
  let current: Chars = []
  let previousChar: Char | undefined = undefined
  const chars: Chars = splitGraphemeString(str)
  chars.forEach(char => {
    if (char === separator && previousChar !== escapeChar) {
      if (current.length > 0) {
        ret.push(current.join(""))
        current = []
      }
    } else {
      current.push(char)
    }
    previousChar = char
  })

  if (current.length > 0) {
    ret.push(current.join(""))
  }

  return ret
}