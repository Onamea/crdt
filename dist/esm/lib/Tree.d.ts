import { type Operation } from "../Operation.js";
export type Tree<T> = [T, Tree<T>[]];
type Operations = Operation[];
export type OperationTree = Tree<Operation>;
export declare const buildOperationTree: (operations: Operations) => {
    tree: OperationTree;
    leftOver: Operations;
};
export declare const flattenOperationTree: (operationTree: OperationTree) => Operations;
export declare const getPathToOperation: (tree: OperationTree, operation: Operation) => Operations;
export {};
