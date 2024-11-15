import { _decorator, Component, Node, WebView } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('InitUserDataPage')
export class InitUserDataPage extends Component {

    @property({ type: Node })
    home_page = null;

    @property({ type: WebView })
    webView: WebView = null;

    // 处理从 WebView 发送来的消息
    // handleJSCallback(_webview: WebView, message: string) {
    //     console.log("Received message from WebView:", message);
    //     if (message === "cocos") {
    //         console.log(message);
    //     }
    // }


    start() {
        // let scheme = "testkey";
        // function jsCallback(target: WebView, url: string) {
        //     // The return value here is the URL value of the internal page, and it needs to parse the data it needs.
        //     let str = url.replace(scheme + '://', ''); // str === 'a=1&b=2'
        //     // webview target
        //     console.log(target);
        // }
        // console.log('------------start---------------');
        // console.log(this.webView.setJavascriptInterfaceScheme);
        // this.webView.setJavascriptInterfaceScheme(scheme);
        // // @ts-ignore
        // this.webView.setOnJSCallback(jsCallback);
    }

    update(deltaTime: number) {

    }
}

