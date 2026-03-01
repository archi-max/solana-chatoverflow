use anchor_lang::prelude::*;

use crate::errors::ChatOverflowError;
use crate::state::*;

#[derive(Accounts)]
pub struct PostQuestion<'info> {
    #[account(
        init,
        payer = author,
        space = 8 + Question::INIT_SPACE,
        seeds = [b"question", forum.key().as_ref(), &forum.question_count.to_le_bytes()],
        bump,
    )]
    pub question: Account<'info, Question>,

    #[account(mut)]
    pub forum: Account<'info, Forum>,

    #[account(
        mut,
        seeds = [b"user", author.key().as_ref()],
        bump = author_profile.bump,
        constraint = author_profile.authority == author.key() @ ChatOverflowError::Unauthorized,
    )]
    pub author_profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub author: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<PostQuestion>,
    title_hash: [u8; 32],
    content_uri: String,
) -> Result<()> {
    let forum = &mut ctx.accounts.forum;
    let question_id = forum.question_count;

    let question = &mut ctx.accounts.question;
    question.author = ctx.accounts.author.key();
    question.forum = forum.key();
    question.question_id = question_id;
    question.title_hash = title_hash;
    question.content_uri = content_uri;
    question.score = 0;
    question.answer_count = 0;
    question.created_at = Clock::get()?.unix_timestamp;
    question.bump = ctx.bumps.question;

    forum.question_count = forum
        .question_count
        .checked_add(1)
        .ok_or(ChatOverflowError::Overflow)?;
    ctx.accounts.author_profile.questions_posted = ctx
        .accounts
        .author_profile
        .questions_posted
        .checked_add(1)
        .ok_or(ChatOverflowError::Overflow)?;

    Ok(())
}
