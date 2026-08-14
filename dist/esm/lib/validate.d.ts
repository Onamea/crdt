import type { Identity } from "../Identity.js";
import type { ValidateOperation } from "../Operation.js";
export declare const validate: (body: Exclude<Identity["body"], undefined>, logic: ValidateOperation["logic"]) => Promise<boolean>;
