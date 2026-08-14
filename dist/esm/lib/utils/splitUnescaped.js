import splitGraphemeString from "./splitGraphemeString.js";
export default (str, separator, escapeChar = "\\") => {
    const ret = [];
    let current = [];
    let previousChar = undefined;
    const chars = splitGraphemeString(str);
    chars.forEach(char => {
        if (char === separator && previousChar !== escapeChar) {
            if (current.length > 0) {
                ret.push(current.join(""));
                current = [];
            }
        }
        else {
            current.push(char);
        }
        previousChar = char;
    });
    if (current.length > 0) {
        ret.push(current.join(""));
    }
    return ret;
};
