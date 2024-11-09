import axios from 'axios'

axios.get("https://enough-midge-36324.upstash.io/set/user_1_session/session_token_value", {
    headers: {
        Authorization: "Bearer AY3kAAIjcDEzOGZlNDVjMWYxMWM0MzA3ODBjMjZkYjUwNDE2MzNhMHAxMA"
    }
}).then(response => response.data)
    .then(data => console.log(data));

import { createClient } from 'redis'

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