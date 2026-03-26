import type { NameKey, PrimaryKey, PublicKeyDisplay, FingerprintedName } from "@vanice/types"
import type { Flavor } from "./lib/utils/Flavor.ts"
import isArray from "./lib/utils/isArray.ts"
import isString from "./lib/utils/isString.ts"
import isObject from "./lib/utils/isObject.ts"
import { isNameKey, isPrimaryKey, isPublicKeyDisplayByCryptoName, isFingerprintedName } from "@vanice/types"

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
