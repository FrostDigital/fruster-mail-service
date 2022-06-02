/**
 * Returns a possibly nested property from object
 * by providing property with dot notation.
 *
 * https://stackoverflow.com/a/8052100
 *
 * @param obj
 * @param property
 * @returns
 */
export function getDescendantProp(obj: any, property: string) {
    const arr = property.split(".");
    while(arr.length && (obj = obj[arr.shift() as string]));
    return obj;
}
