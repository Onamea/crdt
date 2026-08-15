import { parsePath, pathToFingerprintDisplay } from "../Path.ts"

const path = Deno.args[0]

const parsedPath = parsePath(path)
console.log(parsedPath)
const fingerprintDisplay = await pathToFingerprintDisplay(parsedPath)
console.log(fingerprintDisplay)
