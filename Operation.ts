import { type Hash, isHash, messageToHash } from "@vanice/types"
import { toRawOperation } from "./RawOperation.ts"
import { type IdentityKey, type IdentityKeyDomain, type Id, type Body, isId, isIdentityKey } from "./Identity.ts"
import isObject from "./lib/utils/isObject.ts"
import isString from "./lib/utils/isString.ts"

export const operations = ["CREATE", "SET", "DELETE", "VALIDATE", "GRANT", "REVOKE", "VOUCH", "DENOUNCE", "RELATE", "UNRELATE", "REVERT"] as const 
export type OperationType = keyof typeof operations
export type OperationName = (typeof operations)[number]

export type AbstractOperation = {
  hash: Hash
  id: Id
  type: OperationName
}
export type PreviousHashOperation = AbstractOperation & {
  previousHash: Hash
}
export type CreateOperation = AbstractOperation & {
  type: "CREATE"
}
export type SetOperation = PreviousHashOperation & {
  type: "SET"
  body: Exclude<Body, undefined>
}
export type ValidateOperation = PreviousHashOperation & {
  type: "VALIDATE"
  logic: string
}
export type DeleteOperation = PreviousHashOperation & {
  type: "DELETE"
}
export type GrantOperation = PreviousHashOperation & {
  type: "GRANT"
  subKey: IdentityKey
  domain?: IdentityKeyDomain
}
export type RevokeOperation = PreviousHashOperation & {
  type: "REVOKE"
}
export type VouchOperation = PreviousHashOperation & {  
  type: "VOUCH"
  referent: IdentityKey
}
export type DenounceOperation = PreviousHashOperation & {  
  type: "DENOUNCE"
}
export type RelateOperation = PreviousHashOperation & {  
  type: "RELATE"
  relationId: Id
}
export type UnrelateOperation = PreviousHashOperation & {  
  type: "UNRELATE"
}
export type RevertOperation = PreviousHashOperation & {  
  type: "REVERT"
}

export type Operation = 
  CreateOperation | 
  SetOperation | 
  DeleteOperation | 
  ValidateOperation |
  GrantOperation | 
  RevokeOperation | 
  VouchOperation | 
  DenounceOperation | 
  RelateOperation | 
  UnrelateOperation |
  RevertOperation
export type OperationWithoutHash = Omit<Operation, "hash">
export type Operations = Operation[]
export type NonCreateOperation = Exclude<Operation, CreateOperation>
export type IdentityOperation = GrantOperation | RevokeOperation | VouchOperation | DenounceOperation

const isOperationName = (value: unknown): value is OperationName => {
  return isString(value) && operations.includes(value as OperationName)
}

export const isOperation = (value: unknown): value is Operation => {
  return (
    isObject(value) && 
    isHash(value.hash) && 
    isId(value.id)&& 
    isOperationName(value.type)
  )
}

export const isCreateOperation = (operation: Operation): operation is CreateOperation => {
  return operation.type === "CREATE"
}

export const isSetOperation = (operation: Operation): operation is SetOperation => {
  return operation.type === "SET"
}

export const isDeleteOperation = (operation: Operation): operation is DeleteOperation => {
  return operation.type === "DELETE"
}

export const isValidateOperation = (operation: Operation): operation is ValidateOperation => {
  return operation.type === "VALIDATE"
}

export const isGrantOperation = (operation: Operation): operation is GrantOperation => {
  return operation.type === "GRANT"
}

export const isRevokeOperation = (operation: Operation): operation is RevokeOperation => {
  return operation.type === "REVOKE"
}

export const isVouchOperation = (operation: Operation): operation is VouchOperation => {
  return operation.type === "VOUCH"
}

export const isDenounceOperation = (operation: Operation): operation is DenounceOperation => {
  return operation.type === "DENOUNCE"
}

export const isRelateOperation = (operation: Operation): operation is RelateOperation => {
  return operation.type === "RELATE"
}

export const isUnrelateOperation = (operation: Operation): operation is UnrelateOperation => {
  return operation.type === "UNRELATE"
}

export const isRevertOperation = (operation: Operation): operation is RevertOperation => {
  return operation.type === "REVERT"
}

export const isNonCreateOperation = (operation: Operation): operation is NonCreateOperation => {
  return operation.type !== "CREATE"
}

export const isIdentityOperation = (operation: Operation): operation is IdentityOperation => {
  return ["GRANT", "REVOKE", "VOUCH", "DENOUNCE"].includes(operation.type)
}

export const hashOperation = async (operation: OperationWithoutHash): Promise<Hash> => {
  return await messageToHash(toRawOperation(operation))
}

export const createCreateOperation = async (id: Id): Promise<CreateOperation> => {
  const operation = { id, type: "CREATE" } as const
  const hash = await hashOperation(operation)
  return { hash, ...operation } 
}

export const createSetOperation = async (id: Id, previousHash: Hash, body: Exclude<Body, undefined>): Promise<SetOperation> => {
  const operation = { id, previousHash, type: "SET", body } as const
  const hash = await hashOperation(operation)
  return { hash, ...operation }
}

export const createDeleteOperation = async (id: Id, previousHash: Hash): Promise<DeleteOperation> => {
  const operation = { id, previousHash, type: "DELETE" } as const
  const hash = await hashOperation(operation)
  return { hash, ...operation }
}

export const createValidateOperation = async (id: Id, previousHash: Hash, logic: string): Promise<ValidateOperation> => {
  const operation = { id, previousHash, type: "VALIDATE", logic } as const
  const hash = await hashOperation(operation)
  return { hash, ...operation }
}

export const createGrantOperation = async (id: Id, previousHash: Hash, subKey: IdentityKey, domain?: IdentityKeyDomain): Promise<GrantOperation> => {
  const operation = { id, previousHash, type: "GRANT", subKey, domain } as const
  const hash = await hashOperation(operation)
  return { hash, ...operation }
}

export const createRevokeOperation = async (id: Id, previousHash: Hash): Promise<RevokeOperation> => {
  const operation = { id, previousHash, type: "REVOKE" } as const
  const hash = await hashOperation(operation)
  return { hash, ...operation }
}

export const createVouchOperation = async (id: Id, previousHash: Hash, referent: IdentityKey): Promise<VouchOperation> => {
  const operation = { id, previousHash, type: "VOUCH", referent } as const
  const hash = await hashOperation(operation)
  return { hash, ...operation }
}

export const createDenounceOperation = async (id: Id, previousHash: Hash): Promise<DenounceOperation> => {
  const operation = { id, previousHash, type: "DENOUNCE" } as const
  const hash = await hashOperation(operation)
  return { hash, ...operation }
}

export const createRelateOperation = async (id: Id, previousHash: Hash, relationId: Id): Promise<RelateOperation> => {
  const operation = { id, previousHash, type: "RELATE", relationId } as const
  const hash = await hashOperation(operation)
  return { hash, ...operation }
}

export const createUnrelateOperation = async (id: Id, previousHash: Hash): Promise<UnrelateOperation> => {
  const operation = { id, previousHash, type: "UNRELATE" } as const
  const hash = await hashOperation(operation)
  return { hash, ...operation }
}

export const createRevertOperation = async (id: Id, previousHash: Hash): Promise<RevertOperation> => {
  const operation = { id, previousHash, type: "REVERT" } as const
  const hash = await hashOperation(operation)
  return { hash, ...operation }
}

export const isOwnable = (operation: Operation): boolean => {
  const { id } = operation
  return isIdentityKey(id)
}
