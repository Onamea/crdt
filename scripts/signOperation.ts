import { keyPairFromPrivateKey } from "@onamea/types"
import { createCreateOperation } from "../Operation.ts"
import { signOperation } from "../Message.ts"

const id = Deno.args[0] 
const privateKeyDisplay = Deno.args[1] 

const createOperation = await createCreateOperation(id)
const keyPair = keyPairFromPrivateKey("Ed25519", privateKeyDisplay)
const message = await signOperation(createOperation, keyPair, Date.now()) 
console.log(message)
