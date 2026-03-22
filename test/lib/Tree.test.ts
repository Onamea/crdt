import { assertEquals, assertThrows } from "@std/assert"
import mockData from "../data.mock.ts"
import { toNameKey } from "@vanice/types"
import { createCreateOperation, createDeleteOperation, createSetOperation } from "../../Operation.ts"
import { buildOperationTree, flattenOperationTree } from "../../lib/Tree.ts"

const primaryKey = mockData[0]!.primaryKey
const name = mockData[0]!.name
const nameKey = toNameKey(name, primaryKey)
const createOperation = await createCreateOperation(nameKey)
const setOperation = await createSetOperation(nameKey, createOperation.hash, "body")
const deleteOperation = await createDeleteOperation(nameKey, setOperation.hash)

Deno.test("buildOperationTree", async () => {

  assertThrows(() => { buildOperationTree([]) })
  assertThrows(() => { buildOperationTree([setOperation]) })
  const { tree } = buildOperationTree([createOperation, setOperation, deleteOperation])
  assertEquals(tree, [createOperation, [[setOperation, [[deleteOperation, []]]]]])

  const leftOverOperation = await createSetOperation(nameKey, "f".repeat(64), "leftover")
  const { leftOver } = buildOperationTree([createOperation, setOperation, deleteOperation, leftOverOperation])
  assertEquals(leftOver, [leftOverOperation])
})

Deno.test("buildOperationTree with conflicting operation", async () => {
  const conflictingSetOperation = await createSetOperation(nameKey, createOperation.hash, "conflict")
  const { tree } = buildOperationTree([createOperation, setOperation, deleteOperation, conflictingSetOperation])
  assertEquals(tree, [createOperation, [[setOperation, [[deleteOperation, []]]], [conflictingSetOperation, []], ]])
})

Deno.test("flattenTree", () => {
  const { tree } = buildOperationTree([createOperation, setOperation, deleteOperation])
  assertEquals(flattenOperationTree(tree), [createOperation, setOperation, deleteOperation])
})

Deno.test("buildOperationTree does not add duplicate operations to the tree", () => {
  const { tree } = buildOperationTree([createOperation, setOperation, setOperation, deleteOperation])
  const flat = flattenOperationTree(tree)
  const hashes = flat.map(({ hash }) => hash)
  assertEquals(hashes, [...new Set(hashes)])
})
