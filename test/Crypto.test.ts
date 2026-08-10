import { assertEquals, assertRejects } from "@std/assert"
import mockData from "./data.mock.ts"
import { 
  type NameKey, 
  type MnemonicDisplay, 
  displayPrivateKey, 
  displayPublicKey, 
  displayMnemonic, 
  generateMnemonic, 
  primaryKeyToFingerprintedName, 
  toNameKey 
} from "@onamea/types"
import { 
  identify, 
} from "../Identity.ts"

Deno.test("identify NameKey", async () => {

  const nameKeyMockData = toNameKey(mockData[0]!.name, mockData[0]!.primaryKey)
  const privateKeyDisplay = displayPrivateKey(mockData[0]!.privateKey)
  const [nameKey, keyPair] = await identify(nameKeyMockData, privateKeyDisplay)
  assertEquals(nameKey, nameKeyMockData)
  assertEquals(keyPair.privateKeyDisplay, privateKeyDisplay)
  assertEquals(keyPair.publicKeyDisplay, displayPublicKey(mockData[0]!.publicKey))

  await assertRejects(async () => await identify(nameKeyMockData, displayPrivateKey(mockData[1]!.privateKey)))
}) 

Deno.test("identify with Mnemonic", async () => {
  const nameKeyMockData = mockData[4]!.nameKey as NameKey
  const mnemonicDisplay = mockData[4]!.mnemonicDisplay as MnemonicDisplay
  const [nameKey, keyPair] = await identify(nameKeyMockData, mnemonicDisplay)
  assertEquals(nameKey, nameKeyMockData)
  assertEquals(keyPair.privateKeyDisplay, mockData[4]!.privateKeyDisplay)
  assertEquals(keyPair.publicKeyDisplay, mockData[4]!.publicKeyDisplay)
  assertEquals(keyPair.mnemonicDisplay, mnemonicDisplay)

  await assertRejects(async () => await identify(nameKeyMockData, displayMnemonic(generateMnemonic())))
}) 

Deno.test("identify name", async () => {
  const nameKeyMockData = toNameKey(mockData[0]!.name, mockData[0]!.primaryKey)
  const [nameKey, keyPair] = await identify(mockData[0]!.fingerprintedName, displayPrivateKey(mockData[0]!.privateKey))
  assertEquals(nameKey, nameKeyMockData)
  assertEquals(keyPair.privateKeyDisplay, displayPrivateKey(mockData[0]!.privateKey))
  assertEquals(keyPair.publicKeyDisplay, displayPublicKey(mockData[0]!.publicKey))
})

Deno.test("identify FingerprintedName", async () => {
  const nameKeyMockData = toNameKey(mockData[0]!.name, mockData[0]!.primaryKey)
  const [fingerprintedName] = await primaryKeyToFingerprintedName(mockData[0]!.primaryKey, mockData[0]!.name)
  const [nameKey, keyPair] = await identify(fingerprintedName, displayPrivateKey(mockData[0]!.privateKey))
  assertEquals(nameKey, nameKeyMockData)
  assertEquals(keyPair.privateKeyDisplay, displayPrivateKey(mockData[0]!.privateKey))
  assertEquals(keyPair.publicKeyDisplay, displayPublicKey(mockData[0]!.publicKey))

  await assertRejects(async () => await identify(fingerprintedName, displayPrivateKey(mockData[1]!.privateKey)))
})

Deno.test("identify with PathStringified", async () => {
  const nameKeyMockData = toNameKey(mockData[0]!.name, mockData[0]!.primaryKey)
  const pathStringified = `${ mockData[0]!.fingerprintedName }`
  const [nameKey, keyPair] = await identify(pathStringified, displayPrivateKey(mockData[0]!.privateKey))
  assertEquals(nameKey, nameKeyMockData)
  assertEquals(keyPair.privateKeyDisplay, displayPrivateKey(mockData[0]!.privateKey))
  assertEquals(keyPair.publicKeyDisplay, displayPublicKey(mockData[0]!.publicKey))
})

Deno.test("identify with PathStringified SubKey", async () => {
  const pathStringified = `Name😀/${ mockData[0]!.fingerprintedName }`
  const [name, keyPair] = await identify(pathStringified, displayPrivateKey(mockData[0]!.privateKey))
  assertEquals(name, "Name😀")
  assertEquals(keyPair.privateKeyDisplay, displayPrivateKey(mockData[0]!.privateKey))
  assertEquals(keyPair.publicKeyDisplay, displayPublicKey(mockData[0]!.publicKey))
})
