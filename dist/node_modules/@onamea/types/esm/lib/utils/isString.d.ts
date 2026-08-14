type NonEmptyString = string;
declare const isString: (value: unknown) => value is string;
export declare const isNonEmptyString: (value: unknown, shouldTrim?: boolean) => value is NonEmptyString;
export default isString;
