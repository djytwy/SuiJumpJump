/*
/// Module: prizePool
/// PvP mode play to earn
*/

module suiJumpJump::prizePool;
use sui::balance::{Balance, zero};
use sui::balance;
use sui::sui::SUI;
use std::string::{ String,};
use sui::coin::Coin;
use sui::coin;
// use sui::event;

// error:
const EAmountMustBeGreaterThanZero: u64 = 1;
const PoolBalanceIsNotEnough: u64 = 2;

// object:
public struct PrizePool has key, store {
    id: UID,
    level: String,
    balance: Balance<SUI>,
}

public struct AutherizeCap has key, store {
    id: UID,
}

// methods:
fun init (_ctx: &mut TxContext) {
    let gold_prize_pool = PrizePool {
        id: object::new(_ctx),
        balance: zero(),
        level: b"gold".to_string()
    };
    let sliver_prize_pool = PrizePool {
        id: object::new(_ctx),
        balance: zero(),
        level: b"sliver".to_string()
    };
    let bronze_prize_pool = PrizePool {
        id: object::new(_ctx),
        balance: zero(),
        level: b"bronze".to_string()
    };
    transfer::public_share_object(gold_prize_pool);
    transfer::public_share_object(sliver_prize_pool);
    transfer::public_share_object(bronze_prize_pool);
    transfer::public_transfer(AutherizeCap {
        id: object::new(_ctx)
    }, _ctx.sender())
}

public entry fun withdraw(_: &AutherizeCap, pool: &mut PrizePool, amount: u64, ctx: &mut TxContext){
    assert!(amount <= balance::value(&pool.balance), EAmountMustBeGreaterThanZero);
    let withdral_amount = balance::split(&mut pool.balance, amount);
    transfer::public_transfer(coin::from_balance<SUI>(withdral_amount, ctx), tx_context::sender(ctx));
}

public fun getPoolLevel (pool: &PrizePool): String {
    pool.level
}

public fun updateBalance (pool: &mut PrizePool, _coin : Coin<SUI>) {
    pool.balance.join(_coin.into_balance());
}

public(package) fun getBonus (pool: &mut PrizePool, amount: u64, ctx: &mut TxContext): Coin<SUI> {
    assert!(amount < pool.balance.value(), PoolBalanceIsNotEnough);
    let _bonusAmount = balance::split(&mut pool.balance, amount);
    let _sui = coin::from_balance<SUI>(_bonusAmount, ctx);
    _sui
}


// public entry fun distributeRank(
//     _: &AutherizeCap, 
//     pool: &mut PrizePool, 
//     _rankNum: u64,
//     recipients: vector<address>,
//     ctx: &mut TxContext
// ){
//     let mut i = 0;
//     let rewards_list : vector<u64> = vector[300,200,100,75,45,36,36,36,36,36];
//     let num_transfers = recipients.length();
//     let _sumAmount = balance::value(&pool.sui);
//     while (i < num_transfers) {
//         if (_rankNum == 0) {
//             let percentage = *vector::borrow(&rewards_list, i);
//             let recipient = *vector::borrow(&recipients, i);
//             let _amount: u64 = _sumAmount *  percentage / 1000;
//             pool.balance = pool.balance - _amount;
//             let withdral_amount = balance::split(&mut pool.sui, _amount);
//             assert!(_amount <= balance::value(&pool.sui), PoolDontHaveEnoughToken);
//             transfer::public_transfer(coin::from_balance(withdral_amount, ctx), recipient);
//         } else {
//             let _amount: u64 = (_sumAmount / _rankNum) * 90 / 100;
//             pool.balance = pool.balance - _amount;
//             let recipient = *vector::borrow(&recipients, i);
//             assert!(_amount <= balance::value(&pool.sui), PoolDontHaveEnoughToken);
//             let withdral_amount = balance::split(&mut pool.sui, _amount);
//             transfer::public_transfer(coin::from_balance(withdral_amount, ctx), recipient);
//         };
//         i = i + 1;
//     };
// }
