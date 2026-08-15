import { createCreateOperation, createSetOperation } from "../Operation.ts"

const id = Deno.args[0] 
const previousHash = Deno.args[1] 
const body = Deno.args[2]

if (previousHash === undefined) {
  const createOperation = await createCreateOperation(id)
  console.log(createOperation)
} 

if (previousHash !== undefined) {
  const setOperation = await createSetOperation(id, previousHash, body ?? "")
  console.log(setOperation)
}
