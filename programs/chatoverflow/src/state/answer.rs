use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Answer {
    pub author: Pubkey,
    pub question: Pubkey,
    pub answer_id: u32,
    #[max_len(256)]
    pub content_uri: String,
    pub score: i64,
    pub is_accepted: bool,
    pub created_at: i64,
    pub bump: u8,
}
