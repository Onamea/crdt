import { assert, assertFalse, assertRejects } from "@std/assert"
import { validate } from "../../lib/validate.ts"

Deno.test("validate function", async () => {
  assert(await validate("body", "function validate(body) { return body !== undefined }"))
})

Deno.test("validate non function", async () => {
  await assertRejects(() => validate("body", "const notAFunction = 42"))
})

Deno.test("arrow function", async () => {
  assert(await validate("body", "(body) => body !== undefined"))
})

Deno.test("markdown wrapped", async () => {
  assert(await validate("body", "```\n(body) => body !== undefined\n```"))
})

Deno.test("markdown wrapped JSON", async () => {
  assert(await validate("body", '```\n{ "type": "string", "minLength": 1 }\n```'))
})

Deno.test("markdown wrapped with language specifier", async () => {
  assert(await validate("body", "```Javascript\n(body) => body !== undefined\n```"))
})

Deno.test("non JavaScript code", async () => {
  await assertRejects(() => validate("body", "```python\nlambda body: body is not None\n```"))
})

Deno.test("JSON schema valid", async () => {
  assert(await validate("body", '```json\n{ "type": "string", "minLength": 1 }\n```'))
})

Deno.test("JSON schema invalid", async () => {
  assertFalse(await validate("body", '```json\n{ "type": "number" }\n```'))
})

Deno.test("JSON schema with JSON body", async () => {
  const logic = '```json\n{ "type": "object", "properties": { "name": { "type": "string" } }, "required": ["name"] }\n```'
  assert(await validate('{"name": "Alice"}', logic))
})

Deno.test("JSON schema with invalid JSON body", async () => {
  const logic = '```json\n{ "type": "object", "properties": { "name": { "type": "string" } }, "required": ["name"] }\n```'
  assertFalse(await validate("not json", logic))
})

Deno.test("schema with unknown keywords validates anything", async () => {
  assert(await validate("body", '```json\n{ "field": 23, "g": "S" }\n```'))
})

/*
Deno.test("typescript code block", async () => {
  assert(await validate("body", "```typescript\n(body: string): boolean => body !== undefined\n```"))
})

Deno.test("typescript code block false", async () => {
  assertFalse(await validate("body", "```typescript\n(body: string): boolean => body === undefined\n```"))
})
*/
