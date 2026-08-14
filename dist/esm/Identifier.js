import isArray from "./lib/utils/isArray.js";
import isString from "./lib/utils/isString.js";
import isObject from "./lib/utils/isObject.js";
import { isNameKey, isPrimaryKey, isPublicKeyDisplayByCryptoName, isFingerprintedName, parseNameKey, primaryKeyToFingerprintedName, publicKeyToPrimaryKey, isPublicKeyDisplay, fromPublicKeyDisplay } from "@onamea/types";
export const isIdentityKey = (value) => {
    return (isNameKey(value) ||
        isPrimaryKey(value) ||
        isPublicKeyDisplayByCryptoName("Ed25519", value) ||
        isPublicKeyDisplayByCryptoName("ECDSA", value) ||
        isPublicKeyDisplayByCryptoName("Schnorr", value));
};
export const areIdentityKeys = (values) => {
    return isArray(values) && values.every(isIdentityKey);
};
export const isIdentityKeyDomain = (value) => {
    return isString(value) && value.trim().length > 0;
};
export const isSubKeyDomain = (value) => {
    return isString(value) && value.trim().length > 0;
};
export const isSubKey = (value) => {
    if (isObject(value) === false)
        return false;
    const { subKey, domain } = value;
    return (isNameKey(subKey) &&
        (domain === undefined || isIdentityKeyDomain(domain)));
};
export const areSubKeys = (values) => {
    return isArray(values) && values.every(isSubKey);
};
export const isIdentifier = (value) => {
    return isIdentityKey(value) || isFingerprintedName(value);
};
export const identifierToFingerprintedName = async (identifier, name, cryptoName) => {
    if (isFingerprintedName(identifier))
        return identifier;
    if (isNameKey(identifier)) {
        const [primaryKey, name] = parseNameKey(identifier);
        const [fingerprintedName] = await primaryKeyToFingerprintedName(primaryKey, name);
        return fingerprintedName;
    }
    if (isPrimaryKey(identifier) && name !== undefined) {
        const [fingerprintedName] = await primaryKeyToFingerprintedName(identifier, name);
        return fingerprintedName;
    }
    if (isPublicKeyDisplay(identifier) && name !== undefined && cryptoName !== undefined) {
        const primaryKey = publicKeyToPrimaryKey(cryptoName, fromPublicKeyDisplay(identifier));
        const [fingerprintedName] = await primaryKeyToFingerprintedName(primaryKey, name);
        return fingerprintedName;
    }
    throw new Error("Cannot convert Identifier to FingerprintedName: missing name and/or cryptoName for non-NameKey identifier");
};
