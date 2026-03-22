import { assert, assertFalse } from "@std/assert"
import identity from "./identity.mock.json" with { type: "json" }
import { isOperation, isOwnable, type Operation } from "../Operation.ts"

Deno.test("isOperation", () => {
  assertFalse(isOperation({}))
  assert(isOperation(identity.operations[0]))
  assert(isOperation(identity.operations[1]))
})

Deno.test("isOwnable", () => {
  assert(isOwnable(identity.operations[0] as Operation))
})
