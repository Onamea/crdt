import { primaryKeyToPublicKey } from "@onamea/types";
import { displayFingerprint, publicKeyToFingerprint } from "@onamea/types";
import { isOperation, isCreateOperation, isSetOperation, isDeleteOperation, isGrantOperation, isRevokeOperation, isVouchOperation, isDenounceOperation, isRelateOperation, isUnrelateOperation, isRevertOperation, isValidateOperation, createCreateOperation } from "./Operation.js";
import { parseNameKey } from "@onamea/types";
import { displayPublicKey } from "@onamea/types";
import isArray from "./lib/utils/isArray.js";
import toArray from "./lib/utils/toArray.js";
import { validate } from "./lib/validate.js";
import { buildOperationTree, flattenOperationTree, getPathToOperation } from "./lib/Tree.js";
export const areOperations = (value) => {
    return isArray(value) && value.every(isOperation);
};
const filterDuplicateOperations = (operations) => {
    return operations.filter((operation, index, self) => index === self.findIndex(({ hash }) => hash === operation.hash));
};
const filterOperationsById = (operations, id) => {
    return operations.filter(operation => operation.id === id);
};
const filterRevertedOperations = (operations) => {
    const revertOperationHashes = operations.filter(isRevertOperation).map(({ previousHash }) => previousHash);
    return operations.filter(operation => revertOperationHashes.includes(operation.hash) === false);
};
export const operationsIncludeOperation = (operations, hash) => {
    try {
        const { tree } = buildOperationTree(operations);
        const treeOperations = flattenOperationTree(tree);
        return treeOperations.some(operation => operation.hash === hash);
    }
    catch {
        return false;
    }
};
export const getLatestHashFromOperations = (operations, operationType = ["CREATE", "SET"]) => {
    const operationTypes = toArray(operationType);
    const { tree } = buildOperationTree(operations);
    const treeOperations = flattenOperationTree(tree);
    const nonRevertedOperations = filterRevertedOperations(treeOperations);
    const previousOperation = nonRevertedOperations.reverse().find(operation => {
        return operationTypes.includes(operation.type);
    });
    return previousOperation?.hash;
};
export const getPreviousHash = (operations, operationName, operationHash) => {
    const { tree } = buildOperationTree(operations);
    const treeOperations = flattenOperationTree(tree);
    const createOperation = treeOperations.find(isCreateOperation);
    switch (operationName) {
        case "SET":
        case "DELETE":
        case "VALIDATE":
            return getLatestHashFromOperations(operations, ["CREATE", "SET", "VALIDATE"]);
        case "GRANT":
        case "VOUCH":
        case "RELATE":
            return createOperation.hash;
        case "REVOKE":
        case "DENOUNCE":
        case "UNRELATE":
        case "REVERT": {
            if (operationHash === undefined) {
                throw new Error(`${operationName} operation requires operationHash parameter`);
            }
            const previousOperation = treeOperations.find(({ hash }) => hash === operationHash);
            if (previousOperation === undefined) {
                throw new Error(`Operation with hash ${operationHash} not found`);
            }
            if (operationName === "REVOKE" && isGrantOperation(previousOperation) === false) {
                throw new Error(`Operation with hash ${operationHash} is not a GRANT operation`);
            }
            if (operationName === "DENOUNCE" && isVouchOperation(previousOperation) === false) {
                throw new Error(`Operation with hash ${operationHash} is not a VOUCH operation`);
            }
            if (operationName === "UNRELATE" && isRelateOperation(previousOperation) === false) {
                throw new Error(`Operation with hash ${operationHash} is not a RELATE operation`);
            }
            return operationHash;
        }
        default:
            throw new Error(`Unknown operation name: ${operationName}`);
    }
};
const getValidateOperationsForSetOperation = (tree, setOperation) => {
    const path = getPathToOperation(tree, setOperation);
    const nonRevertedOperations = filterRevertedOperations(path);
    const validateOperations = nonRevertedOperations.filter(isValidateOperation);
    return validateOperations;
};
const getBodyFromTree = async (tree) => {
    const operations = flattenOperationTree(tree);
    const nonRevertedOperations = filterRevertedOperations(operations);
    const setOperations = nonRevertedOperations.filter(isSetOperation);
    const validSetOperations = [];
    for (const setOperation of setOperations) {
        const validateOperations = getValidateOperationsForSetOperation(tree, setOperation);
        const results = await Promise.all(validateOperations.map(validateOperation => validate(setOperation.body, validateOperation.logic)));
        if (results.every(isValid => isValid === true)) {
            validSetOperations.push(setOperation);
        }
    }
    const setOperation = validSetOperations[validSetOperations.length - 1];
    if (setOperation === undefined)
        return undefined;
    return setOperation.body;
};
const getTombstoneFromTree = (tree) => {
    const operations = flattenOperationTree(tree);
    const nonRevertedOperations = filterRevertedOperations(operations);
    const deleteOperation = nonRevertedOperations.find(isDeleteOperation);
    return deleteOperation !== undefined;
};
const getRelationsFromTree = (tree) => {
    const operations = flattenOperationTree(tree);
    const nonRevertedOperations = filterRevertedOperations(operations);
    const relateOperations = nonRevertedOperations.filter(isRelateOperation);
    const unrelateOperations = nonRevertedOperations.filter(isUnrelateOperation);
    const nonUnrelatedRelateOperations = relateOperations.filter(operation => {
        return unrelateOperations.some(({ previousHash }) => previousHash === operation.hash) === false;
    });
    return nonUnrelatedRelateOperations.map(({ relationId }) => relationId);
};
const getSubKeysFromTree = (tree) => {
    const operations = flattenOperationTree(tree);
    const nonRevertedOperations = filterRevertedOperations(operations);
    const grantOperations = nonRevertedOperations.filter(isGrantOperation);
    const revokeOperations = nonRevertedOperations.filter(isRevokeOperation);
    const unrevokedGrantOperations = grantOperations.filter(operation => {
        return revokeOperations.some(({ previousHash }) => previousHash === operation.hash) === false;
    });
    return unrevokedGrantOperations.map(({ subKey, domain }) => ({ subKey, domain }));
};
const getReferentsFromTree = (tree) => {
    const operations = flattenOperationTree(tree);
    const nonRevertedOperations = filterRevertedOperations(operations);
    const vouchOperations = nonRevertedOperations.filter(isVouchOperation);
    const denounceOperations = nonRevertedOperations.filter(isDenounceOperation);
    const nonDenouncedVouchOperations = vouchOperations.filter(operation => {
        return denounceOperations.some(({ previousHash }) => previousHash === operation.hash) === false;
    });
    return nonDenouncedVouchOperations.map(({ referent }) => referent);
};
export const buildItemFromId = async (id) => {
    const createOperation = await createCreateOperation(id);
    return await buildItemFromOperations([createOperation], id);
};
const buildItemsFromRelationIds = async (operations, relationIds) => {
    return await Promise.all(relationIds.map(async (relationId) => {
        try {
            return await buildItemFromOperations(operations, relationId, true);
        }
        catch (_) {
            return await buildItemFromId(relationId);
        }
    }));
};
export const buildItemFromOperations = async (operations, id, buildRelations = false) => {
    const uniqueOperations = filterDuplicateOperations(operations);
    const itemOperations = filterOperationsById(uniqueOperations, id);
    const { tree } = buildOperationTree(itemOperations);
    const body = await getBodyFromTree(tree);
    const tombstone = getTombstoneFromTree(tree);
    const relationIds = buildRelations ? getRelationsFromTree(tree) : [];
    const relations = relationIds.length > 0 ? await buildItemsFromRelationIds(uniqueOperations, relationIds) : undefined;
    return { id, body, tombstone, operations: itemOperations, relations };
};
export const buildIdentityFromOperations = async (operations, id, buildRelations = false) => {
    const uniqueOperations = filterDuplicateOperations(operations);
    const identityOperations = filterOperationsById(uniqueOperations, id);
    const item = await buildItemFromOperations(operations, id, buildRelations);
    const { tree } = buildOperationTree(identityOperations);
    /*
    const { tree, leftover } = buildOperationTree(identityOperations)
    if (leftoverOperations.length > 0) {
      console.warn("Leftover operations after building operation tree:", leftoverOperations)
    }
    */
    const [primaryKey, name] = parseNameKey(id);
    const publicKey = primaryKeyToPublicKey(primaryKey);
    const fingerprint = await publicKeyToFingerprint(publicKey);
    const publicKeyDisplay = displayPublicKey(publicKey);
    const fingerprintDisplay = displayFingerprint(fingerprint);
    const subKeys = getSubKeysFromTree(tree);
    const referents = getReferentsFromTree(tree);
    return {
        ...item,
        id,
        primaryKey,
        name,
        fingerprintDisplay,
        publicKeyDisplay,
        subKeys,
        referents,
        operations
    };
};
//export const operationsFromId = (operations: Operations): boolean => { return false }
//export const isContinuous = (operations: Operations): boolean => { return false }
//export const hasConflicts = (operations: Operations): boolean => { return false }
//export const containsCycles = (operations: Operations): boolean => { return false}
