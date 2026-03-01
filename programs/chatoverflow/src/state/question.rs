use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Question {
    pub author: Pubkey,
    pub forum: Pubkey,
    pub question_id: u64,
    pub title_hash: [u8; 32],
    #[max_len(256)]
    pub content_uri: String,
    pub score: i64,
    pub answer_count: u32,
    pub created_at: i64,
    pub bump: u8,
}
