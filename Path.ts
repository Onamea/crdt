import { type IdentityKey, isIdentifier } from "./Identifier.ts"
import type { Id } from "./Identity.ts"
import { displayFingerprint, fingerprintToUint8Array, fromFingerprintDisplay, idToFingerprint, isFingerprintDisplay, publicKeyToFingerprint, uint8ArrayToFingerprint, type FingerprintDisplay } from "@onamea/types"
import findLastUnescaped from "./lib/utils/findLastUnescaped.ts"
import splitUnescaped from "./lib/utils/splitUnescaped.ts"
import { isNameKey, nameKeyToFingerprint } from "@onamea/types"
import { isPrimaryKey, primaryKeyToFingerprint } from "@onamea/types"
import { isPublicKeyDisplay } from "@onamea/types"
import { fromPublicKeyDisplay } from "@onamea/types"
import type { Flavor } from "./lib/utils/Flavor.ts"

const elementTypes = {
  IDENTITY: undefined,
  SUBKEY: "$",
  REFERENT: ">",
  ITEM: undefined
} as const
type ElementType = keyof typeof elementTypes
export type PathStringified = Flavor<string, "PathStringified">
type ElementPrefix = Exclude<typeof elementTypes[ElementType], undefined>
type PathElement = {
  id: Id
  type: ElementType
  fingerprint?: FingerprintDisplay
}
type PathElements = PathElement[]
type PathElementStringified = `${ ElementPrefix }${ Id }` | Id
export type Path = {
  elements: PathElement[]
  fingerprint?: FingerprintDisplay
}

export const isElementPrefix = (value: unknown): value is ElementPrefix => {
  return Object.values(elementTypes).includes(value as ElementPrefix)
}

export const getElementTypeByElementPrefix = (prefix: ElementPrefix | undefined): ElementType => {
  const elementType = Object.entries(elementTypes).find(([, value]) => value === prefix)?.[0]
  return elementType as ElementType
}

export const stringifyPathElement = (element: PathElement): PathElementStringified => {
  const prefix = elementTypes[element.type]
  return prefix !== undefined ? `${ prefix }${ element.id }` : element.id
}

export const buildPathFromElements = (elements: PathElements): PathStringified => {
  return elements.map(element => stringifyPathElement(element)).join("/")
}

export const parsePathElement = (pathElement: string): PathElement => {
  const length = pathElement.length
  if (length === 0) {
    throw new Error("Invalid Path Element: empty string")
  }
  if (length === 1) {
    return { id: pathElement, type: "ITEM" }
  }
  const firstChar = pathElement[0]
  if (isElementPrefix(firstChar)) {
    const elementType = getElementTypeByElementPrefix(firstChar)
    const id = pathElement.slice(1).replace("\\#", "#")
    return { id, type: elementType }
  } else {
    const isEscaped = firstChar === "\\" && isElementPrefix(pathElement[1])
    const id = (isEscaped ? pathElement.slice(1) : pathElement).replace("\\#", "#")
    return { id, type: "ITEM" }
  }
}

export const pathElementFromIdentityKey = async (id: IdentityKey, type: Exclude<ElementType, "ITEM" | "REFERENT"> = "IDENTITY"): Promise<PathElement> => {
  if (isNameKey(id)) {
    const fingerprint = displayFingerprint(await nameKeyToFingerprint(id))
    return { id, type, fingerprint }
  } else if (isPrimaryKey(id)) {
    const fingerprint = displayFingerprint(await primaryKeyToFingerprint(id))
    return { id, type, fingerprint }
  } else if (isPublicKeyDisplay(id)) {
    const fingerprint = displayFingerprint(await publicKeyToFingerprint(fromPublicKeyDisplay(id)))
    return { id, type, fingerprint }
  }
  return { id, type }
}

export const addFingerprintToPathElement = async (element: PathElement): Promise<PathElement> => {
  if (element.fingerprint !== undefined) {
    return element
  }
  if (isNameKey(element.id) || element.type === "ITEM") {
    const fingerprint = displayFingerprint(await idToFingerprint(element.id))
    return { ...element, fingerprint }
  }
  return element
}

const setElementTypesOnPathStart = (path: Path) : Path => {
  if (path.elements[0]?.type === "ITEM" && isIdentifier(path.elements[0]?.id)) {
    path.elements[0].type = "IDENTITY"
    if (path.elements[1]?.type === "ITEM" && isIdentifier(path.elements[1]?.id)) {
      path.elements[1].type = "SUBKEY"
    }
  }
  return path
}

export const parsePath = (path: PathStringified): Path => {
  const hashIndex = findLastUnescaped(path, "#") 
  const fingerprint = hashIndex > -1 ? path.slice(hashIndex + 1) : undefined
  if (fingerprint !== undefined && isFingerprintDisplay(fingerprint) === false) {
    throw new Error(`Invalid Fingerprint Display in Path: ${ path }`)
  }
  const leftover = hashIndex > -1 ? path.slice(0, hashIndex) : path
  const elements = splitUnescaped(leftover, "/").map(pathElement => parsePathElement(pathElement))
  return setElementTypesOnPathStart({ elements, fingerprint })
}

export const isPathStringified = (value: unknown): value is PathStringified => {
  if (typeof value !== "string") return false
  try {
    parsePath(value)
    return true
  } catch {
    return false
  }
}

export const pathToFingerprintDisplay = async (path: Path): Promise<FingerprintDisplay> => {
  const pathWithFingerprints = await Promise.all(path.elements.map(async element => {
    return await addFingerprintToPathElement(element)
  }))
  if (pathWithFingerprints.some(element => element.fingerprint === undefined)) {
    throw new Error("Cannot get FingerprintDisplay of Path: missing fingerprint for some elements")
  }
  const fingerprints = pathWithFingerprints.map(element => fromFingerprintDisplay(element.fingerprint!))
  const uint8Arrays = fingerprints.map(fingerprint => fingerprintToUint8Array(fingerprint))
  const concatenated = new Uint8Array(await new Blob(uint8Arrays as BlobPart[]).arrayBuffer())
  const fingerprint = await uint8ArrayToFingerprint(concatenated)
  return displayFingerprint(fingerprint)
}
