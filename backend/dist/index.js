"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zklogin_1 = require("@mysten/zklogin");
const ed25519_1 = require("@mysten/sui/keypairs/ed25519");
const client_1 = require("@mysten/sui/client");
const transactions_1 = require("@mysten/sui/transactions");
const utils_1 = require("@mysten/sui/utils");
const cors_1 = __importDefault(require("cors"));
const jwt_decode_1 = require("jwt-decode");
const redis_1 = require("redis");
const axios_1 = __importDefault(require("axios"));
const redisClient = (0, redis_1.createClient)({
    url: 'redis://default:AY3kAAIjcDEzOGZlNDVjMWYxMWM0MzA3ODBjMjZkYjUwNDE2MzNhMHAxMA@enough-midge-36324.upstash.io:6379', // 根据你的 Redis 服务器地址进行修改
    socket: {
        tls: true
    }
});
// 处理 Redis 客户端的错误
redisClient.on('error', (err) => {
    console.error('Redis 连接错误:', err);
});
// 连接到 Redis
redisClient.connect().then(() => {
    console.log('已连接到 Redis');
}).catch((err) => {
    console.error('Redis 连接失败:', err);
});
const client = new client_1.SuiClient({
    url: (0, client_1.getFullnodeUrl)("devnet"),
});
// 创建一个 Express 应用
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// 设置服务器监听的端口
const PORT = 8080;
// 定义一个简单的路由
app.get('/', (req, res) => {
    res.send('demo');
});
app.get('/getNonce', async (req, res) => {
    const FULLNODE_URL = "https://fullnode.devnet.sui.io";
    // const FULLNODE_URL = "https://fullnode.testnet.sui.io"
    const suiClient = new client_1.SuiClient({ url: FULLNODE_URL });
    const { epoch } = await suiClient.getLatestSuiSystemState();
    const maxEpoch = Number(epoch) + 10;
    const randomness = (0, zklogin_1.generateRandomness)();
    const ephemeralKeyPair = ed25519_1.Ed25519Keypair.generate();
    const nonce = (0, zklogin_1.generateNonce)(ephemeralKeyPair.getPublicKey(), maxEpoch, randomness);
    const privateKey = ephemeralKeyPair.getSecretKey();
    console.log({ ephemeralKeyPair, randomness, maxEpoch });
    console.log(JSON.stringify({ ephemeralKeyPair, randomness, maxEpoch }));
    redisClient.set(nonce, JSON.stringify({ ephemeralKeyPair, randomness, maxEpoch, privateKey }));
    res.send(nonce);
});
app.post('/googleId', async (req, res) => {
    const decodedJwt = (0, jwt_decode_1.jwtDecode)(req.body.idToken);
    const salt = (0, zklogin_1.generateRandomness)();
    const address = (0, zklogin_1.jwtToAddress)(req.body.idToken, salt);
    // generate zkp
    const nonceString = await redisClient.get(decodedJwt.nonce ?? "nonce");
    if (nonceString) {
        const nonceData = JSON.parse(nonceString ?? "");
        const ephemeralKeyPair = ed25519_1.Ed25519Keypair.fromSecretKey(nonceData.privateKey);
        const extendedEphemeralPublicKey = (0, zklogin_1.getExtendedEphemeralPublicKey)(ephemeralKeyPair.getPublicKey());
        const zkProofResult = await axios_1.default.post('https://prover-dev.mystenlabs.com/v1', {
            jwt: req.body.idToken,
            extendedEphemeralPublicKey: extendedEphemeralPublicKey,
            maxEpoch: nonceData.maxEpoch,
            jwtRandomness: nonceData.randomness,
            salt: salt,
            keyClaimName: "sub",
        }, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        const addressSeed = (0, zklogin_1.genAddressSeed)(BigInt(salt), "sub", decodedJwt.sub ?? "", decodedJwt.aud).toString();
        let newNonceData = {
            ...nonceData,
            zkp: zkProofResult.data,
            address,
            addressSeed
        };
        redisClient.setEx(decodedJwt.nonce ?? "nonce_", 60 * 60 * 24 * 9, JSON.stringify(newNonceData));
        res.json({
            salt,
            address,
            nonce: decodedJwt.nonce
        });
    }
    else {
        res.json({
            error: 'nonce meet error'
        });
    }
});
app.post('/test', async (req, res) => {
    try {
        const nonce = req.body.nonce;
        const nonceString = await redisClient.get(nonce ?? "nonce");
        const data = JSON.parse(nonceString ?? "");
        const ephemeralKeyPair = ed25519_1.Ed25519Keypair.fromSecretKey(data.privateKey);
        const zkp = data.zkp;
        const txb = new transactions_1.Transaction();
        // Transfer 1 SUI to 0xfa0f...8a36.
        const [coin] = txb.splitCoins(txb.gas, [utils_1.MIST_PER_SUI * 1n]);
        txb.transferObjects([coin], "0xd8791a5514a82cbfe33882616ed619dfc268233474e6bc5b69a30b83b0c03a70");
        txb.setSender(data.address);
        const { bytes, signature: userSignature } = await txb.sign({
            client: client,
            signer: ephemeralKeyPair,
        });
        const zkLoginSignature = (0, zklogin_1.getZkLoginSignature)({
            inputs: {
                ...zkp,
                addressSeed: data.addressSeed
            },
            maxEpoch: data.maxEpoch,
            userSignature,
        });
        const executeRes = await client.executeTransactionBlock({
            transactionBlock: bytes,
            signature: zkLoginSignature,
            options: {
                showEffects: true
            }
        });
        console.log('digest: ', executeRes.digest);
        res.json({
            digest: executeRes.digest
        });
        // let txRes = await client.signAndExecuteTransaction({
        //     requestType: "WaitForLocalExecution",
        //     transaction: txb,
        //     signer: keypair,
        //     options: {
        //         showEffects: true
        //     }
        // });
    }
    catch (error) {
        res.json({
            error
        });
    }
});
// 启动服务器并监听指定端口
app.listen(PORT, () => {
    console.log(`服务器正在 http://localhost:${PORT} 上运行`);
});
