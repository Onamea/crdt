import { isPrimaryKey, readCryptoNameFromPrimaryKey, isFingerprintedName, isName, isNameKey, toNameKey, parseNameKey, isFingerprintDisplay, parseFingerprintedName, fingerprintedNameBelongsToPrimaryKey, isPublicKeyDisplayByCryptoName, keyPairFromMnemonic, keyPairFromPrivateKey, publicKeyToPrimaryKey, displayKeyPair, cryptoNames, fromHex, isMnemonicDisplayWithPassphrase, fromMnemonicDisplayWithPassphrase, isMnemonicDisplay } from "@onamea/types";
import { areOperations, buildItemFromOperations, buildIdentityFromOperations } from "./Operations.js";
import { isMessage } from "./Message.js";
import { isPathStringified, parseAmbiguousPath } from "./Path.js";
import isObject from "./lib/utils/isObject.js";
import isArray from "./lib/utils/isArray.js";
import isString from "./lib/utils/isString.js";
import isBoolean from "./lib/utils/isBoolean.js";
import { toRawOperation } from "./RawOperation.js";
import { areIdentityKeys, areSubKeys } from "./Identifier.js";
export const isId = (value) => {
    return isString(value) && value.trim().length > 0;
};
export const areIds = (values) => {
    return isArray(values) && values.every(isId);
};
export const isBody = (value) => {
    return value === undefined || isString(value);
};
export const isItem = (value) => {
    if (isObject(value) === false)
        return false;
    const { id, body, tombstone, operations, relations } = value;
    return (isId(id) &&
        isBody(body) &&
        isBoolean(tombstone) &&
        areOperations(operations) &&
        (relations === undefined || (Array.isArray(relations) && relations.every(isItem))));
};
export const validateItem = async (item) => {
    const buildItem = await buildItemFromOperations(item.operations, item.id);
    return (item.id === buildItem.id &&
        item.body === buildItem.body &&
        item.tombstone === buildItem.tombstone);
};
export const isIdentity = (value) => {
    if (isObject(value) === false)
        return false;
    if (isItem(value) === false)
        return false;
    const { id, primaryKey, name, fingerprintDisplay, publicKeyDisplay, subKeys, referents } = value;
    if (isPrimaryKey(primaryKey) === false)
        return false;
    const cryptoName = readCryptoNameFromPrimaryKey(primaryKey);
    return (isNameKey(id) &&
        isName(name) &&
        isFingerprintDisplay(fingerprintDisplay) &&
        isPublicKeyDisplayByCryptoName(cryptoName, publicKeyDisplay) &&
        areSubKeys(subKeys) &&
        (referents === undefined || areIdentityKeys(referents)));
};
export const validateIdentity = async (identity) => {
    const { id, operations } = identity;
    const buildIdentity = await buildIdentityFromOperations(operations, id);
    return (identity.primaryKey === buildIdentity.primaryKey &&
        identity.name === buildIdentity.name &&
        identity.fingerprintDisplay === buildIdentity.fingerprintDisplay &&
        identity.body === buildIdentity.body &&
        identity.tombstone === buildIdentity.tombstone &&
        identity.subKeys.every((subKey, index) => buildIdentity.subKeys[index] === subKey));
};
const isWithMessages = (value) => {
    if (isObject(value) === false)
        return false;
    const { messages } = value;
    return messages !== undefined && messages.every(isMessage);
};
export const isItemWithMessages = (value) => {
    return isItem(value) && isWithMessages(value);
};
export const isIdentityWithMessages = (value) => {
    return isItem(value) && isWithMessages(value);
};
export const getUnsignedOperations = (item) => {
    const { operations, messages } = item;
    const rawOperations = new Set(messages.map(({ raw }) => raw));
    return operations.filter(operation => rawOperations.has(toRawOperation(operation)) === false);
};
export const identify = async (id, privateKeyOrMnemonic) => {
    const splitMnemonicAndPassphrase = (mnemonicDisplayWithPassphrase) => {
        return fromMnemonicDisplayWithPassphrase(mnemonicDisplayWithPassphrase);
    };
    const getKeyPair = (cryptoName) => {
        return isMnemonicDisplayWithPassphrase(privateKeyOrMnemonic) || isMnemonicDisplay(privateKeyOrMnemonic) ?
            keyPairFromMnemonic(cryptoName, ...splitMnemonicAndPassphrase(privateKeyOrMnemonic)) :
            keyPairFromPrivateKey(cryptoName, fromHex(privateKeyOrMnemonic));
    };
    const tryFindingIdentity = async (id) => {
        const results = [];
        for (const cryptoName of cryptoNames) {
            try {
                const keyPair = getKeyPair(cryptoName);
                const primaryKey = publicKeyToPrimaryKey(cryptoName, keyPair.publicKey);
                if (await fingerprintedNameBelongsToPrimaryKey(id, primaryKey)) {
                    const name = isName(id) ? id : parseFingerprintedName(id)[0];
                    const nameKey = toNameKey(name, primaryKey);
                    results.push([nameKey, displayKeyPair(keyPair)]);
                }
            }
            catch {
                continue;
            }
        }
        if (results.length === 0) {
            throw new Error(`Private key or Mnemonic does not match supplied id: ${id}`);
        }
        else if (results.length > 1) {
            throw new Error(`Supplied id: ${id} is ambiguous and matches multiple identities (on different CryptoNames). Use a longer Fingerprint.`);
        }
        else {
            return results[0];
        }
    };
    if (isNameKey(id)) {
        const [primaryKey] = parseNameKey(id);
        const cryptoName = readCryptoNameFromPrimaryKey(primaryKey);
        const keyPair = getKeyPair(cryptoName);
        const keyPairPrimaryKey = publicKeyToPrimaryKey(cryptoName, keyPair.publicKey);
        if (keyPairPrimaryKey !== primaryKey) {
            throw new Error(`PrivateKey does not match NameKey: ${id}`);
        }
        return [id, displayKeyPair(keyPair)];
    }
    else if (isFingerprintedName(id)) {
        return await tryFindingIdentity(id);
    }
    else if (isPathStringified(id)) {
        const path = parseAmbiguousPath(id);
        if (path.elements[0]?.type === "IDENTITY") {
            if (path.elements[1]?.type === "SUBKEY") {
                const [, keyPair] = await tryFindingIdentity(path.elements[1].id);
                return [path.elements[0].id, keyPair];
            }
            else {
                return await tryFindingIdentity(path.elements[0].id);
            }
        }
        else {
            throw new Error(`Invalid PathStringified: ${id}`);
        }
    }
    else {
        throw new Error(`Invalid id parameter: ${id} (must be a NameKey, FingerprintedName or PathStringified)`);
    }
};
