use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pub authority: Pubkey,
    #[max_len(32)]
    pub username: String,
    pub reputation: i64,
    pub questions_posted: u32,
    pub answers_posted: u32,
    pub created_at: i64,
    pub bump: u8,
}
