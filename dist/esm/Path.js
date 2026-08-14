import { isIdentifier } from "./Identifier.js";
import { displayFingerprint, fingerprintToUint8Array, fromFingerprintDisplay, idToFingerprint, isFingerprintDisplay, publicKeyToFingerprint, uint8ArrayToFingerprint } from "@onamea/types";
import findLastUnescaped from "./lib/utils/findLastUnescaped.js";
import splitUnescaped from "./lib/utils/splitUnescaped.js";
import { isNameKey, nameKeyToFingerprint } from "@onamea/types";
import { isPrimaryKey, primaryKeyToFingerprint } from "@onamea/types";
import { isPublicKeyDisplay } from "@onamea/types";
import { fromPublicKeyDisplay } from "@onamea/types";
const elementTypes = {
    IDENTITY: "@",
    SUBKEY: "$",
    REFERENT: ">",
    ITEM: undefined
};
export const isElementPrefix = (value) => {
    return Object.values(elementTypes).includes(value);
};
export const getElementTypeByElementPrefix = (prefix) => {
    const elementType = Object.entries(elementTypes).find(([, value]) => value === prefix)?.[0];
    return elementType;
};
export const stringifyPathElement = (element) => {
    const prefix = elementTypes[element.type];
    return prefix !== undefined ? `${prefix}${element.id}` : element.id;
};
export const buildPathFromElements = (elements) => {
    return elements.map(element => stringifyPathElement(element)).join("/");
};
export const parsePathElement = (pathElement) => {
    const length = pathElement.length;
    if (length === 0) {
        throw new Error("Invalid Path Element: empty string");
    }
    if (length === 1) {
        return { id: pathElement, type: "ITEM" };
    }
    const firstChar = pathElement[0];
    if (isElementPrefix(firstChar)) {
        const elementType = getElementTypeByElementPrefix(firstChar);
        const id = pathElement.slice(1).replace("\\#", "#");
        return { id, type: elementType };
    }
    else {
        const isEscaped = firstChar === "\\" && isElementPrefix(pathElement[1]);
        const id = (isEscaped ? pathElement.slice(1) : pathElement).replace("\\#", "#");
        return { id, type: "ITEM" };
    }
};
export const pathElementFromIdentityKey = async (id, type = "IDENTITY") => {
    if (isNameKey(id)) {
        const fingerprint = displayFingerprint(await nameKeyToFingerprint(id));
        return { id, type, fingerprint };
    }
    else if (isPrimaryKey(id)) {
        const fingerprint = displayFingerprint(await primaryKeyToFingerprint(id));
        return { id, type, fingerprint };
    }
    else if (isPublicKeyDisplay(id)) {
        const fingerprint = displayFingerprint(await publicKeyToFingerprint(fromPublicKeyDisplay(id)));
        return { id, type, fingerprint };
    }
    return { id, type };
};
export const parsePath = (path) => {
    const hashIndex = findLastUnescaped(path, "#");
    const fingerprint = hashIndex > -1 ? path.slice(hashIndex + 1) : undefined;
    if (fingerprint !== undefined && isFingerprintDisplay(fingerprint) === false) {
        throw new Error(`Invalid Fingerprint Display in Path: ${path}`);
    }
    const leftover = hashIndex > -1 ? path.slice(0, hashIndex) : path;
    const elements = splitUnescaped(leftover, "/").map(pathElement => parsePathElement(pathElement));
    return { elements, fingerprint };
};
export const parseAmbiguousPath = (pathStringified) => {
    const path = parsePath(pathStringified);
    if (path.elements[0]?.type === "ITEM" && isIdentifier(path.elements[0]?.id)) {
        path.elements[0].type = "IDENTITY";
        if (path.elements[1]?.type === "ITEM" && isIdentifier(path.elements[1]?.id)) {
            path.elements[1].type = "SUBKEY";
        }
    }
    return path;
};
export const isPathStringified = (value) => {
    if (typeof value !== "string")
        return false;
    try {
        parsePath(value);
        return true;
    }
    catch {
        return false;
    }
};
export const pathToFingerprintDisplay = async (path) => {
    const pathWithFingerprints = await Promise.all(path.elements.map(async (element) => {
        if (element.type === "ITEM" && element.fingerprint === undefined) {
            const fingerprint = displayFingerprint(await idToFingerprint(element.id));
            return { ...element, fingerprint };
        }
        return element;
    }));
    if (pathWithFingerprints.some(element => element.fingerprint === undefined)) {
        throw new Error("Cannot get FingerprintDisplay of Path: missing fingerprint for some elements");
    }
    const fingerprints = pathWithFingerprints.map(element => fromFingerprintDisplay(element.fingerprint));
    const uint8Arrays = fingerprints.map(fingerprint => fingerprintToUint8Array(fingerprint));
    const concatenated = new Uint8Array(await new Blob(uint8Arrays).arrayBuffer());
    const fingerprint = await uint8ArrayToFingerprint(concatenated);
    return displayFingerprint(fingerprint);
};
