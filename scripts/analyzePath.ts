import { parseAmbiguousPath, pathToFingerprintDisplay } from "../Path.ts"

const path = Deno.args[0]

const parsedPath = parseAmbiguousPath(path)
console.log(parsedPath)
const fingerprintDisplay = await pathToFingerprintDisplay(parsedPath)
console.log(fingerprintDisplay)
