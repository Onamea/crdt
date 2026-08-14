/**
 * Strips TypeScript type annotations from code to produce valid JavaScript.
 * This is a very basic implementation and does not handle all edge cases.
 * @param ts The TypeScript code as a string.
 * @returns The JavaScript code as a string.
 */
export const stripTypes = (ts) => {
    // Remove type annotations in variables and parameters: foo: Type
    let js = ts.replace(/:[ \t]*[a-zA-Z0-9_\[\]\<\>\{\}, \t|]+(?=[,)\n;=])/g, "");
    // Remove return type annotations: ): Type
    js = js.replace(/\)\s*:[ \t]*[a-zA-Z0-9_\[\]\<\>\{\}, \t|]+/g, ")");
    // Remove interface and type declarations (very basic)
    js = js.replace(/(interface|type)[^{]+{[^}]+}/g, "");
    return js;
};
