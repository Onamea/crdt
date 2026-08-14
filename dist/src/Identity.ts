import type { PrimaryKey, Name, FingerprintedName, NameKey, FingerprintDisplay, PublicKeyDisplay, PrivateKeyDisplay, CryptoName, KeyPairDisplay, MnemonicDisplayWithPassphrase, MnemonicDisplay } from "@onamea/types"
import { 
  isPrimaryKey, 
  readCryptoNameFromPrimaryKey, 
  isFingerprintedName, 
  isName, 
  isNameKey, 
  toNameKey, 
  parseNameKey, 
  isFingerprintDisplay, 
  parseFingerprintedName, 
  fingerprintedNameBelongsToPrimaryKey, 
  isPublicKeyDisplayByCryptoName, 
  keyPairFromMnemonic, 
  keyPairFromPrivateKey, 
  publicKeyToPrimaryKey, 
  displayKeyPair, 
  cryptoNames, 
  fromHex, 
  isMnemonicDisplayWithPassphrase, 
  fromMnemonicDisplayWithPassphrase, 
  isMnemonicDisplay
} from "@onamea/types"
import type { Operations } from "./Operation.js"
import { areOperations, buildItemFromOperations, buildIdentityFromOperations } from "./Operations.js"
import { isMessage, type Messages } from "./Message.js"
import { type PathStringified, isPathStringified, parseAmbiguousPath } from "./Path.js"
import isObject from "./lib/utils/isObject.js"
import isArray from "./lib/utils/isArray.js"
import isString from "./lib/utils/isString.js"
import isBoolean from "./lib/utils/isBoolean.js"
import { toRawOperation } from "./RawOperation.js"
import type { Identifier, IdentityKeys, SubKeys } from "./Identifier.js"
import { areIdentityKeys, areSubKeys } from "./Identifier.js"

export type Id = string
export type Body = string | undefined
type WithMessages = {
  messages: Messages
}
export type Item = {
  id: Id
  body: Body
  tombstone: boolean
  operations: Operations
  relations?: Item[]
}

export type ItemWithMessages = Item & WithMessages

export type Identity = Item & {
  id: NameKey
  primaryKey: PrimaryKey
  name: Name
  fingerprintDisplay: FingerprintDisplay
  publicKeyDisplay: PublicKeyDisplay
  subKeys: SubKeys
  referents?: IdentityKeys
}
export type IdentityWithMessages = Identity & WithMessages

export const isId = (value: unknown): value is Id => {
  return isString(value) && value.trim().length > 0
}

export const areIds = (values: unknown): values is Id[] => {
  return isArray(values) && values.every(isId)
}

export const isBody = (value: unknown): value is Body => {
  return value === undefined || isString(value)
}

export const isItem = (value: unknown): value is Item => {
  if (isObject(value) === false) return false
  const { id, body, tombstone, operations, relations } = value
  return (
    isId(id) &&
    isBody(body) &&
    isBoolean(tombstone) &&
    areOperations(operations) &&
    (relations === undefined || (Array.isArray(relations) && relations.every(isItem)))
  )
}

export const validateItem = async (item: Item): Promise<boolean> => {
  const buildItem = await buildItemFromOperations(item.operations, item.id)
  return (
    item.id === buildItem.id &&
    item.body === buildItem.body &&
    item.tombstone === buildItem.tombstone
  )
}

export const isIdentity = (value: unknown): value is Identity => {
  if (isObject(value) === false) return false
  if (isItem(value) === false) return false
  const { id, primaryKey, name, fingerprintDisplay, publicKeyDisplay, subKeys, referents } = value as Identity
  if (isPrimaryKey(primaryKey) === false) return false
  const cryptoName = readCryptoNameFromPrimaryKey(primaryKey)
  return (
    isNameKey(id) &&
    isName(name) &&
    isFingerprintDisplay(fingerprintDisplay) &&
    isPublicKeyDisplayByCryptoName(cryptoName, publicKeyDisplay) &&
    areSubKeys(subKeys) &&
    (referents === undefined || areIdentityKeys(referents))
  )
}

export const validateIdentity = async (identity: Identity): Promise<boolean> => {
  const { id, operations } = identity
  const buildIdentity = await buildIdentityFromOperations(operations, id)
  return (
    identity.primaryKey === buildIdentity.primaryKey &&
    identity.name === buildIdentity.name &&
    identity.fingerprintDisplay === buildIdentity.fingerprintDisplay &&
    identity.body === buildIdentity.body &&
    identity.tombstone === buildIdentity.tombstone &&
    identity.subKeys.every((subKey, index) => buildIdentity.subKeys[index] === subKey)
  )
}

