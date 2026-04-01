import { assert, assertEquals, assertFalse } from "@std/assert"
import mockData from "./data.mock.ts"
import { toNameKey } from "@vanice/types"
import { createCreateOperation, createDeleteOperation, createDenounceOperation, createGrantOperation, createRevokeOperation, createRelateOperation, createRevertOperation, createSetOperation, createUnrelateOperation, createVouchOperation, createValidateOperation } from "../Operation.ts"
import { buildIdentityFromOperations, buildItemFromOperations, getLatestHashFromOperations, getPreviousHash, operationsIncludeOperation } from "../Operations.ts"

const primaryKey = mockData[0].primaryKey
const name = mockData[0].name
const nameKey = toNameKey(name, primaryKey)
const createOperation = await createCreateOperation(nameKey)
const setOperation = await createSetOperation(nameKey, createOperation.hash, "body")
const deleteOperation = await createDeleteOperation(nameKey, setOperation.hash)

Deno.test("operationsIncludeOperation", () => {
  assert(operationsIncludeOperation([createOperation, setOperation, deleteOperation], setOperation.hash))
  assertFalse(operationsIncludeOperation([createOperation, setOperation], deleteOperation.hash))
})

Deno.test("buildIdentityFromOperations", async () => {
  const operations = [createOperation, setOperation, deleteOperation]
  const identity = await buildIdentityFromOperations(operations, nameKey)
  assertEquals(identity.primaryKey, primaryKey)
  assertEquals(identity.name, name)
  assertEquals(identity.body, "body")
  assertEquals(identity.tombstone, true)
  assertEquals(identity.operations, operations)
})

Deno.test("validate", async () => {
  const validateOperation = await createValidateOperation(nameKey, createOperation.hash, "(body) => body === 'body'")
  const setOperation = await createSetOperation(nameKey, validateOperation.hash, "body")
  const setOperation2 = await createSetOperation(nameKey, setOperation.hash, "not body")
  const operations = [createOperation, validateOperation, setOperation, setOperation2]
  const identity = await buildIdentityFromOperations(operations, nameKey)
  assertEquals(identity.body, "body")
})

Deno.test("subKeys", async () => {
  const identityKey = toNameKey(mockData[1].name, mockData[1].primaryKey)
  const identityKey2 = toNameKey(mockData[2].name, mockData[2].primaryKey)
  const grantOperation = await createGrantOperation(nameKey, createOperation.hash, identityKey)
  const grantOperation2 = await createGrantOperation(nameKey, createOperation.hash, identityKey2, "example.com")
  const operations = [createOperation, grantOperation, grantOperation2]
  const identity = await buildIdentityFromOperations(operations, nameKey)
  assertEquals(identity.subKeys, [{ subKey: identityKey2, domain: "example.com" }, { subKey: identityKey, domain: undefined }])

  const revokeOperation = await createRevokeOperation(nameKey, grantOperation.hash)
  const operations2 = [createOperation, grantOperation, grantOperation2, revokeOperation]
  const identity2 = await buildIdentityFromOperations(operations2, nameKey)
  assertEquals(identity2.subKeys, [{ subKey: identityKey2, domain: "example.com" }])
})

Deno.test("referents", async () => {
  const referent = toNameKey(mockData[0].name, mockData[0].primaryKey)
  const vouchOperation = await createVouchOperation(nameKey, createOperation.hash, referent)
  const operations = [createOperation, vouchOperation]
  const identity = await buildIdentityFromOperations(operations, nameKey)
  assertEquals(identity.referents, [referent])

  const denounceOperation = await createDenounceOperation(nameKey, vouchOperation.hash)
  const operations2 = [createOperation, vouchOperation, denounceOperation]
  const identity2 = await buildIdentityFromOperations(operations2, nameKey)
  assertEquals(identity2.referents, [])
})

