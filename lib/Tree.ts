import type { Hash } from "@vanice/types"
import {
  type Operation,
  type NonCreateOperation,
  isCreateOperation,
} from "../Operation.ts"

export type Tree<T> = [T, Tree<T>[]]
type Operations = Operation[]
export type OperationTree = Tree<Operation>

const splitOperations = (operations: Operations, predicate: (operation: Operation) => boolean): [Operations, Operations] => {
  const matching: Operations = []
  const nonMatching: Operations = []
  operations.forEach(operation => {
    if (predicate(operation)) {
      matching.push(operation)
    } else {
      nonMatching.push(operation)
    }
  })
  return [matching, nonMatching]
}

export const buildOperationTree = (operations: Operations): { tree: OperationTree, leftOver: Operations } => {

  const [createOperations, nonCreateOperations] = splitOperations(operations, isCreateOperation)
  if (createOperations.length === 0) {
    throw new Error("No CREATE operation")
  }
  if (createOperations.length > 1) {
    throw new Error("Multiple CREATE operations")
  }
  const createOperation = createOperations[0]!

  const seenHashes = new Set<Hash>()
  const childrenByParentHash = new Map<Hash, Operations>()
  for (const operation of nonCreateOperations as NonCreateOperation[]) {
    if (seenHashes.has(operation.hash)) continue
    seenHashes.add(operation.hash)
    const key = operation.previousHash
    const siblings = childrenByParentHash.get(key)
    if (siblings !== undefined) {
      siblings.push(operation)
    } else {
      childrenByParentHash.set(key, [operation])
    }
  }

  const visited = new Set<Hash>()

  const buildTree = (parentOperation: Operation): OperationTree => {
    visited.add(parentOperation.hash)
    const children = (childrenByParentHash.get(parentOperation.hash) ?? [])
      // Sort children by hash to ensure deterministic builds
      .sort((a, b) => a.hash.localeCompare(b.hash))
    return [parentOperation, children.map(buildTree)]
  }

  const tree = buildTree(createOperation)
  const leftOver = nonCreateOperations.filter(operation => visited.has(operation.hash) === false)

  return { tree, leftOver }
}

export const flattenOperationTree = (operationTree: OperationTree): Operations => {
  const result: Operations = []
  const stack: OperationTree[] = [operationTree]
  while (stack.length > 0) {
    const [operation, childTrees] = stack.pop()!
    result.push(operation)
    for (let i = childTrees.length - 1; i >= 0; i--) {
      stack.push(childTrees[i]!)
    }
  }
  return result
}

export const getPathToOperation = (tree: OperationTree, operation: Operation): Operations => {
  const operations = flattenOperationTree(tree)
  const operationByHash = new Map(operations.map(operation => [operation.hash, operation]))
  if (operationByHash.has(operation.hash) === false) {
    throw new Error("Operation not found in tree")
  }
  const path: Operations = [operation]
  let last = operation
  while (last.type !== "CREATE") {
    const parentOperation = operationByHash.get((last as NonCreateOperation).previousHash)
    if (parentOperation === undefined) {
      throw new Error("Could not get path to operation")
    }
    path.push(parentOperation)
    last = parentOperation
  }
  return path.reverse()
}
