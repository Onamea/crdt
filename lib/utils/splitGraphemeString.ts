export default (str: string): string[] => {
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" })
  return Array.from(segmenter.segment(str), segment => segment.segment)
}