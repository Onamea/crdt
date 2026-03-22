import { assertEquals } from "@std/assert/equals"
import { parseUint8ArrayObject } from "../../lib/parseUint8ArrayObject.ts"

Deno.test("parseUint8ArrayObject", () => {
  assertEquals(parseUint8ArrayObject({ "0": 255, "1": 0, "2": 128 }), new Uint8Array([255, 0, 128]))
})
