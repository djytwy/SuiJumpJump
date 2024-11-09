import express from 'express'
import { generateRandomness, generateNonce, genAddressSeed, jwtToAddress, getZkLoginSignature, getExtendedEphemeralPublicKey } from '@mysten/zklogin';
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { toSerializedSignature } from '@mysten/sui/cryptography'
import { Transaction } from '@mysten/sui/transactions'
import { MIST_PER_SUI } from '@mysten/sui/utils'
import cors from 'cors'
import { JwtPayload, jwtDecode } from "jwt-decode";
import { createClient } from 'redis'
import axios from 'axios';


interface JwtPayloadCust extends JwtPayload {
    nonce?: string
}

const redisClient = createClient({
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

const client = new SuiClient({
    url: getFullnodeUrl("devnet"),
});

export type PartialZkLoginSignature = Omit<
    Parameters<typeof getZkLoginSignature>["0"]["inputs"],
    "addressSeed"
>;

// 创建一个 Express 应用
const app = express();
app.use(cors())
app.use(express.json());

// 设置服务器监听的端口
const PORT = 8080;

// 定义一个简单的路由
app.get('/', (req, res) => {
    res.send('你好，世界！');
});

app.get('/getNonce', async (req, res) => {
    const FULLNODE_URL = "https://fullnode.devnet.sui.io"
    // const FULLNODE_URL = "https://fullnode.testnet.sui.io"
    const suiClient = new SuiClient({ url: FULLNODE_URL });
    const { epoch } = await suiClient.getLatestSuiSystemState();
    const maxEpoch = Number(epoch) + 10
    const randomness = generateRandomness();
    const ephemeralKeyPair = Ed25519Keypair.generate();
    const nonce = generateNonce(
        ephemeralKeyPair.getPublicKey(),
        maxEpoch,
        randomness
    );
    const privateKey = ephemeralKeyPair.getSecretKey()
    console.log({ ephemeralKeyPair, randomness, maxEpoch });
    console.log(JSON.stringify({ ephemeralKeyPair, randomness, maxEpoch }));
    redisClient.set(nonce, JSON.stringify({ ephemeralKeyPair, randomness, maxEpoch, privateKey }))
    res.send(nonce)
})

app.post('/googleId', async (req, res) => {
    // console.log(req.body.idToken); // 打印接收到的数据
    const decodedJwt = jwtDecode<JwtPayloadCust>(req.body.idToken);
    const salt = generateRandomness();
    const address = jwtToAddress(req.body.idToken, salt)
    const addressSeed: string = genAddressSeed(
        BigInt(salt),
        "sub",
        decodedJwt.sub ?? "",
        decodedJwt.aud as string
    ).toString();
    // generate zkp
    const nonceString = await redisClient.get(decodedJwt.nonce ?? "nonce")
    if (nonceString) {
        const nonceData = JSON.parse(nonceString ?? "")
        const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(
            nonceData.privateKey
        );
        const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(ephemeralKeyPair.getPublicKey())
        const zkProofResult = await axios.post(
            'https://prover-dev.mystenlabs.com/v1',
            {
                jwt: req.body.idToken,
                extendedEphemeralPublicKey: extendedEphemeralPublicKey,
                maxEpoch: nonceData.maxEpoch,
                jwtRandomness: nonceData.randomness,
                salt: salt,
                keyClaimName: "sub",
            },
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        const addressSeed: string = genAddressSeed(
            BigInt(salt),
            "sub",
            decodedJwt.sub ?? "",
            decodedJwt.aud as string
        ).toString();

        let newNonceData = {
            ...nonceData,
            zkp: zkProofResult.data,
            address,
            addressSeed
        }
        redisClient.set(decodedJwt.nonce ?? "nonce_", JSON.stringify(newNonceData))
        res.json({
            salt,
            address,
            nonce: decodedJwt.nonce
        })
    } else {
        res.json({
            error: 'nonce meet error'
        })
    }
})

app.post('/test', async (req, res) => {
    try {
        const nonce = req.body.nonce;
        const nonceString = await redisClient.get(nonce ?? "nonce")
        const data = JSON.parse(nonceString ?? "")
        const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(
            data.privateKey
        );
        const zkp = data.zkp as PartialZkLoginSignature
        const txb = new Transaction();
        // Transfer 1 SUI to 0xfa0f...8a36.
        const [coin] = txb.splitCoins(txb.gas, [MIST_PER_SUI * 1n]);
        txb.transferObjects(
            [coin],
            "0xd8791a5514a82cbfe33882616ed619dfc268233474e6bc5b69a30b83b0c03a70"
        );
        txb.setSender(data.address);
        const { bytes, signature: userSignature } = await txb.sign({
            client: client,
            signer: ephemeralKeyPair,
        })

        const zkLoginSignature = getZkLoginSignature({
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
        })
        // let txRes = await client.signAndExecuteTransaction({
        //     requestType: "WaitForLocalExecution",
        //     transaction: txb,
        //     signer: keypair,
        //     options: {
        //         showEffects: true
        //     }
        // });
    } catch (error) {
        res.json({
            error
        })
    }
})

// 启动服务器并监听指定端口
app.listen(PORT, () => {
    console.log(`服务器正在 http://localhost:${PORT} 上运行`);
});