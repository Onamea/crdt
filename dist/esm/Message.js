import { fromPublicKeyDisplay } from "@onamea/types";
import { displayPublicKeyByCryptoName, isPublicKeyDisplayByCryptoName, displaySignatureByCryptoName, isSignatureDisplayByCryptoName, sign as signByCryptoName, verify as verifyByCryptoName } from "@onamea/types";
import { messageToHash } from "@onamea/types";
import { isCryptoName } from "@onamea/types";
import { fromHex } from "@onamea/types";
import { isNameKey, parseNameKey } from "@onamea/types";
import { isPrimaryKey, publicKeyToPrimaryKey } from "@onamea/types";
import { isPublicKeyDisplay } from "@onamea/types";
import { parseRawOperation, toRawOperation } from "./RawOperation.js";
import { isOwnable, validateOperation } from "./Operation.js";
import isObject from "./lib/utils/isObject.js";
import isString from "./lib/utils/isString.js";
import isNumber from "./lib/utils/isNumber.js";
export const isDatetime = (value) => {
    return isString(value) || isNumber(value);
};
export const isMessage = (value) => {
    if (isObject(value) === false)
        return false;
    const { raw, cryptoName, publicKey, signature, datetime } = value;
    return (isString(raw) &&
        isCryptoName(cryptoName) &&
        isPublicKeyDisplayByCryptoName(cryptoName, publicKey) &&
        isSignatureDisplayByCryptoName(cryptoName, signature) &&
        (datetime === undefined || isDatetime(datetime)));
};
export const digest = async (rawOperation, datetime) => {
    const hash = await messageToHash(rawOperation);
    if (datetime === undefined)
        return hash;
    const message = hash + String(datetime);
    return await messageToHash(message);
};
export const createUnsignedMessage = (operation) => {
    const raw = toRawOperation(operation);
    return { raw };
};
export const signMessage = async (message, keyPair, datetime) => {
    const { raw } = message;
    const { cryptoName, publicKey, privateKey } = keyPair;
    const publicKeyDisplay = displayPublicKeyByCryptoName(cryptoName, publicKey);
    const signature = await signByCryptoName(cryptoName, await digest(raw, datetime), privateKey);
    const signatureDisplay = displaySignatureByCryptoName(cryptoName, signature);
    return { raw, cryptoName, publicKey: publicKeyDisplay, signature: signatureDisplay, datetime };
};
export const signOperation = async (operation, keyPair, datetime) => {
    if (await validateOperation(operation) === false)
        throw new Error("Invalid Operation");
    const unsignedMessage = createUnsignedMessage(operation);
    return await signMessage(unsignedMessage, keyPair, datetime);
};
export const signOperations = async (operations, keyPair, datetime) => {
    const promises = operations.map(operation => signOperation(operation, keyPair, datetime));
    return await Promise.all(promises);
};
export const verifyMessage = async (message) => {
    const { raw, cryptoName, publicKey: publicKeyDisplay, signature: signatureDisplay, datetime } = message;
    const messageHash = await digest(raw, datetime);
    const publicKey = fromHex(publicKeyDisplay);
    const signature = fromHex(signatureDisplay);
    return verifyByCryptoName(cryptoName, messageHash, signature, publicKey);
};
export const isSignedByOwner = async (message) => {
    if (await verifyMessage(message) === false)
        return false;
    try {
        const operation = await parseRawOperation(message.raw);
        if (isOwnable(operation) === false)
            return false;
        let primaryKey = undefined;
        if (isNameKey(operation.id)) {
            [primaryKey] = parseNameKey(operation.id);
        }
        else if (isPrimaryKey(operation.id)) {
            primaryKey = operation.id;
        }
        else if (isPublicKeyDisplay(operation.id)) {
            primaryKey = publicKeyToPrimaryKey(message.cryptoName, fromPublicKeyDisplay(operation.id));
        }
        if (primaryKey === undefined)
            return false;
        const primaryKeySigner = publicKeyToPrimaryKey(message.cryptoName, fromPublicKeyDisplay(message.publicKey));
        return primaryKey === primaryKeySigner;
    }
    catch {
        return false;
    }
};
