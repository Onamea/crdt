/**
 * Strips TypeScript type annotations from code to produce valid JavaScript.
 * This is a very basic implementation and does not handle all edge cases.
 * @param ts The TypeScript code as a string.
 * @returns The JavaScript code as a string.
 */
export declare const stripTypes: (ts: string) => string;
