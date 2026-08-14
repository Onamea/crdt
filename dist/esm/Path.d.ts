import { type IdentityKey } from "./Identifier.js";
import type { Id } from "./Identity.js";
import { type FingerprintDisplay } from "@onamea/types";
import type { Flavor } from "./lib/utils/Flavor.js";
declare const elementTypes: {
    readonly IDENTITY: "@";
    readonly SUBKEY: "$";
    readonly REFERENT: ">";
    readonly ITEM: undefined;
};
type ElementType = keyof typeof elementTypes;
export type PathStringified = Flavor<string, "PathStringified">;
type ElementPrefix = Exclude<typeof elementTypes[ElementType], undefined>;
type PathElement = {
    id: Id;
    type: ElementType;
    fingerprint?: FingerprintDisplay;
};
type PathElements = PathElement[];
type PathElementStringified = `${ElementPrefix}${Id}` | Id;
export type Path = {
    elements: PathElement[];
    fingerprint?: FingerprintDisplay;
};
export declare const isElementPrefix: (value: unknown) => value is ElementPrefix;
export declare const getElementTypeByElementPrefix: (prefix: ElementPrefix | undefined) => ElementType;
export declare const stringifyPathElement: (element: PathElement) => PathElementStringified;
export declare const buildPathFromElements: (elements: PathElements) => PathStringified;
export declare const parsePathElement: (pathElement: string) => PathElement;
export declare const pathElementFromIdentityKey: (id: IdentityKey, type?: Exclude<ElementType, "ITEM" | "REFERENT">) => Promise<PathElement>;
export declare const parsePath: (path: PathStringified) => Path;
export declare const parseAmbiguousPath: (pathStringified: PathStringified) => Path;
export declare const isPathStringified: (value: unknown) => value is PathStringified;
export declare const pathToFingerprintDisplay: (path: Path) => Promise<FingerprintDisplay>;
export {};
