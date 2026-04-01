import { isNameKey } from "@vanice/types"
import { isHash } from "@vanice/types"
import { isSubKeyDomain } from "./Identifier.ts"
import { isId } from "./Identity.ts"
import type { OperationWithoutHash, PreviousHashOperation, Operation, OperationType, SetOperation, GrantOperation, VouchOperation, RelateOperation, ValidateOperation } from "./Operation.ts"
import { createCreateOperation, createDeleteOperation, createDenounceOperation, createGrantOperation, createRelateOperation, createRevertOperation, createRevokeOperation, createSetOperation, createUnrelateOperation, createValidateOperation, createVouchOperation } from "./Operation.ts"
import isString from "./lib/utils/isString.ts"
import type { Flavor } from "./lib/utils/Flavor.ts"

export type RawOperation = Flavor<string, "RawOperation">

const delimiter = "\n"

const joinWithDelimiter = (parts: (string | undefined)[]): string => {
  return parts.filter(part => part !== undefined).join(delimiter)
}

const splitByDelimiter = (str: string): string[] => {
  return str.split(delimiter)
}

export const parseRawOperation = async (rawOperation: RawOperation): Promise<Operation> => {
  const [id, previousHash, operationTypeString, ...rest] = splitByDelimiter(rawOperation)
  if (isId(id) === false) {
    throw new Error("Invalid Operation: Invalid NameKey")
  }
  const operationType: OperationType | undefined = operationTypeString !== undefined ? parseInt(operationTypeString, 10) : undefined
  const body = rest.length > 0 ? rest.join(delimiter) : undefined
  if (previousHash === undefined) {
    return await createCreateOperation(id)
  }
  if (!isHash(previousHash)) {
    throw new Error("Invalid Operation: Invalid Hash")
  }
  if (operationType === 1) {
    return await createSetOperation(id, previousHash, body ?? "")
  }
  if (operationType === 2) {
    if (body !== undefined) {
      throw new Error("Invalid DELETE Operation: Unexpected body")
    }
    return await createDeleteOperation(id, previousHash)
  }
  if (operationType === 3) {
    if (body === undefined) {
      throw new Error("Invalid VALIDATE Operation: Missing body")
    }
    return await createValidateOperation(id, previousHash, body)
  }
  if (operationType === 4) {
    const [subKey, domain] = rest
    if (subKey === undefined || isNameKey(subKey) === false) {
      throw new Error("Invalid GRANT Operation: Missing / invalid SubKey")
    }
    if (domain !== undefined && isSubKeyDomain(domain) === false) {
      throw new Error("Invalid GRANT Operation: Invalid domain")
    }
    return await createGrantOperation(id, previousHash, subKey, domain)
  }
  if (operationType === 5) {
    return await createRevokeOperation(id, previousHash)
  }
  if (operationType === 6) {
    if (body === undefined || isNameKey(body) === false) {
      throw new Error("Invalid VOUCH Operation: Missing / invalid referent")
    }
    return await createVouchOperation(id, previousHash, body)
  }
  if (operationType === 7) {
    return await createDenounceOperation(id, previousHash)
  }
  if (operationType === 8) {  
    if (body === undefined || isId(body) === false) {
      throw new Error("Invalid RELATE Operation: Missing / invalid relationId")
    }
    return await createRelateOperation(id, previousHash, body)
  }
  if (operationType === 9) {  
    return await createUnrelateOperation(id, previousHash)
  }
  if (operationType === 10) {  
    return await createRevertOperation(id, previousHash)
  }
  throw new Error("Invalid Operation")
}

export const isRawOperation = async (value: unknown): Promise<boolean> => {
  if (isString(value) === false) return false
  try {
    await parseRawOperation(value)
    return true
  } catch {
    return false
  }
}

export const toRawOperation = (operation: OperationWithoutHash): RawOperation => {
  const { id, type } = operation
  if (type === "CREATE") {
    return id
  }
  const { previousHash } = operation as PreviousHashOperation
  if (type === "SET") {
    const { body } = operation as SetOperation
    return joinWithDelimiter([id, previousHash, "1", body])
  }
  if (type === "DELETE") {
    return joinWithDelimiter([id, previousHash, "2"])
  }
  if (type === "VALIDATE") {
    const { logic } = operation as ValidateOperation
    return joinWithDelimiter([id, previousHash, "3", logic])
  }
  if (type === "GRANT") {
    const { subKey, domain } = operation as GrantOperation
    const lines = [id, previousHash, "4", subKey, domain]
    return joinWithDelimiter(lines)
  }
  if (type === "REVOKE") {
    return joinWithDelimiter([id, previousHash, "5"])
  }
  if (type === "VOUCH") { 
    const { referent } = operation as VouchOperation
    return joinWithDelimiter([id, previousHash, "6", referent])
  }
  if (type === "DENOUNCE") {
    return joinWithDelimiter([id, previousHash, "7"])
  }
  if (type === "RELATE") {
    const { relationId } = operation as RelateOperation
    return joinWithDelimiter([id, previousHash, "8", relationId])
  }
  if (type === "UNRELATE") {
    return joinWithDelimiter([id, previousHash, "9"])
  }
  if (type === "REVERT") {
    return joinWithDelimiter([id, previousHash, "10"])
  }
  throw new Error("Invalid Operation type")
}
