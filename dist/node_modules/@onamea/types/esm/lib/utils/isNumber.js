export default (value) => {
    return typeof value === "number" && !isNaN(value) && isFinite(value);
};
