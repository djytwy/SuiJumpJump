import { _decorator, Component, Node, Prefab, instantiate, Label } from 'cc';
const { ccclass, property } = _decorator;
/**
 * 排行榜界面,脚本
 * @author 一朵毛山
 * Construct 
 */
@ccclass('RankCtl')
export class RankCtl extends Component {
    //预制体,排行榜你的
    @property({ type: Prefab })
    pre_rank_item: Prefab = null;
    //排行数据容器
    @property({ type: Node })
    content: Node = null;
    //title
    @property({ type: Label })
    title: Label = null;


    start() {
        //默认不显示
        this.node.active = false;
    }

    update(deltaTime: number) {

    }

    async getRankList(): Promise<Array<{ address: string, points: number }>> {
        try {
            const level = window.localStorage.getItem("level")
            const res = await fetch(`https://test-game.degentest.com/get_list?level=${level}`)
            const res_json: { data: Array<{ address: string, points: number }> } = await res.json()
            return res_json.data
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * 显示该页面
     */
    async show() {
        const you = window.localStorage.getItem("address")
        this.node.setPosition(0, 0);
        this.node.active = true;
        this.content.removeAllChildren();
        const list_data = await this.getRankList()
        const level = window.localStorage.getItem("level")
        this.title.string = level.toUpperCase() + ' RANK LIST'
        for (let i = 0; i < list_data.length; i++) {
            let item = instantiate(this.pre_rank_item);
            item.setParent(this.content);
            item.setPosition(-7, i * -72 - 35);
            const addressLength = list_data[0].address.length
            if (list_data[i].address === you) {
                item.getChildByName("order").getComponent(Label).string = i + 1 + "";
                item.getChildByName("nick_name").getComponent(Label).string = `You: ${list_data[i].address.slice(0, 5)}...${list_data[i].address.slice(addressLength - 5, addressLength - 1)}`;
                item.getChildByName("score").getComponent(Label).string = list_data[i].points.toString();
            } else {
                //数据
                item.getChildByName("order").getComponent(Label).string = i + 1 + "";
                item.getChildByName("nick_name").getComponent(Label).string = `${list_data[i].address.slice(0, 5)}...${list_data[i].address.slice(addressLength - 5, addressLength - 1)}`;
                item.getChildByName("score").getComponent(Label).string = list_data[i].points.toString();
            }
        }
    }

    /**
     * 关闭该页面
     */
    close() {
        this.node.setPosition(-1000, 0);
        this.node.active = false;
    }
}

