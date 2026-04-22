import { fromPublicKeyDisplay, type KeyPair, type PublicKeyDisplay } from "@vanice/types"
import type { SignatureDisplay } from "@vanice/types"
import { displayPublicKeyByCryptoName, isPublicKeyDisplayByCryptoName, displaySignatureByCryptoName, isSignatureDisplayByCryptoName, sign as signByCryptoName, verify as verifyByCryptoName } from "@vanice/types"
import { type Hash, messageToHash } from "@vanice/types"
import { isCryptoName, type CryptoName } from "@vanice/types"
import { fromHex } from "@vanice/types"
import { isNameKey, parseNameKey } from "@vanice/types"
import { type PrimaryKey, isPrimaryKey, publicKeyToPrimaryKey } from "@vanice/types"
import { isPublicKeyDisplay } from "@vanice/types"
import { parseRawOperation, toRawOperation, type RawOperation } from "./RawOperation.ts"
import { type Operation, isOwnable, validateOperation } from "./Operation.ts"
import isObject from "./lib/utils/isObject.ts"
import isString from "./lib/utils/isString.ts"
import isNumber from "./lib/utils/isNumber.ts"

export type Datetime = string | number

export type Message = {
  raw: RawOperation
  cryptoName: CryptoName
  publicKey: PublicKeyDisplay
  signature: SignatureDisplay
  datetime?: Datetime
}
export type UnsignedMessage = Omit<Message, "cryptoName" | "publicKey" | "signature" | "datetime">
export type Messages = Message[]

export const isDatetime = (value: unknown): value is Datetime => {
  return isString(value) || isNumber(value)
}

export const isMessage = (value: unknown): value is Message => {
  if (isObject(value) === false) return false
  const { raw, cryptoName, publicKey, signature, datetime } = value as Message
  return (
    isString(raw) && 
    isCryptoName(cryptoName) && 
    isPublicKeyDisplayByCryptoName(cryptoName, publicKey) && 
    isSignatureDisplayByCryptoName(cryptoName, signature) && 
    (datetime === undefined || isDatetime(datetime))
  )
}

export const digest = async (rawOperation: RawOperation, datetime?: Datetime): Promise<Hash> => {
  const hash = await messageToHash(rawOperation)
  if (datetime === undefined) return hash
  const message = hash + String(datetime)
  return await messageToHash(message)
}

export const createUnsignedMessage = (operation: Operation): UnsignedMessage => {
  const raw = toRawOperation(operation)
  return { raw }
}

export const signMessage = async (message: UnsignedMessage, keyPair: KeyPair, datetime?: Datetime): Promise<Message> => {
  const { raw } = message
  const { cryptoName, publicKey, privateKey } = keyPair
  const publicKeyDisplay = displayPublicKeyByCryptoName(cryptoName, publicKey)
  const signature = await signByCryptoName(cryptoName, await digest(raw, datetime), privateKey)
  const signatureDisplay = displaySignatureByCryptoName(cryptoName, signature)
  return { raw, cryptoName, publicKey: publicKeyDisplay, signature: signatureDisplay, datetime }
}

export const signOperation = async (operation: Operation, keyPair: KeyPair, datetime?: Datetime): Promise<Message> => {
  if (await validateOperation(operation) === false) throw new Error("Invalid Operation")
  const unsignedMessage = createUnsignedMessage(operation)
  return await signMessage(unsignedMessage, keyPair, datetime)
}

export const signOperations = async (operations: Operation[], keyPair: KeyPair, datetime?: Datetime): Promise<Messages> => {
  const promises = operations.map(operation => signOperation(operation, keyPair, datetime))
  return await Promise.all(promises)
}

export const verifyMessage = async (message: Message): Promise<boolean> => {
  const { raw, cryptoName, publicKey: publicKeyDisplay, signature: signatureDisplay, datetime } = message
  const messageHash = await digest(raw, datetime)
  const publicKey = fromHex(publicKeyDisplay)
  const signature = fromHex(signatureDisplay)
  return verifyByCryptoName(cryptoName, messageHash, signature, publicKey)
}

export const isSignedByOwner = async (message: Message): Promise<boolean> => {
  if (await verifyMessage(message) === false) return false
  try {
    const operation = await parseRawOperation(message.raw)
    if (isOwnable(operation) === false) return false
    let primaryKey: PrimaryKey | undefined = undefined
    if (isNameKey(operation.id)) {
      [primaryKey] = parseNameKey(operation.id)
    } else if (isPrimaryKey(operation.id)) {
      primaryKey = operation.id
    } else if (isPublicKeyDisplay(operation.id)) {
      primaryKey = publicKeyToPrimaryKey(message.cryptoName, fromPublicKeyDisplay(operation.id))
    }
    if (primaryKey === undefined) return false
    const primaryKeySigner = publicKeyToPrimaryKey(message.cryptoName, fromPublicKeyDisplay(message.publicKey))
    return primaryKey === primaryKeySigner
  } catch {
    return false
  }
}
