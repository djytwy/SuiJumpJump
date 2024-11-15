import express from 'express'
import { generateRandomness, generateNonce, genAddressSeed, jwtToAddress, getZkLoginSignature, getExtendedEphemeralPublicKey } from '@mysten/zklogin';
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from '@mysten/sui/transactions'
import { MIST_PER_SUI } from '@mysten/sui/utils'
import cors from 'cors'
import { JwtPayload, jwtDecode } from "jwt-decode";
import { createClient } from 'redis'
import axios from 'axios';
import { fetchObjectId } from './graphQL'


interface JwtPayloadCust extends JwtPayload {
    nonce?: string;
    email?: string;
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

const packageID = '0x63d3ab702b5e022789c272efba8a7e82936ec867bddbcc1ecc7b0720afa86ef4';
const gold = '0x2a96960fbfdd98a0d2532a53b4fc19389c9446091dcb9cdcf7146695ddfb3b00';
const sliver = '0xac89cc27adae7e16d1c8301cd6bcc6954e23c8ad53cb220a2cb739bc1f69cb01';
const bronze = '0xcfaf43f9e0789c7db298f827cc840979e2f9fcb92e964ff75c7a6e06f5d31c87';

// 定义一个简单的路由
app.get('/', (req, res) => {
    res.send('demo');
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
// 31269560233050132884408618866154513064
// 0x69a89c2776dc5d2e5d6b61f7bd44299fbc30ac24cbbcfaf202b302917bcedb2c

app.post('/googleId', async (req, res) => {
    /**
     * nonce -> user data
     * email -> user data
     */
    const decodedJwt = jwtDecode<JwtPayloadCust>(req.body.idToken);
    const gmail = decodedJwt.email
    const userDataString = await redisClient.get(gmail)
    if (userDataString) {
        const userData = JSON.parse(userDataString ?? "")
        const address = jwtToAddress(req.body.idToken, userData.salt)
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
                    salt: userData.salt,
                    keyClaimName: "sub",
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            const addressSeed: string = genAddressSeed(
                BigInt(userData.salt),
                "sub",
                decodedJwt.sub ?? "",
                decodedJwt.aud as string
            ).toString();
            let newUserData = {
                ...userData,
                ...nonceData,
                zkp: zkProofResult.data,
                address,
                addressSeed,
            }
            redisClient.setEx(gmail ?? "gmail", 60 * 60 * 24 * 9, JSON.stringify(newUserData))
            res.json({
                salt: userData.salt,
                address,
                nonce: decodedJwt.nonce,
                gmail
            })
        } else {
            res.json({
                error: "nonce data update meet some errors."
            })
        }
    } else {
        const salt = generateRandomness();
        const address = jwtToAddress(req.body.idToken, salt)
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
                addressSeed,
                salt: salt
            }
            redisClient.setEx(gmail ?? "nonce_", 60 * 60 * 24 * 9, JSON.stringify(newNonceData))
            res.json({
                salt,
                address,
                nonce: decodedJwt.nonce,
                gmail
            })
        } else {
            res.json({
                error: 'nonce meet error'
            })
        }
    }
})

app.post('/buyTicket', async (req, res) => {
    try {
        const email = req.body.email;
        const level = req.body.level;
        const nonceString = await redisClient.get(email ?? "nonce")
        if (nonceString) {
            const data = JSON.parse(nonceString ?? "")
            const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(
                data.privateKey
            );
            const zkp = data.zkp as PartialZkLoginSignature
            const suiAddMap = {
                gold: MIST_PER_SUI * 10n,
                sliver: MIST_PER_SUI * 5n,
                bronze: MIST_PER_SUI * 1n
            }
            const methodsMap = {
                gold: 'addGoldPool',
                sliver: 'addSliverPool',
                bronze: 'addBronzePool'
            }
            const objectMap = {
                gold,
                sliver,
                bronze
            }
            const txb = new Transaction();
            const method = methodsMap[level]
            const tokenNum = suiAddMap[level]
            const [coin] = txb.splitCoins(txb.gas, [tokenNum]);
            txb.moveCall({
                target: `${packageID}::prizePool::${method}`,
                arguments: [txb.object(objectMap[level]), coin]
            })
            txb.setGasBudget(100000000);
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
                success: true,
                digest: executeRes.digest,
                ticketLevel: level,
                address: data.address
            })
        } else {
            res.json({
                error: `Can't find you address ...`
            })
        }
    } catch (error) {
        res.json({
            error: error.toString()
        })
    }
})

