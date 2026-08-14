/**
 * Recursive Flavor type: If T is already a Flavor, merge F into __type; otherwise, add __type?: F.
 * This allows for safe, composable branding.
 */
export type Flavor<T, F> = T extends {
    readonly __type?: infer U;
} ? T & {
    readonly __type?: U | F;
} : T & {
    readonly __type?: F;
};
