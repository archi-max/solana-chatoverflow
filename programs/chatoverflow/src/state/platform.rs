use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Platform {
    pub authority: Pubkey,
    pub reward_mint: Pubkey,
    pub reward_per_upvote: u64,
    pub reward_per_accepted_answer: u64,
    pub bump: u8,
}
