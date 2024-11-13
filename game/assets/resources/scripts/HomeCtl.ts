import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Home')
export class Home extends Component {

    @property({ type: Node })
    button_start_free: Node = null;

    @property({ type: Node })
    button_start_pvp: Node = null;

    @property({ type: Node })
    button_start_google: Node = null;

    start() {
        const gmail = window.localStorage.getItem("gmail")
        const exTime = window.localStorage.getItem("exTime")
        const now = new Date().getTime()
        if (gmail && exTime) {
            const _exTime = new Date(exTime).getTime()
            if (now < _exTime) {
                this.button_start_google.active = false;
                this.button_start_free.active = true;
                this.button_start_pvp.active = true;
            } else {
                this.button_start_google.active = true;
                this.button_start_free.active = false;
                this.button_start_pvp.active = false;
            }
        } else {
            this.button_start_google.active = true;
            this.button_start_free.active = false;
            this.button_start_pvp.active = false;
        }
    }

    googleBtnClk() {

    }

    freeBtnClk() {

    }

    pvpBtnClk() {

    }

    update(deltaTime: number) {

    }
}

