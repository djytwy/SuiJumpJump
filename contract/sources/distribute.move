module suiJumpJump::distribute;

use sui::random::{ new_generator, generate_u64_in_range, Random};
use suiJumpJump::Ticket::{ Ticket, getTicketLevel, getTicketPrice, delTicket };
use suiJumpJump::prizePool::{ PrizePool, getBonus, getPoolLevel };

// errors:
const TicketAndPoolIsNotMathch: u64 = 5;

// // random: 0x8
// #[allow(lint(unnecessary_math))]
entry fun distributeBonus (points: u64, _ticket: Ticket, pool: &mut PrizePool ,random: &Random ,ctx: &mut TxContext) {
    // let ticketLevel = getTicketLevel(ticket);
    let ticketLevel = _ticket.getTicketLevel();
    let poolLevel = getPoolLevel(pool);
    assert!(ticketLevel == poolLevel, TicketAndPoolIsNotMathch);
    // let ticketPrice = getTicketPrice(ticket);
    let ticketPrice = _ticket.getTicketPrice();
    let mut _points = 0;
    // 200 is max
    if (points > 200) {
        _points = 200;
    } else {
        _points = points;
    };
    // bonus = 0.2 * ticketPrice * random / 100 + 0.3 * ticketPrice * points / 200 = 2/10 * ticketPrice * random / 100 + 3/10 * ticketPrice * points / 200 = (2 * ticketPrice * r) / 1000 + 3 * ticketPrice * points / 2000
    let mut random_generator = new_generator(random, ctx);
    let r = generate_u64_in_range(&mut random_generator, 10, 100);
    let bonusAmount = (2 * ticketPrice * r) / 1000 + 3 * ticketPrice * points / 2000;
    let sui = getBonus(pool, bonusAmount, ctx);
    transfer::public_transfer(sui, ctx.sender());
    delTicket(_ticket);
}

entry public fun distributeRank () {

}