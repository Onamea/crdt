import { type Hash, type NameKey } from "@onamea/types";
import { type SubKeyDomain } from "./Identifier.js";
import { type Id, type Body } from "./Identity.js";
export declare const operations: readonly ["CREATE", "SET", "DELETE", "VALIDATE", "GRANT", "REVOKE", "VOUCH", "DENOUNCE", "RELATE", "UNRELATE", "REVERT"];
export type OperationType = keyof typeof operations;
export type OperationName = (typeof operations)[number];
export type AbstractOperation = {
    hash: Hash;
    id: Id;
    type: OperationName;
};
export type PreviousHashOperation = AbstractOperation & {
    previousHash: Hash;
};
export type CreateOperation = AbstractOperation & {
    type: "CREATE";
};
export type SetOperation = PreviousHashOperation & {
    type: "SET";
    body: Exclude<Body, undefined>;
};
export type ValidateOperation = PreviousHashOperation & {
    type: "VALIDATE";
    logic: string;
};
export type DeleteOperation = PreviousHashOperation & {
    type: "DELETE";
};
export type GrantOperation = PreviousHashOperation & {
    type: "GRANT";
    subKey: NameKey;
    domain?: SubKeyDomain;
};
export type RevokeOperation = PreviousHashOperation & {
    type: "REVOKE";
};
export type VouchOperation = PreviousHashOperation & {
    type: "VOUCH";
    referent: NameKey;
};
export type DenounceOperation = PreviousHashOperation & {
    type: "DENOUNCE";
};
export type RelateOperation = PreviousHashOperation & {
    type: "RELATE";
    relationId: Id;
};
export type UnrelateOperation = PreviousHashOperation & {
    type: "UNRELATE";
};
export type RevertOperation = PreviousHashOperation & {
    type: "REVERT";
};
export type Operation = CreateOperation | SetOperation | DeleteOperation | ValidateOperation | GrantOperation | RevokeOperation | VouchOperation | DenounceOperation | RelateOperation | UnrelateOperation | RevertOperation;
export type OperationWithoutHash = Omit<Operation, "hash">;
export type Operations = Operation[];
export type NonCreateOperation = Exclude<Operation, CreateOperation>;
export type IdentityOperation = GrantOperation | RevokeOperation | VouchOperation | DenounceOperation;
export declare const isOperation: (value: unknown) => value is Operation;
export declare const isCreateOperation: (operation: Operation) => operation is CreateOperation;
export declare const isSetOperation: (operation: Operation) => operation is SetOperation;
export declare const isDeleteOperation: (operation: Operation) => operation is DeleteOperation;
export declare const isValidateOperation: (operation: Operation) => operation is ValidateOperation;
export declare const isGrantOperation: (operation: Operation) => operation is GrantOperation;
export declare const isRevokeOperation: (operation: Operation) => operation is RevokeOperation;
export declare const isVouchOperation: (operation: Operation) => operation is VouchOperation;
export declare const isDenounceOperation: (operation: Operation) => operation is DenounceOperation;
export declare const isRelateOperation: (operation: Operation) => operation is RelateOperation;
export declare const isUnrelateOperation: (operation: Operation) => operation is UnrelateOperation;
export declare const isRevertOperation: (operation: Operation) => operation is RevertOperation;
export declare const isNonCreateOperation: (operation: Operation) => operation is NonCreateOperation;
export declare const isIdentityOperation: (operation: Operation) => operation is IdentityOperation;
export declare const hashOperation: (operation: OperationWithoutHash) => Promise<Hash>;
export declare const createCreateOperation: (id: Id) => Promise<CreateOperation>;
export declare const createSetOperation: (id: Id, previousHash: Hash, body: Exclude<Body, undefined>) => Promise<SetOperation>;
export declare const createDeleteOperation: (id: Id, previousHash: Hash) => Promise<DeleteOperation>;
export declare const createValidateOperation: (id: Id, previousHash: Hash, logic: string) => Promise<ValidateOperation>;
export declare const createGrantOperation: (id: Id, previousHash: Hash, subKey: NameKey, domain?: SubKeyDomain) => Promise<GrantOperation>;
export declare const createRevokeOperation: (id: Id, previousHash: Hash) => Promise<RevokeOperation>;
export declare const createVouchOperation: (id: Id, previousHash: Hash, referent: NameKey) => Promise<VouchOperation>;
export declare const createDenounceOperation: (id: Id, previousHash: Hash) => Promise<DenounceOperation>;
export declare const createRelateOperation: (id: Id, previousHash: Hash, relationId: Id) => Promise<RelateOperation>;
export declare const createUnrelateOperation: (id: Id, previousHash: Hash) => Promise<UnrelateOperation>;
export declare const createRevertOperation: (id: Id, previousHash: Hash) => Promise<RevertOperation>;
export declare const validateOperation: (operation: Operation) => Promise<boolean>;
export declare const isOwnable: (operation: Operation) => boolean;