const isWithMessages = (value: unknown): value is WithMessages => {
  if (isObject(value) === false) return false
  const { messages } = value as WithMessages
  return messages !== undefined && messages.every(isMessage)
}

export const isItemWithMessages = (value: unknown): value is ItemWithMessages => {
  return isItem(value) && isWithMessages(value)
}

export const isIdentityWithMessages = (value: unknown): value is IdentityWithMessages => {
  return isItem(value) && isWithMessages(value)
}

export const getUnsignedOperations = (item: ItemWithMessages | IdentityWithMessages): Operations => {  
  const { operations, messages } = item
  const rawOperations = new Set(messages.map(({ raw }) => raw))
  return operations.filter(operation => rawOperations.has(toRawOperation(operation)) === false)
}

export const identify = async (id: Identifier | PathStringified, privateKeyOrMnemonic: PrivateKeyDisplay | MnemonicDisplay | MnemonicDisplayWithPassphrase): Promise<[FingerprintedName | NameKey, KeyPairDisplay]> => {

  const splitMnemonicAndPassphrase = (mnemonicDisplayWithPassphrase: MnemonicDisplay | MnemonicDisplayWithPassphrase) => {
    return fromMnemonicDisplayWithPassphrase(mnemonicDisplayWithPassphrase)
  }

  const getKeyPair = (cryptoName: CryptoName) => {
    return isMnemonicDisplayWithPassphrase(privateKeyOrMnemonic) || isMnemonicDisplay(privateKeyOrMnemonic) ? 
      keyPairFromMnemonic(cryptoName, ...splitMnemonicAndPassphrase(privateKeyOrMnemonic)) : 
      keyPairFromPrivateKey(cryptoName, fromHex(privateKeyOrMnemonic))
  }

  const tryFindingIdentity = async (id: FingerprintedName): Promise<[NameKey, KeyPairDisplay]> => {
    const results: [NameKey, KeyPairDisplay][] = []
    for (const cryptoName of cryptoNames) {
      try {
        const keyPair = getKeyPair(cryptoName)
        const primaryKey = publicKeyToPrimaryKey(cryptoName, keyPair.publicKey)
        if (await fingerprintedNameBelongsToPrimaryKey(id, primaryKey)) {
          const name = isName(id) ? id : parseFingerprintedName(id)[0]
          const nameKey = toNameKey(name, primaryKey)
          results.push([nameKey, displayKeyPair(keyPair)])
        }
      } catch { continue }
    }
    if (results.length === 0) {
      throw new Error(`Private key or Mnemonic does not match supplied id: ${ id }`)
    } else if (results.length > 1) {
      throw new Error(`Supplied id: ${ id } is ambiguous and matches multiple identities (on different CryptoNames). Use a longer Fingerprint.`)
    } else {
      return results[0]
    }
  }

  if (isNameKey(id)) {
    const [primaryKey] = parseNameKey(id)
    const cryptoName = readCryptoNameFromPrimaryKey(primaryKey)
    const keyPair = getKeyPair(cryptoName)
    const keyPairPrimaryKey = publicKeyToPrimaryKey(cryptoName, keyPair.publicKey)
    if (keyPairPrimaryKey !== primaryKey) {
      throw new Error(`PrivateKey does not match NameKey: ${ id }`)
    }
    return [id, displayKeyPair(keyPair)] as const
  } else if (isFingerprintedName(id)) {
    return await tryFindingIdentity(id)
  } else if (isPathStringified(id)) {
    const path = parseAmbiguousPath(id)
    if (path.elements[0]?.type === "IDENTITY") {
      if (path.elements[1]?.type === "SUBKEY") {
        const [, keyPair] = await tryFindingIdentity(path.elements[1].id as FingerprintedName)
        return [path.elements[0].id as FingerprintedName, keyPair] as const
      } else {
        return await tryFindingIdentity(path.elements[0].id as FingerprintedName)
      }
    } else {
      throw new Error(`Invalid PathStringified: ${ id }`)
    }
  } else {
    throw new Error(`Invalid id parameter: ${ id } (must be a NameKey, FingerprintedName or PathStringified)`)
  }
}
