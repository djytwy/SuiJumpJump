import { _decorator, Component, Label, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Home')
export class Home extends Component {

    @property({ type: Node })
    button_start_free: Node = null;

    @property({ type: Node })
    button_start_pvp: Node = null;

    @property({ type: Node })
    button_start_google: Node = null;

    @property({ type: Node })
    button_buy_gold_ticket: Node = null;

    @property({ type: Node })
    button_buy_sliver_ticket: Node = null;

    @property({ type: Node })
    button_buy_bronze_ticket: Node = null;

    @property({ type: Node })
    button_close: Node = null;

    @property({ type: Node })
    init_user_message_page: Node = null;

    @property({ type: Label })
    zk_login_tips: Label = null

    async start(): Promise<void> {
        this.init_user_message_page.active = false;
        this.button_buy_sliver_ticket.active = false;
        this.button_buy_gold_ticket.active = false;
        this.button_buy_bronze_ticket.active = false;
        this.button_close.active = false;
        this.zk_login_tips.string = 'Play wit google';
        // @ts-ignore
        const startParams = window.Telegram.WebApp.initDataUnsafe.start_param as string;
        // const startParams = ''
        let startGmail = null;
        let startEx = null;
        if (startParams) {
            const res = await fetch(`https://test-game.degentest.com/getGoogle?key=${startParams ?? ''}`)
            const resJson = await res.json();
            startGmail = resJson.str.split('_')[0]
            startEx = decodeURI(resJson.str.split('_')[1])
            const _address = resJson.str.split('_')[2]
            window.localStorage.setItem('address', _address)
        }
        const gmail = window.localStorage.getItem("gmail")
        const exTime = window.localStorage.getItem("exTime")
        const now = new Date().getTime()
        if (gmail && exTime || startGmail && startEx) {
            const _exTime = new Date(exTime).getTime()
            const _startEx = new Date(startEx).getTime()
            if (now < _exTime || now < _startEx) {
                // check SBT 
                const res = await fetch(`https://test-game.degentest.com/hasSBT?email=${startGmail ?? gmail}`)
                const resJson = await res.json();
                if (resJson.hasSBT) {
                    // set to localStorage when user first enter game
                    if (gmail === null || exTime === null) {
                        window.localStorage.setItem("gmail", startGmail)
                        window.localStorage.setItem("exTime", startEx)
                    }
                    this.button_start_google.active = false;
                    this.button_start_free.active = true;
                    this.button_start_pvp.active = true;
                } else {
                    //移动和隐藏,home page
                    this.node.setPosition(-1000, 0);
                    this.node.active = false;
                    this.init_user_message_page.active = true;
                    this.init_user_message_page.setPosition(0, 0);
                }
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

    async googleBtnClk(): Promise<void> {
        const res = await fetch('https://test-game.degentest.com/getNonce', {
            method: "GET"
        })
        const nonce = await res.text()
        const _params = new URLSearchParams({
            client_id: '212832815906-nn4b53v63na7f4i31je7h9fbuiiuu9u2.apps.googleusercontent.com',
            redirect_uri: `https://nextjs-boilerplate-bice-psi-58.vercel.app/`,
            response_type: "id_token",
            scope: "openid email profile",
            nonce: nonce
        });
        const loginURL = `https://accounts.google.com/o/oauth2/v2/auth?${_params}`;
        // @ts-ignore  for tg:
        window.Telegram.WebApp.openLink(loginURL);
        // for dev:
        // window.open(loginURL)
        // this.button_start_google.active = false;
        // this.button_start_free.active = true;
        // this.button_start_pvp.active = true;
        this.zk_login_tips.fontSize = 20
        this.zk_login_tips.string = "Try again with google"
    }

    freeBtnClk() {

    }

    pvpBtnClk() {
        this.button_buy_sliver_ticket.active = true;
        this.button_buy_gold_ticket.active = true;
        this.button_buy_bronze_ticket.active = true;
        this.button_start_free.active = false;
        this.button_start_pvp.active = false;
        this.button_close.active = true;
    }

    backBtnClk() {
        this.button_buy_sliver_ticket.active = false;
        this.button_buy_gold_ticket.active = false;
        this.button_buy_bronze_ticket.active = false;
        this.button_start_free.active = true;
        this.button_start_pvp.active = true;
        this.button_close.active = false;
    }

    update(deltaTime: number) {

    }
}

