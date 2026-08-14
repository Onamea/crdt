import isArray from "./isArray.js";
export default (value) => {
    return isArray(value) ? value : [value];
};
