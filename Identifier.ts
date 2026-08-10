import type { NameKey, PrimaryKey, PublicKeyDisplay, FingerprintedName, Name, CryptoName } from "@onamea/types"
import type { Flavor } from "./lib/utils/Flavor.ts"
import isArray from "./lib/utils/isArray.ts"
import isString from "./lib/utils/isString.ts"
import isObject from "./lib/utils/isObject.ts"
import { 
  isNameKey, 
  isPrimaryKey, 
  isPublicKeyDisplayByCryptoName, 
  isFingerprintedName, 
  parseNameKey, 
  primaryKeyToFingerprintedName, 
  publicKeyToPrimaryKey, 
  isPublicKeyDisplay, 
  fromPublicKeyDisplay 
} from "@onamea/types"

export type IdentityKey = NameKey | PrimaryKey | PublicKeyDisplay
export type IdentityKeys = IdentityKey[]
export type IdentityKeyDomain = Flavor<string, "IdentityKeyDomain">
export type Identifier = IdentityKey | FingerprintedName

export type SubKeyDomain = Flavor<string, "SubKeyDomain">
export type SubKey = {
  subKey: NameKey
  domain?: SubKeyDomain
}
export type SubKeys = SubKey[]

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

export const isSubKeyDomain = (value: unknown): value is SubKeyDomain => {
  return isString(value) && value.trim().length > 0
}

export const isSubKey = (value: unknown): value is SubKey => {
  if (isObject(value) === false) return false
  const { subKey, domain } = value
  return (
    isNameKey(subKey) &&
    (domain === undefined || isIdentityKeyDomain(domain))
  )
}

export const areSubKeys = (values: unknown): values is SubKeys => {
  return isArray(values) && values.every(isSubKey)
}

export const isIdentifier = (value: unknown): value is Identifier => {
  return isIdentityKey(value) || isFingerprintedName(value)
}

export const identifierToFingerprintedName = async (identifier: Identifier, name?: Name, cryptoName?: CryptoName): Promise<FingerprintedName> => {
  if (isFingerprintedName(identifier)) return identifier
  if (isNameKey(identifier)) {
    const [primaryKey, name] = parseNameKey(identifier)
    const [fingerprintedName] = await primaryKeyToFingerprintedName(primaryKey, name)
    return fingerprintedName
  }
  if (isPrimaryKey(identifier) && name !== undefined) {
    const [fingerprintedName] = await primaryKeyToFingerprintedName(identifier, name)
    return fingerprintedName
  }
  if (isPublicKeyDisplay(identifier) && name !== undefined && cryptoName !== undefined) {
    const primaryKey = publicKeyToPrimaryKey(cryptoName, fromPublicKeyDisplay(identifier))
    const [fingerprintedName] = await primaryKeyToFingerprintedName(primaryKey, name)
    return fingerprintedName
  }
  throw new Error("Cannot convert Identifier to FingerprintedName: missing name and/or cryptoName for non-NameKey identifier")
}
