import { type PrimaryKey, isPrimaryKey, readCryptoNameFromPrimaryKey,  } from "@vanice/types"
import { type Name, type FingerprintedName, isFingerprintedName, isName } from "@vanice/types"
import { type NameKey, isNameKey, toNameKey, parseNameKey } from "@vanice/types"
import { type FingerprintDisplay, isFingerprintDisplay, parseFingerprintedName, fingerprintedNameBelongsToPrimaryKey } from "@vanice/types"
import { 
  type PublicKeyDisplay, 
  type PrivateKeyDisplay, 
  type MnemonicDisplay, 
  type MnemonicPassphrase,
  type CryptoName, 
  type KeyPairDisplay,
  isPublicKeyDisplayByCryptoName,
  isMnemonicDisplay,
  keyPairFromMnemonic,
  fromMnemonicDisplay,
  keyPairFromPrivateKey,
  publicKeyToPrimaryKey,
  displayKeyPair,
  cryptoNames,
  fromHex
} from "@vanice/types"
import type { Operations } from "./Operation.ts"
import { areOperations, buildItemFromOperations, buildIdentityFromOperations } from "./Operations.ts"
import { isMessage, type Messages } from "./Message.ts"
import { type PathStringified, isPathStringified, parseAmbiguousPath } from "./Path.ts"
import isObject from "./lib/utils/isObject.ts"
import isArray from "./lib/utils/isArray.ts"
import isString from "./lib/utils/isString.ts"
import isBoolean from "./lib/utils/isBoolean.ts"
import { toRawOperation } from "./RawOperation.ts"
import type { Flavor } from "./lib/utils/Flavor.ts"

export type IdentityKey = NameKey | PrimaryKey | PublicKeyDisplay
export type IdentityKeys = IdentityKey[]
export type IdentityKeyDomain = Flavor<string, "IdentityKeyDomain">
export type SubKey = {
  subKey: IdentityKey
  domain?: IdentityKeyDomain
}
export type SubKeys = SubKey[]
export type Identifier = IdentityKey | FingerprintedName

export const isIdentityKey = (value: unknown): value is IdentityKey => {
  return (
    isNameKey(value) || 
    isPrimaryKey(value) || 
    isPublicKeyDisplayByCryptoName("Ed25519", value) ||
    isPublicKeyDisplayByCryptoName("ECDSA", value) ||
    isPublicKeyDisplayByCryptoName("Schnorr", value)
  )
}

export const areIdentityKeys = (values: unknown): values is IdentityKeys => {
  return isArray(values) && values.every(isIdentityKey)
}

export const isIdentityKeyDomain = (value: unknown): value is IdentityKeyDomain => {
  return isString(value) && value.trim().length > 0
}

export const isSubKey = (value: unknown): value is SubKey => {
  if (isObject(value) === false) return false
  const { subKey, domain } = value
  return (
    isIdentityKey(subKey) &&
    (domain === undefined || isIdentityKeyDomain(domain))
  )
}

export const areSubKeys = (values: unknown): values is SubKeys => {
  return isArray(values) && values.every(isSubKey)
}

export const isIdentifier = (value: unknown): value is Identifier => {
  return isIdentityKey(value) || isFingerprintedName(value)
}

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
  relations?: Id[]
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
  const { id, body, tombstone, relations, operations } = value
  return (
    isId(id) &&
    isBody(body) &&
    isBoolean(tombstone) &&
    areOperations(operations) &&
    relations === undefined || areIds(relations)
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

export const identify = async (id: NameKey | PathStringified | FingerprintedName, privateKeyOrMnemonic: PrivateKeyDisplay | MnemonicDisplay, mnemonicPassphrase?: MnemonicPassphrase): Promise<[Identifier, KeyPairDisplay]> => {

  const getKeyPair = (cryptoName: CryptoName) => {
    return isMnemonicDisplay(privateKeyOrMnemonic) ? 
      keyPairFromMnemonic(cryptoName, fromMnemonicDisplay(privateKeyOrMnemonic), mnemonicPassphrase) : 
      keyPairFromPrivateKey(cryptoName, fromHex(privateKeyOrMnemonic))
  }

  const tryFindingIdentity = async (id: FingerprintedName): Promise<[Identifier, KeyPairDisplay]> => {
    const results: [Identifier, KeyPairDisplay][] = []
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
      return results[0]!
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
        return [path.elements[0].id, keyPair] as const
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
