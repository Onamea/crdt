import { runInSandbox } from "./sandbox.js"
import { Validator, type Schema } from "@cfworker/json-schema"
import type { Identity } from "../Identity.js"
import type { ValidateOperation } from "../Operation.js"
import { stripTypes } from "./stripTypes.js"

type JavaScriptCode = string
type JSONSchema = string
type Code = string

const languages = [
  { canonical: "JSON", aliases: [] },
  { canonical: "JavaScript", aliases: ["js"] },
  { canonical: "TypeScript", aliases: ["ts"] }
] as const
type Language = (typeof languages)[number]["canonical"]

const findLanguage = (language: string): Language | undefined => {
  const lowerCased = language.toLowerCase()
  return languages
    .find(language => 
      ([language.canonical, ...language.aliases].map(n => n.toLowerCase()) as string[]).includes(lowerCased)
    )?.canonical
}

const parseLanguage = (language: string | undefined, code: Code): Language | string => {
  if (language === undefined) {
    try {
      JSON.parse(code)
      return "JSON"
    } catch {
      return "JavaScript"
    }
  }
  return findLanguage(language) ?? language
}

const markdownCodeRegex =
  /^[^\S\r\n]*(?<fence>`{3,}|~{3,})[^\S\r\n]*(?<language>\S+)?[^\S\r\n]*\r?\n(?<code>[\s\S]*?)\r?\n[^\S\r\n]*\k<fence>[^\S\r\n]*$/i

const unwrapMarkdown = (codeBlock: Code): { code: Code, language: Language | string } => {
  const match = codeBlock.match(markdownCodeRegex)
  const code = match?.groups?.code ?? codeBlock
  const language = parseLanguage(match?.groups?.language, code)
  return { code, language }
}

const evaluateJavaScript = (code: JavaScriptCode, body: string): Promise<boolean> => {
  return runInSandbox(code, body)
}

const validateJsonSchema = (schema: JSONSchema, body: string): boolean => {
  let parsedSchema: Schema
  try {
    parsedSchema = JSON.parse(schema)
  } catch {
    throw new Error("Invalid JSON schema")
  }
  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(body)
  } catch {
    parsedBody = body
  }
  return new Validator(parsedSchema).validate(parsedBody).valid
}

export const validate = async (body: Exclude<Identity["body"], undefined>, logic: ValidateOperation["logic"]): Promise<boolean> => {
  const { code, language } = unwrapMarkdown(logic)
  switch (language) {
    case "JSON":
      return validateJsonSchema(code, body)
    case "JavaScript":
      return await evaluateJavaScript(code, body)
    case "TypeScript":
      return await evaluateJavaScript(await stripTypes(code), body)
    default:
      throw new Error(`Unsupported validation language: ${ language }`)
  }
}
