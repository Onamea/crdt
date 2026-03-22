import { assertEquals } from "@std/assert"
import { buildPathFromElements, parseAmbiguousPath, parsePath } from "../Path.ts"

Deno.test("buildPathFromElements", () => {
  const elements = [
    { id: "Mike⏰⚡️💪", type: "IDENTITY" as const },
    { id: "key🍴🚗🏠🎄🦋", type: "SUBKEY" as const },
    { id: "item-42", type: "ITEM" as const }
  ]
  const pathString = buildPathFromElements(elements)
  assertEquals(pathString, "@Mike⏰⚡️💪/$key🍴🚗🏠🎄🦋/item-42")
})

Deno.test("parsePath", () => {
  const path = parsePath("@Mike⏰⚡️💪/$key🍴🚗🏠🎄🦋/item-42")
  assertEquals(path, { 
    elements: [
      { id: "Mike⏰⚡️💪", type: "IDENTITY" },
      { id: "key🍴🚗🏠🎄🦋", type: "SUBKEY" },
      { id: "item-42", type: "ITEM" }
    ],
    fingerprint: undefined
  })
})

Deno.test("parsePath fingerprint", () => {
  const path2 = parsePath("@Mike⏰⚡️💪/$key🍴🚗🏠🎄🦋/item-43#⚡️🎄🌙❤️🎁")
  assertEquals(path2, { 
    elements: [
      { id: "Mike⏰⚡️💪", type: "IDENTITY" },
      { id: "key🍴🚗🏠🎄🦋", type: "SUBKEY" },
      { id: "item-43", type: "ITEM" }
    ],
    fingerprint: "⚡️🎄🌙❤️🎁"
  })
})

Deno.test("parsePath escaped", () => {
  const path3 = parsePath("@Mike⏰⚡️💪/\\$item-43")
  assertEquals(path3, { 
    elements: [
      { id: "Mike⏰⚡️💪", type: "IDENTITY" },
      { id: "$item-43", type: "ITEM" }
    ],
    fingerprint: undefined
  })
})

Deno.test("parsePath escaped fingerprint", () => {
  const path2 = parsePath("@Mike⏰⚡️💪/item-43\\#⚡️")
  assertEquals(path2, { 
    elements: [
      { id: "Mike⏰⚡️💪", type: "IDENTITY" },
      { id: "item-43#⚡️", type: "ITEM" }
    ],
    fingerprint: undefined
  })
})

Deno.test("parseAmbiguousPath", () => {
  const path = parseAmbiguousPath("Mike⏰⚡️💪/key🍴🚗🏠🎄🦋")
  assertEquals(path, { 
    elements: [
      { id: "Mike⏰⚡️💪", type: "IDENTITY" },
      { id: "key🍴🚗🏠🎄🦋", type: "SUBKEY" }
    ],
    fingerprint: undefined
  })

  const path2 = parseAmbiguousPath("Mike⏰⚡️💪/AB5M46V7KKKGT8H3DPBRG7SB9Q19YRWPD6XRWWV3GGYPNUD71MK02")
  assertEquals(path2, { 
    elements: [
      { id: "Mike⏰⚡️💪", type: "IDENTITY" },
      { id: "AB5M46V7KKKGT8H3DPBRG7SB9Q19YRWPD6XRWWV3GGYPNUD71MK02", type: "SUBKEY" }
    ],
    fingerprint: undefined
  })

  const path3 = parseAmbiguousPath("Mike⏰⚡️💪/Ab@5M46V7KKKGT8H3DPBRG7SB9Q19YRWPD6XRWWV3GGYPNUD71MK02")
  assertEquals(path3, { 
    elements: [
      { id: "Mike⏰⚡️💪", type: "IDENTITY" },
      { id: "Ab@5M46V7KKKGT8H3DPBRG7SB9Q19YRWPD6XRWWV3GGYPNUD71MK02", type: "SUBKEY" }
    ],
    fingerprint: undefined
  })
})
