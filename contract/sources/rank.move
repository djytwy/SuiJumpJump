module suiJumpJump::rank;
use sui::dynamic_object_field as dof;
use std::string::String;

public struct RankTable has key, store {
    id: UID,
    rankTable: String
}

public struct RankRecords has key, store {
    id: UID,
}

public struct RankAutherizeCap has key,store {
    id:UID
}

fun init(ctx: &mut TxContext) {
     let t = RankTable {
        id: object::new(ctx),
        rankTable: b"".to_string()
    };
    let mut records = RankRecords {
        id: object::new(ctx),
    };
    let cap = RankAutherizeCap {
        id: object::new(ctx)
    };
    transfer::public_transfer(cap, ctx.sender());
    dof::add(&mut records.id, b"2024-12-29".to_string(), t);
    transfer::public_share_object(records);
}

entry fun addToTable (_: &RankAutherizeCap, records: &mut RankRecords, add: address, tableKey: String, score: String) {
    let _table: &mut RankTable = dof::borrow_mut(&mut records.id, tableKey);
    let _score = concat_strings(add.to_string(), score);
    _table.rankTable = concat_strings(_table.rankTable, _score);
}

fun concat_strings(s1: String, s2: String): String {
    let mut str = b"".to_string();
    str.append(s1);
    str.append(s2);
    str
}

entry fun createTable (_: &RankAutherizeCap, records: &mut RankRecords, time: String ,ctx: &mut TxContext) {
    let todayTable = RankTable {
        id: object::new(ctx),
        rankTable: b"".to_string()
    };
    dof::add(&mut records.id, time, todayTable);
}

