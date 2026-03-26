import { assert, assertEquals, assertRejects } from "@std/assert"
import { identifierToFingerprintedName, isIdentifier } from "../Identifier.ts"

import data from "./data.mock.ts"

Deno.test("isIdentifier", () => {
  assert(isIdentifier("Alice⏰⚡️💪"))
  assert(isIdentifier("Ab@5M46V7KKKGT8H3DPBRG7SB9Q19YRWPD6XRWWV3GGYPNUD71MK02"))
})

Deno.test("identifierToFingerprintedName", async () => {
  const identifier1 = "Alice⏰⚡️💪"
  const fingerprintedName1 = await identifierToFingerprintedName(identifier1)
  assertEquals(fingerprintedName1, "Alice⏰⚡️💪")
  const identifier2 = "Ab@5M46V7KKKGT8H3DPBRG7SB9Q19YRWPD6XRWWV3GGYPNUD71MK02"
  const fingerprintedName2 = await identifierToFingerprintedName(identifier2)
  assertEquals(fingerprintedName2, "Ab🏁☃️☔️🎵✈️🌸🎉🏠")
})

Deno.test("identifierToFingerprintedName throws for PrimaryKey without name", async () => {
  const primaryKey = data[0].primaryKey
  await assertRejects(
    async () => {
      await identifierToFingerprintedName(primaryKey)
    }
  )
})

Deno.test("identifierToFingerprintedName throws for PublicKeyDisplay without name/cryptoName", async () => {
  const publicKeyDisplay = data[4].publicKeyDisplay!
  await assertRejects(
    async () => {
      await identifierToFingerprintedName(publicKeyDisplay, "Name")
    }
  )
})
