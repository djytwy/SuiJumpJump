import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('InitUserDataPage')
export class InitUserDataPage extends Component {

    @property({ type: Node })
    home_page = null;

    start() {
        window.addEventListener("message", (event) => {
            // 检查消息来源是否是你的 WebView URL，防止其他来源的消息
            if (event.origin !== "http://localhost:7456") return;
            // 获取数据
            const data = event.data;
            if (data.hello) {
                console.log('hello');
            } else {
                console.log('--------data:');
            }
            // this.node.setPosition(-1000, 0);
            // this.node.active = false;
            // this.home_page.active = true;
            // this.home_page.setPosition(0, 0);
            // // 根据数据内容做不同的处理
            // if (data.type === "updateScore") {
            //     // 例如，处理更新分数的逻辑
            //     console.log("收到的分数更新:", data.score);
            // }
        });
    }

    update(deltaTime: number) {

    }
}

