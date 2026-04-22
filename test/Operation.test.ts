import { assert, assertFalse } from "@std/assert"
import identity from "./identity.mock.json" with { type: "json" }
import { type Operation, isOperation, isOwnable, validateOperation } from "../Operation.ts"

Deno.test("isOperation", () => {
  assertFalse(isOperation({}))
  assert(isOperation(identity.operations[0]))
  assert(isOperation(identity.operations[1]))
})

Deno.test("isOwnable", () => {
  assert(isOwnable(identity.operations[0] as Operation))
})

Deno.test("validateOperation", async () => {
  // deno-lint-ignore no-explicit-any
  assertFalse(await validateOperation({} as any))
  assert(await validateOperation(identity.operations[0] as Operation))
  assert(await validateOperation(identity.operations[1] as Operation))
})
