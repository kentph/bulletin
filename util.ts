/**
 * Check that name is indeed a property of type T.
 * @param name Property name to check
 */
export const nameof = <T>(name: Extract<keyof T, string>): string => name;
