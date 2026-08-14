import { runInSandbox } from "./sandbox.js";
import { Validator } from "@cfworker/json-schema";
import { stripTypes } from "./stripTypes.js";
const languages = [
    { canonical: "JSON", aliases: [] },
    { canonical: "JavaScript", aliases: ["js"] },
    { canonical: "TypeScript", aliases: ["ts"] }
];
const findLanguage = (language) => {
    const lowerCased = language.toLowerCase();
    return languages
        .find(language => [language.canonical, ...language.aliases].map(n => n.toLowerCase()).includes(lowerCased))?.canonical;
};
const parseLanguage = (language, code) => {
    if (language === undefined) {
        try {
            JSON.parse(code);
            return "JSON";
        }
        catch {
            return "JavaScript";
        }
    }
    return findLanguage(language) ?? language;
};
const markdownCodeRegex = /^[^\S\r\n]*(?<fence>`{3,}|~{3,})[^\S\r\n]*(?<language>\S+)?[^\S\r\n]*\r?\n(?<code>[\s\S]*?)\r?\n[^\S\r\n]*\k<fence>[^\S\r\n]*$/i;
const unwrapMarkdown = (codeBlock) => {
    const match = codeBlock.match(markdownCodeRegex);
    const code = match?.groups?.code ?? codeBlock;
    const language = parseLanguage(match?.groups?.language, code);
    return { code, language };
};
const evaluateJavaScript = (code, body) => {
    return runInSandbox(code, body);
};
const validateJsonSchema = (schema, body) => {
    let parsedSchema;
    try {
        parsedSchema = JSON.parse(schema);
    }
    catch {
        throw new Error("Invalid JSON schema");
    }
    let parsedBody;
    try {
        parsedBody = JSON.parse(body);
    }
    catch {
        parsedBody = body;
    }
    return new Validator(parsedSchema).validate(parsedBody).valid;
};
export const validate = async (body, logic) => {
    const { code, language } = unwrapMarkdown(logic);
    switch (language) {
        case "JSON":
            return validateJsonSchema(code, body);
        case "JavaScript":
            return await evaluateJavaScript(code, body);
        case "TypeScript":
            return await evaluateJavaScript(await stripTypes(code), body);
        default:
            throw new Error(`Unsupported validation language: ${language}`);
    }
};
