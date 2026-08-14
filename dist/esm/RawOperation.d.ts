import type { OperationWithoutHash, Operation } from "./Operation.js";
import type { Flavor } from "./lib/utils/Flavor.js";
export type RawOperation = Flavor<string, "RawOperation">;
export declare const parseRawOperation: (rawOperation: RawOperation) => Promise<Operation>;
export declare const isRawOperation: (value: unknown) => Promise<boolean>;
export declare const toRawOperation: (operation: OperationWithoutHash) => RawOperation;