Deno.test("relations", async () => {
  const relationId1 = toNameKey(mockData[2].name, mockData[2].primaryKey)
  const relationId2 = toNameKey(mockData[3].name, mockData[3].primaryKey)
  const relateOperation1 = await createRelateOperation(nameKey, createOperation.hash, relationId1)
  const relateOperation2 = await createRelateOperation(nameKey, relateOperation1.hash, relationId2)
  const operations = [createOperation, relateOperation1, relateOperation2]
  const item = await buildItemFromOperations(operations, nameKey, true)
  assertEquals(item.relations?.map(relation => relation.id), [relationId1, relationId2])

  const unrelateOperation = await createUnrelateOperation(nameKey, relateOperation1.hash)
  const operations1 = [createOperation, relateOperation1, relateOperation2, unrelateOperation]
  const item1 = await buildItemFromOperations(operations1, nameKey, true)
  assertEquals(item1.relations?.map(relation => relation.id), [relationId2])
})

Deno.test("relation ordering", async () => {
  const relationId1 = toNameKey(mockData[2].name, mockData[2].primaryKey)
  const relationId2 = toNameKey(mockData[3].name, mockData[3].primaryKey)
  const relationId3 = toNameKey(mockData[4].name, mockData[4].primaryKey)
  const relateOperation1 = await createRelateOperation(nameKey, createOperation.hash, relationId1)
  const relateOperation2 = await createRelateOperation(nameKey, createOperation.hash, relationId2)
  const relateOperation3 = await createRelateOperation(nameKey, relateOperation1.hash, relationId3)
  const operations = [createOperation, relateOperation1, relateOperation2, relateOperation3]
  const item = await buildItemFromOperations(operations, nameKey, true)
  assertEquals(item.relations?.map(relation => relation.id), [relationId1, relationId2, relationId3])
})

Deno.test("deeper relations", async () => {

  // Inline names and keys from mockData
  const id1 = toNameKey(mockData[1].name, mockData[1].primaryKey)
  const id2 = toNameKey(mockData[2].name, mockData[2].primaryKey)
  const id3 = toNameKey(mockData[3].name, mockData[3].primaryKey)

  // Operations
  const createOperation1 = await createCreateOperation(id1)
  const createOperation2 = await createCreateOperation(id2)
  const createOperation3 = await createCreateOperation(id3)

  const relateOperation1to2 = await createRelateOperation(id1, createOperation1.hash, id2)
  const relateOperation2to3 = await createRelateOperation(id2, createOperation2.hash, id3)

  const operations = [createOperation1, createOperation2, createOperation3, relateOperation2to3, relateOperation1to2]
  const item1 = await buildItemFromOperations(operations, id1, true)

  // 1 should have 2 as relation
  assertEquals(item1.relations?.length, 1)
  const item2 = item1.relations?.[0]
  assertEquals(item2?.id, id2)

  // 2 should have 3 as relation
  assertEquals(item2?.relations?.length, 1)
  const item3 = item2?.relations?.[0]
  assertEquals(item3?.id, id3)

  // 3 should have no relations
  console.log(item3?.relations)
  assertEquals(item3?.relations, undefined)
})

Deno.test("REVERT operations", async () => {
  const operations = [createOperation, setOperation]
  const item = await buildItemFromOperations(operations, nameKey)
  assertEquals(item.body, "body")

  const revertOperation = await createRevertOperation(nameKey, setOperation.hash)
  const operations2 = [createOperation, setOperation, revertOperation]
  const item2 = await buildItemFromOperations(operations2, nameKey)
  assertEquals(item2.body, undefined)
})

Deno.test("getLatestHash", () => {
  const operations = [createOperation, setOperation, deleteOperation]
  const hash = getLatestHashFromOperations(operations)
  assertEquals(hash, setOperation.hash)
})

Deno.test("getPreviousHash SET", () => {
  const operations = [createOperation, setOperation]
  const hash = getPreviousHash(operations, "SET")
  assertEquals(hash, setOperation.hash)
})

Deno.test("getPreviousHash RELATE", async () => {
  const relationId = "id-3" 
  const relateOperation = await createRelateOperation(nameKey, createOperation.hash, relationId)
  const operations = [createOperation, relateOperation]
  const hash = getPreviousHash(operations, "UNRELATE", relateOperation.hash)
  assertEquals(hash, relateOperation.hash)
})

Deno.test("getPreviousHash REVOKE", async () => {
  const subKey = toNameKey(mockData[1].name, mockData[1].primaryKey)
  const grantOperation = await createGrantOperation(nameKey, createOperation.hash, subKey)
  const operations = [createOperation, grantOperation]
  const hash = getPreviousHash(operations, "REVOKE", grantOperation.hash)
  assertEquals(hash, grantOperation.hash)
})
