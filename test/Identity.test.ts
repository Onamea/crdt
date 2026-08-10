import { assert, assertFalse } from "@std/assert"
import { displayPublicKeyByCryptoName, keyPairFromPrivateKey } from "@onamea/types"
import { toNameKey } from "@onamea/types"
import identityMock from "./identity.mock.json" with { type: "json" }
import mockData from "./data.mock.ts"
import { createCreateOperation, createSetOperation } from "../Operation.ts"
import { buildIdentityFromOperations } from "../Operations.ts"
import { isIdentity, isIdentityWithMessages, isItem, validateIdentity, getUnsignedOperations } from "../Identity.ts"
import { buildItemFromOperations } from "../Operations.ts"
import { signOperation } from "../Message.ts"

Deno.test("isItem", async () => {
  assertFalse(isItem({}))
  const createOperation = await createCreateOperation("123")
  assert(isItem({ 
    id: "123",
    body: "text",
    tombstone: false,
    operations: [createOperation]
  }))
})

Deno.test("isItem with relations", async () => {
  assertFalse(isItem({}))
  const createOperation = await createCreateOperation("123")
  assert(isItem({ 
    id: "123",
    body: "text",
    tombstone: false,
    operations: [createOperation],
    relations: [
      {
        id: "456",
        body: "related item",
        tombstone: false,
        operations: [createOperation]
      }
    ]
  }))
})


Deno.test("isIdentity, isIdentityWithMessages", () => {
  assertFalse(isIdentity({}))
  const id = toNameKey(mockData[0]!.name, mockData[0]!.primaryKey)
  const identity = { 
    ...mockData[0]!, 
    publicKey: mockData[0]!.publicKey, 
    publicKeyDisplay: displayPublicKeyByCryptoName(mockData[0]!.cryptoName, mockData[0]!.publicKey), 
    id, 
    body: "Sample body", 
    tombstone: false, 
    operations: [],
    subKeys: [] 
  }
  assert(isIdentity(identity))
  assertFalse(isIdentityWithMessages(identity))
  const identityWithMessages = {
    ...identity,
    messages: []
  }
  assert(isIdentityWithMessages(identityWithMessages))
})

Deno.test("isIdentity mock data", () => {
  const identity = {
    ...identityMock,
    publicKey: new Uint8Array(identityMock.publicKey)
  }
  assert(isIdentity(identity))
})

Deno.test("validateIdentity", async () => {
  const id = toNameKey(mockData[0]!.name, mockData[0]!.primaryKey)
  const createOperation = await createCreateOperation(id)
  const identity = await buildIdentityFromOperations(
    [createOperation],
    id
  )
  assert(await validateIdentity(identity))
})

Deno.test("getUnsignedOperations", async () => {
  const id = toNameKey(mockData[0]!.name, mockData[0]!.primaryKey)
  const keyPair = keyPairFromPrivateKey(mockData[0]!.cryptoName, mockData[0]!.privateKey)
  const createOperation = await createCreateOperation(id)
  const setOperation = await createSetOperation(id, createOperation.hash, "body")
  const createOperationMessage = await signOperation(createOperation, keyPair)
  const item = await buildItemFromOperations([createOperation, setOperation], id)
  const itemWithMessages = {
    ...item,
    messages: [createOperationMessage]
  }
  const unsignedOperations = getUnsignedOperations(itemWithMessages)
  assert(unsignedOperations.length === 1)
  assert(unsignedOperations[0]!.hash === setOperation.hash)
})
