import { assert } from "@std/assert"
import { isIdentifier } from "../Identifier.ts"

Deno.test("isIdentifier", () => {
  assert(isIdentifier("Alice⏰⚡️💪"))
  assert(isIdentifier("Ab@5M46V7KKKGT8H3DPBRG7SB9Q19YRWPD6XRWWV3GGYPNUD71MK02"))
})
