import isArray from "./isArray.js";
export default (value) => {
    return typeof value === "object" && value !== null && isArray(value) === false;
};
