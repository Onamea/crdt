import { assertEquals } from "@std/assert"
import { createCreateOperation, createSetOperation, createDeleteOperation, hashOperation, createGrantOperation } from "../Operation.ts"
import { parseRawOperation, toRawOperation } from "../RawOperation.ts"
import mockData from "./data.mock.ts"
import { toNameKey } from "@onamea/types"

Deno.test("parseOperation", async () => {

  const primaryKey = mockData[0]!.primaryKey
  const name = mockData[0]!.name
  const id = toNameKey(name, primaryKey)
  const createOperation = await createCreateOperation(id)
  const rawCreateOperation = toRawOperation(createOperation) 
  const parsedCreateOperation = await parseRawOperation(rawCreateOperation)
  assertEquals(parsedCreateOperation, { id, hash: createOperation.hash, type: "CREATE" })

  const previousHash = await hashOperation(createOperation)
  const setOperation = await createSetOperation(id, previousHash, "body\nline2")
  const rawSetOperation = toRawOperation(setOperation)
  const parsedSetOperation = await parseRawOperation(rawSetOperation)
  assertEquals(parsedSetOperation, { id, hash: setOperation.hash, previousHash, type: "SET", body: "body\nline2" })

  const deleteOperation = await createDeleteOperation(id, setOperation.hash)
  const rawDeleteOperation = toRawOperation(deleteOperation)
  const parsedDeleteOperation = await parseRawOperation(rawDeleteOperation)
  assertEquals(parsedDeleteOperation, { id, hash: deleteOperation.hash, previousHash: setOperation.hash, type: "DELETE" })

  const subKey = toNameKey(mockData[1].name, mockData[1].primaryKey)
  const grantOperation = await createGrantOperation(id, setOperation.hash, subKey, "example.com")
  const rawGrantOperation = toRawOperation(grantOperation)
  const parsedGrantOperation = await parseRawOperation(rawGrantOperation)
  assertEquals(parsedGrantOperation, { id, hash: grantOperation.hash, previousHash: setOperation.hash, type: "GRANT", subKey, domain: "example.com" })
})

Deno.test("parseOperation with OperationName as Name", async () => {
  const id = toNameKey("SET", "SETJUM8STCHCESH00BSPUN293PAV70U5DG63G2KQMTH5XMH9UX5G2")
  const parsedOperation = await parseRawOperation(id)
  assertEquals(parsedOperation, { id, hash: parsedOperation.hash, type: "CREATE" })
})
