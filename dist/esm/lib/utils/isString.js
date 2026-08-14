const isString = (value) => {
    return typeof value === "string";
};
export const isNonEmptyString = (value, shouldTrim = false) => {
    if (isString(value) === false)
        return false;
    const s = shouldTrim ? value.trim() : value;
    return s.length > 0;
};
export default isString;