app.post('/uploadToRank', async (req, res) => {
    try {
        const email = req.body.email;
        const level = req.body.level;
        const points = req.body.points
        const nonceString = await redisClient.get(email ?? "nonce")
        if (nonceString) {
            const data = JSON.parse(nonceString ?? "")
            const date = new Date().toISOString().split('T')[0];
            const dataBaseMap = {
                gold: `${date}-goldRank`,
                sliver: `${date}-sliverRank`,
                bronze: `${date}-bronzeRank`,
            }
            const index = await redisClient.lPush(dataBaseMap[level], `{address: ${data.address},points: ${points}}`)
            if (index) {
                res.json({
                    success: true
                })
            }
        } else {
            res.json({
                error: `Can't find you address ...`
            })
        }
    } catch (error) {
        res.json({
            error: error.toString()
        })
    }
})

app.post('/getSBT', async (req, res) => {
    try {
        const email = req.body.email;
        const name = req.body.name;
        const image_base64 = req.body.image_base64;
        const date = new Date();
        const formattedDate = new Intl.DateTimeFormat('en-US').format(date);
        const nonceString = await redisClient.get(email ?? "nonce")
        if (nonceString) {
            const data = JSON.parse(nonceString ?? "")
            const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(
                data.privateKey
            );
            const zkp = data.zkp as PartialZkLoginSignature
            const txb = new Transaction();
            /**
             *  fun mint_sbt(
                    name: String, 
                    records: vector<String>, 
                    image_base64: String,
                    ctx: &mut TxContext
                ) 
            */
            txb.moveCall({
                target: `${packageID}::SuiJumpJump::mint_sbt`,
                arguments: [
                    txb.pure.string(name),
                    txb.pure.vector("string", [`Welcome to SuiJumpJump: ${formattedDate}`]),
                    txb.pure.string(image_base64)
                ],
            })
            txb.setGasBudget(100000000);
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
                success: true,
                digest: executeRes.digest,
            })
        } else {
            res.json({
                error: `Can't find you address ...`
            })
        }
    } catch (error) {
        console.log(error);
        res.json({
            error: error.toString()
        })
    }
})

app.post('/addRecordToSBT', async (req, res) => {
    try {
        const email = req.body.email;
        const record = req.body.record;
        const nonceString = await redisClient.get(email ?? "nonce")
        if (nonceString) {
            const date = new Date();
            const formattedDate = new Intl.DateTimeFormat('en-US').format(date);
            const data = JSON.parse(nonceString ?? "")
            const objectId = await fetchObjectId(data.address, `${packageID}::SuiJumpJump::SBT`)
            const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(
                data.privateKey
            );
            const zkp = data.zkp as PartialZkLoginSignature
            const txb = new Transaction();
            txb.moveCall({
                target: `${packageID}::SuiJumpJump::add_record`,
                arguments: [txb.object(objectId), txb.pure.string(`{date:'${formattedDate}',record:${record}}`)]
            })
            txb.setGasBudget(100000000);
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
                success: true,
                digest: executeRes.digest,
            })
        } else {
            res.json({
                error: `Can't find you address ...`
            })
        }
    } catch (error) {
        res.json({
            error: error.toString()
        })
    }
})

app.post('/test', async (req, res) => {
    try {
        const email = req.body.email;
        const nonceString = await redisClient.get(email ?? "nonce")
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

app.get('/t_redis', async (req, res) => {
    const flag = await redisClient.lPush('t', `{address: '0x99998888', points: 123456}`)
    console.log('flag:', flag);
    const strData = await redisClient.lRange('t', 0, -1);
    console.log(strData);
    res.send('success!')
})

app.get('/get_list', async (req, res) => {
    const level = req.query.level;
    const date = new Date().toISOString().split('T')[0];
    const rkey = `${date}-${level}Rank`
    const listData = await redisClient.lRange(rkey, 0, -1);
    console.log('rkey:', rkey);
    console.log(listData);
    const JsonList = listData.map(str => {
        // 替换键名的格式
        const jsonString = str.replace(/(\w+):/g, '"$1":').replace(/'/g, '"').replace(/ss": /g, 'ss": "').replace(/,/g, '",');
        return JSON.parse(jsonString);
    })
    // @ts-ignore
    JsonList.sort((obj1, obj2) => obj2.points - obj1.points);
    console.log(JsonList);
    if (JsonList.length > 15) {
        const rankList = JsonList.slice(0, 15)
        res.json({
            data: rankList
        })
    } else {
        res.json({
            data: JsonList
        })
    }
})


app.get('/hasSBT', async (req, res) => {
    const email = req.query.email as string;
    console.log('email', email);

    const userDataString = await redisClient.get(email)
    console.log('userDataString', userDataString);

    const userData = JSON.parse(userDataString)
    const objectId = await fetchObjectId(userData.address, `${packageID}::SuiJumpJump::SBT`)
    if (objectId) {
        res.json({
            hasSBT: true
        })
    } else {
        res.json({
            hasSBT: false
        })
    }
})

// 启动服务器并监听指定端口
app.listen(PORT, () => {
    console.log(`服务器正在 http://localhost:${PORT} 上运行`);
});