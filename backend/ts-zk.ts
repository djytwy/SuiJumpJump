import { generateRandomness, generateNonce, genAddressSeed, jwtToAddress, getZkLoginSignature, getExtendedEphemeralPublicKey } from '@mysten/zklogin';
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient } from "@mysten/sui/client";

const ephemeralKeyPair = Ed25519Keypair.generate();
const privateKey = ephemeralKeyPair.getSecretKey()
const ephemeralKeyPair2 = Ed25519Keypair.fromSecretKey(
    privateKey
);
const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(ephemeralKeyPair2.getPublicKey())
console.log(extendedEphemeralPublicKey);
