import express from 'express'
import { generateRandomness, generateNonce } from '@mysten/zklogin';
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient } from "@mysten/sui/client";

// 创建一个 Express 应用
const app = express();

// 设置服务器监听的端口
const PORT = 8080;

// 定义一个简单的路由
app.get('/', (req, res) => {
    res.send('你好，世界！');
});

app.get('/getNonce', async (req, res) => {
    // const FULLNODE_URL = "https://fullnode.devnet.sui.io"
    const FULLNODE_URL = "https://fullnode.testnet.sui.io"
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
    res.send(nonce)
})

// 启动服务器并监听指定端口
app.listen(PORT, () => {
    console.log(`服务器正在 http://localhost:${PORT} 上运行`);
});