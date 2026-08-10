import { assert, assertFalse, assertRejects } from "@std/assert"
import { toNameKey } from "@onamea/types"
import mockData from "./data.mock.ts"
import { createCreateOperation } from "../Operation.ts"
import { toRawOperation } from "../RawOperation.ts"
import { signMessage, verifyMessage, isSignedByOwner, signOperation } from "../Message.ts"

Deno.test("sign, verify", async () => {

  const primaryKey = mockData[3]!.primaryKey
  const name = mockData[3]!.name
  const id = toNameKey(name, primaryKey)
  const createOperation = await createCreateOperation(id)
  const unsignedMessage = {
    raw: toRawOperation(createOperation)
  }
  const keyPair = {
    cryptoName: mockData[3]!.cryptoName,
    publicKey: mockData[3]!.publicKey,
    privateKey: mockData[3]!.privateKey
  }
  assert(await verifyMessage(await signMessage(unsignedMessage, keyPair)))
  assert(await verifyMessage(await signMessage(unsignedMessage, keyPair, Date.now())))
  assert(await verifyMessage(await signMessage(unsignedMessage, keyPair, (new Date()).toISOString())))
})

Deno.test("signOperation, verify", async () => {
  const primaryKey = mockData[3]!.primaryKey
  const name = mockData[3]!.name
  const id = toNameKey(name, primaryKey)
  const keyPair = {
    cryptoName: mockData[3]!.cryptoName,
    publicKey: mockData[3]!.publicKey,
    privateKey: mockData[3]!.privateKey
  }
  const createOperation = await createCreateOperation(id)
  assert(await verifyMessage(await signOperation(createOperation, keyPair)))
})

Deno.test("signOperation, invalid structure", async () => {
  const keyPair = {
    cryptoName: mockData[3]!.cryptoName,
    publicKey: mockData[3]!.publicKey,
    privateKey: mockData[3]!.privateKey
  }
  // deno-lint-ignore no-explicit-any
  await assertRejects(() => signOperation({ type: "CREATE" } as any, keyPair), Error, "Invalid Operation")
})

Deno.test("signOperation, incorrect hash", async () => {
  const primaryKey = mockData[3]!.primaryKey
  const name = mockData[3]!.name
  const id = toNameKey(name, primaryKey)
  const keyPair = {
    cryptoName: mockData[3]!.cryptoName,
    publicKey: mockData[3]!.publicKey,
    privateKey: mockData[3]!.privateKey
  }
  const createOperation = await createCreateOperation(id)
  const tampered = { ...createOperation, hash: createOperation.hash.slice(0, -1) + "0" }
  // deno-lint-ignore no-explicit-any
  await assertRejects(() => signOperation(tampered as any, keyPair), Error, "Invalid Operation")
})

Deno.test("isSignedByOwner", async () => {

  const primaryKey = mockData[0]!.primaryKey
  const name = mockData[0]!.name
  const id = toNameKey(name, primaryKey)
  const createOperation = await createCreateOperation(id)
  const unsignedMessage = {
    raw: toRawOperation(createOperation)
  }

  const keyPair = {
    cryptoName: mockData[0]!.cryptoName,
    publicKey: mockData[0]!.publicKey,
    privateKey: mockData[0]!.privateKey
  }
  const message = await signMessage(unsignedMessage, keyPair)
  assert(await isSignedByOwner(message))

  const keyPair1 = {
    cryptoName: mockData[1]!.cryptoName,
    publicKey: mockData[1]!.publicKey,
    privateKey: mockData[1]!.privateKey
  }
  const message1 = await signMessage(unsignedMessage, keyPair1)
  assertFalse(await isSignedByOwner(message1))
})
