/*
/// Module: userInit
/// when SBT enter game first time will mint a SBT to the SBT
*/

module suiJumpJump::SuiJumpJump {
    use std::string::String;
    use sui::event;

    public struct SBT has key, store {
        id: UID,
        name: String,
        image_base64: String,
        records: vector<String>,
    }

    // event
    public struct Register has copy, drop {
        id: ID,
        minted_by: address,
        name: String
    }

    public fun name (nft: &SBT) : String {
        nft.name
    }

    public fun records (nft: &SBT): vector<String> {
        nft.records
    }

    public fun avatar (nft: &SBT): String {
        nft.image_base64
    }

    public fun set_avatar (nft: &mut SBT, image_base64: String) {
        nft.image_base64 = image_base64;
    }

    public fun destroy(nft: SBT) {
        let SBT { id, image_base64: _, name: _, records: _ } = nft;
        id.delete()
    }

    public entry fun add_record(nft: &mut SBT, record: String) {
        nft.records.push_back(record);
    }

    // SBT
    public entry fun mint_sbt(
        name: String, 
        records: vector<String>, 
        image_base64: String,
        ctx: &mut TxContext
    ) {
        let id = object::new(ctx);
        event::emit(Register {
            id: id.to_inner(),
            minted_by: ctx.sender(),
            name
        });

        let usr = SBT {
            id,
            name,
            image_base64,
            records
        };
        let sender = tx_context::sender(ctx);
        transfer::public_transfer(usr, sender);
    }
}