/*
/// Module: prizePool
/// PvP mode play to earn
/// rank 1: 30%
/// rank 2: 20%
/// rank 3: 10%
/// rank 4: 7.5%
/// rank 5: 4.5%
/// rank 6 - rank 10: 3.6%
/// if player < 10 use _rankNum to distribute rank
/// every rank: sum * 0.9 / _rankNum
*/

module suiJumpJump::prizePool {
    use sui::balance::{Balance, zero};
    use sui::balance;
    use sui::sui::SUI;
    use sui::coin::Coin;
    use sui::coin;
    use sui::event;

    // error:
    const EAmountMustBeGreaterThanZero: u64 = 1;
    const PoolDontHaveEnoughToken: u64 = 3;

    // event:
    public struct AddGold has copy, drop {
        sender: address,
        amount: u64,
    }

    public struct AddSliver has copy, drop {
        sender: address,
        amount: u64,
    }

    public struct Addbronze has copy, drop {
        sender: address,
        amount: u64,
    }

    // object:
    public struct PrizePool has key, store {
        id: UID,
        sui: Balance<SUI>,
        balance: u64,
        owner: address
    }

    public struct AutherizeCap has key, store {
        id: UID,
    }

    // methods:
    fun init (_ctx: &mut TxContext) {
        let gold_prize_pool = PrizePool {
            id: object::new(_ctx),
            sui: zero(),
            owner: _ctx.sender(),
            balance: 0
        };
        let sliver_prize_pool = PrizePool {
            id: object::new(_ctx),
            sui: zero(),
            owner: _ctx.sender(),
            balance: 0
        };
        let bronze_prize_pool = PrizePool {
            id: object::new(_ctx),
            sui: zero(),
            owner: _ctx.sender(),
            balance: 0
        };
        transfer::public_share_object(gold_prize_pool);
        transfer::public_share_object(sliver_prize_pool);
        transfer::public_share_object(bronze_prize_pool);
        transfer::public_transfer(AutherizeCap {
            id: object::new(_ctx)
        }, _ctx.sender())
    }

    public entry fun addGoldPool (pool: &mut PrizePool, _coin: Coin<SUI>, ctx: &mut TxContext) {
        assert!(_coin.value() > 0, EAmountMustBeGreaterThanZero);
        event::emit(AddGold{
            sender: ctx.sender(),
            amount: _coin.value()
        });
        pool.balance = pool.balance + _coin.value();
        pool.sui.join(_coin.into_balance());
    }

    public entry fun addSliverPool (pool: &mut PrizePool, _coin: Coin<SUI>, ctx: &mut TxContext) {
        assert!(_coin.value() > 0, EAmountMustBeGreaterThanZero);
        event::emit(AddSliver{
            sender: ctx.sender(),
            amount: _coin.value()
        });
        pool.balance = pool.balance + _coin.value();
        pool.sui.join(_coin.into_balance());
    }

    public entry fun addBronzePool (pool: &mut PrizePool, _coin: Coin<SUI>, ctx: &mut TxContext) {
        assert!(_coin.value() > 0, EAmountMustBeGreaterThanZero);
        event::emit(Addbronze{
            sender: ctx.sender(),
            amount: _coin.value()
        });
        pool.balance = pool.balance + _coin.value();
        pool.sui.join(_coin.into_balance());
    }

    public entry fun withdraw(_: &AutherizeCap, pool: &mut PrizePool, amount: u64, ctx: &mut TxContext){
        assert!(amount <= balance::value(&pool.sui), EAmountMustBeGreaterThanZero);
        let withdral_amount = balance::split(&mut pool.sui, amount);
        transfer::public_transfer(coin::from_balance(withdral_amount, ctx), tx_context::sender(ctx));
    }

    public entry fun distributeRank(
        _: &AutherizeCap, 
        pool: &mut PrizePool, 
        _rankNum: u64,
        recipients: vector<address>,
        ctx: &mut TxContext
    ){
        let mut i = 0;
        let rewards_list : vector<u64> = vector[300,200,100,75,45,36,36,36,36,36];
        let num_transfers = recipients.length();
        let _sumAmount = balance::value(&pool.sui);
        while (i < num_transfers) {
            if (_rankNum == 0) {
                let percentage = *vector::borrow(&rewards_list, i);
                let recipient = *vector::borrow(&recipients, i);
                let _amount: u64 = _sumAmount *  percentage / 1000;
                pool.balance = pool.balance - _amount;
                let withdral_amount = balance::split(&mut pool.sui, _amount);
                assert!(_amount <= balance::value(&pool.sui), PoolDontHaveEnoughToken);
                transfer::public_transfer(coin::from_balance(withdral_amount, ctx), recipient);
            } else {
                let _amount: u64 = (_sumAmount / _rankNum) * 90 / 100;
                pool.balance = pool.balance - _amount;
                let recipient = *vector::borrow(&recipients, i);
                assert!(_amount <= balance::value(&pool.sui), PoolDontHaveEnoughToken);
                let withdral_amount = balance::split(&mut pool.sui, _amount);
                transfer::public_transfer(coin::from_balance(withdral_amount, ctx), recipient);
            };
            i = i + 1;
        };
    }
}