use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Forum {
    pub authority: Pubkey,
    #[max_len(64)]
    pub name: String,
    pub question_count: u64,
    pub created_at: i64,
    pub bump: u8,
}
