import { isCreateOperation, } from "../Operation.js";
const splitOperations = (operations, predicate) => {
    const matching = [];
    const nonMatching = [];
    operations.forEach(operation => {
        if (predicate(operation)) {
            matching.push(operation);
        }
        else {
            nonMatching.push(operation);
        }
    });
    return [matching, nonMatching];
};
export const buildOperationTree = (operations) => {
    const [createOperations, nonCreateOperations] = splitOperations(operations, isCreateOperation);
    if (createOperations.length === 0) {
        throw new Error("No CREATE operation");
    }
    if (createOperations.length > 1) {
        throw new Error("Multiple CREATE operations");
    }
    const createOperation = createOperations[0];
    const seenHashes = new Set();
    const childrenByParentHash = new Map();
    for (const operation of nonCreateOperations) {
        if (seenHashes.has(operation.hash))
            continue;
        seenHashes.add(operation.hash);
        const key = operation.previousHash;
        const siblings = childrenByParentHash.get(key);
        if (siblings !== undefined) {
            siblings.push(operation);
        }
        else {
            childrenByParentHash.set(key, [operation]);
        }
    }
    const visited = new Set();
    const buildTree = (parentOperation) => {
        visited.add(parentOperation.hash);
        const children = (childrenByParentHash.get(parentOperation.hash) ?? [])
            // Sort children by hash to ensure deterministic builds
            .sort((a, b) => a.hash.localeCompare(b.hash));
        return [parentOperation, children.map(buildTree)];
    };
    const tree = buildTree(createOperation);
    const leftOver = nonCreateOperations.filter(operation => visited.has(operation.hash) === false);
    return { tree, leftOver };
};
export const flattenOperationTree = (operationTree) => {
    const result = [];
    const queue = [operationTree];
    while (queue.length > 0) {
        const [operation, childTrees] = queue.shift();
        result.push(operation);
        for (let i = 0; i < childTrees.length; i++) {
            queue.push(childTrees[i]);
        }
    }
    return result;
};
export const getPathToOperation = (tree, operation) => {
    const operations = flattenOperationTree(tree);
    const operationByHash = new Map(operations.map(operation => [operation.hash, operation]));
    if (operationByHash.has(operation.hash) === false) {
        throw new Error("Operation not found in tree");
    }
    const path = [operation];
    let last = operation;
    while (last.type !== "CREATE") {
        const parentOperation = operationByHash.get(last.previousHash);
        if (parentOperation === undefined) {
            throw new Error("Could not get path to operation");
        }
        path.push(parentOperation);
        last = parentOperation;
    }
    return path.reverse();
};
