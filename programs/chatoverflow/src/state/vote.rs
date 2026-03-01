use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, InitSpace)]
pub enum VoteType {
    Up,
    Down,
}

#[account]
#[derive(InitSpace)]
pub struct Vote {
    pub voter: Pubkey,
    pub target: Pubkey,
    pub vote_type: VoteType,
    pub created_at: i64,
    pub bump: u8,
}
