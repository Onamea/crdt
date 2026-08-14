import { isHash, messageToHash } from "@onamea/types";
import { toRawOperation } from "./RawOperation.js";
import { isIdentityKey } from "./Identifier.js";
import { isId } from "./Identity.js";
import isObject from "./lib/utils/isObject.js";
import isString from "./lib/utils/isString.js";
export const operations = ["CREATE", "SET", "DELETE", "VALIDATE", "GRANT", "REVOKE", "VOUCH", "DENOUNCE", "RELATE", "UNRELATE", "REVERT"];
const isOperationName = (value) => {
    return isString(value) && operations.includes(value);
};
export const isOperation = (value) => {
    return (isObject(value) &&
        isHash(value.hash) &&
        isId(value.id) &&
        isOperationName(value.type));
};
export const isCreateOperation = (operation) => {
    return operation.type === "CREATE";
};
export const isSetOperation = (operation) => {
    return operation.type === "SET";
};
export const isDeleteOperation = (operation) => {
    return operation.type === "DELETE";
};
export const isValidateOperation = (operation) => {
    return operation.type === "VALIDATE";
};
export const isGrantOperation = (operation) => {
    return operation.type === "GRANT";
};
export const isRevokeOperation = (operation) => {
    return operation.type === "REVOKE";
};
export const isVouchOperation = (operation) => {
    return operation.type === "VOUCH";
};
export const isDenounceOperation = (operation) => {
    return operation.type === "DENOUNCE";
};
export const isRelateOperation = (operation) => {
    return operation.type === "RELATE";
};
export const isUnrelateOperation = (operation) => {
    return operation.type === "UNRELATE";
};
export const isRevertOperation = (operation) => {
    return operation.type === "REVERT";
};
export const isNonCreateOperation = (operation) => {
    return operation.type !== "CREATE";
};
export const isIdentityOperation = (operation) => {
    return ["GRANT", "REVOKE", "VOUCH", "DENOUNCE"].includes(operation.type);
};
export const hashOperation = async (operation) => {
    return await messageToHash(toRawOperation(operation));
};
export const createCreateOperation = async (id) => {
    const operation = { id, type: "CREATE" };
    const hash = await hashOperation(operation);
    return { hash, ...operation };
};
export const createSetOperation = async (id, previousHash, body) => {
    const operation = { id, previousHash, type: "SET", body };
    const hash = await hashOperation(operation);
    return { hash, ...operation };
};
export const createDeleteOperation = async (id, previousHash) => {
    const operation = { id, previousHash, type: "DELETE" };
    const hash = await hashOperation(operation);
    return { hash, ...operation };
};
export const createValidateOperation = async (id, previousHash, logic) => {
    const operation = { id, previousHash, type: "VALIDATE", logic };
    const hash = await hashOperation(operation);
    return { hash, ...operation };
};
export const createGrantOperation = async (id, previousHash, subKey, domain) => {
    const operation = { id, previousHash, type: "GRANT", subKey, domain };
    const hash = await hashOperation(operation);
    return { hash, ...operation };
};
export const createRevokeOperation = async (id, previousHash) => {
    const operation = { id, previousHash, type: "REVOKE" };
    const hash = await hashOperation(operation);
    return { hash, ...operation };
};
export const createVouchOperation = async (id, previousHash, referent) => {
    const operation = { id, previousHash, type: "VOUCH", referent };
    const hash = await hashOperation(operation);
    return { hash, ...operation };
};
export const createDenounceOperation = async (id, previousHash) => {
    const operation = { id, previousHash, type: "DENOUNCE" };
    const hash = await hashOperation(operation);
    return { hash, ...operation };
};
export const createRelateOperation = async (id, previousHash, relationId) => {
    const operation = { id, previousHash, type: "RELATE", relationId };
    const hash = await hashOperation(operation);
    return { hash, ...operation };
};
export const createUnrelateOperation = async (id, previousHash) => {
    const operation = { id, previousHash, type: "UNRELATE" };
    const hash = await hashOperation(operation);
    return { hash, ...operation };
};
export const createRevertOperation = async (id, previousHash) => {
    const operation = { id, previousHash, type: "REVERT" };
    const hash = await hashOperation(operation);
    return { hash, ...operation };
};
export const validateOperation = async (operation) => {
    if (isOperation(operation) === false)
        return false;
    const expectedHash = await hashOperation(operation);
    return operation.hash === expectedHash;
};
export const isOwnable = (operation) => {
    const { id } = operation;
    return isIdentityKey(id);
};
