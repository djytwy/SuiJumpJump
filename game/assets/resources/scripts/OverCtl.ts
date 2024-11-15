import { _decorator, Component, Node, Label } from 'cc';
import { EventDispatcher } from './EventDispatcher';
import { GameData } from './GameData';
const { ccclass, property } = _decorator;
/**
 * 游戏结束界面,脚本
 * @author 一朵毛山
 * Construct 
 */
@ccclass('OverCtl')
export class OverCtl extends Component {
    //本局分数
    @property({ type: Label })
    total_score: Label = null;
    //历史最高分
    @property({ type: Label })
    history_score: Label = null;
    // 日期
    @property({ type: Label })
    date: Label = null;
    // rank1 -name
    @property({ type: Label })
    rank1_name: Label = null;
    // rank2 -name
    @property({ type: Label })
    rank2_name: Label = null;
    // rank3 -name
    @property({ type: Label })
    rank3_name: Label = null;
    // rank1 - score
    @property({ type: Label })
    rank1_score: Label = null;
    // rank2 - score
    @property({ type: Label })
    rank2_score: Label = null;
    // rank3 - score
    @property({ type: Label })
    rank3_score: Label = null;

    @property({ type: Node })
    home_page: Node = null;
    // TIPS
    @property({ type: Label })
    tips: Label = null;



    start() {
        //注册打开游戏结束界面事件
        EventDispatcher.get_instance().target.on(EventDispatcher.SHOW_OVER_WINDOW_PVP, this.show, this);
        this.node.active = false;
    }

    async uploadToRank() {
        const level = window.localStorage.getItem("level")
        const gmail = window.localStorage.getItem("gmail")
        try {
            const res = await fetch('https://test-game.degentest.com/uploadToRank', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json;charset=utf-8',
                },
                body: JSON.stringify({
                    "email": gmail,
                    "level": level,
                    "points": parseInt(this.total_score.string)
                }),
            })
            const res_json = await res.json()
            if (res_json.success) {
                console.log('Points upload success');
            } else {
                console.log('Points upload fail');
            }
        } catch (error) {
            console.log(error);
        }
    }

    async addRecordToSBT() {
        const gmail = window.localStorage.getItem("gmail")
        try {
            const res = await fetch('https://test-game.degentest.com/addRecordToSBT', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json;charset=utf-8',
                },
                body: JSON.stringify({
                    "email": gmail,
                    "record": parseInt(this.total_score.string)
                }),
            })
            const res_json = await res.json()
            if (res_json.success) {
                console.log('add record SBT success');
                this.tips.string = 'Mint record to SBT success !'
            } else {
                console.log('add record SBT fail');
            }
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * 显示游戏结束界面
     */
    show(): void {
        this.tips.string = ''
        this.scheduleOnce(() => {
            this.node.setPosition(0, 0);
            this.node.active = true;
            this.total_score.string = GameData.get_total_score() + "";
            let histroy = localStorage.getItem("history_score");
            if (!histroy) {
                histroy = "0";
            }
            this.history_score.string = histroy;
            this.uploadToRank()
        }, 0.5);
    }

    update(deltaTime: number) {

    }
    /**
     * 重新开始游戏
     */
    restart() {
        //隐藏该界面
        this.node.setPosition(-1000, 0);
        this.node.active = false;
        //设置homg page 显示在屏幕中间
        this.home_page.active = true;
        this.home_page?.setPosition(0, 0);
    }
}

