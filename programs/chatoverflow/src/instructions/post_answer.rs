use anchor_lang::prelude::*;

use crate::state::*;

#[derive(Accounts)]
pub struct PostAnswer<'info> {
    #[account(
        init,
        payer = author,
        space = 8 + Answer::INIT_SPACE,
        seeds = [b"answer", question.key().as_ref(), &question.answer_count.to_le_bytes()],
        bump,
    )]
    pub answer: Account<'info, Answer>,

    #[account(mut)]
    pub question: Account<'info, Question>,

    #[account(
        mut,
        seeds = [b"user", author.key().as_ref()],
        bump = author_profile.bump,
        constraint = author_profile.authority == author.key(),
    )]
    pub author_profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub author: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PostAnswer>, content_uri: String) -> Result<()> {
    let question = &mut ctx.accounts.question;
    let answer = &mut ctx.accounts.answer;
    let author_profile = &mut ctx.accounts.author_profile;

    let answer_id = question.answer_count;
    question.answer_count = question.answer_count.checked_add(1).unwrap();

    answer.author = ctx.accounts.author.key();
    answer.question = question.key();
    answer.answer_id = answer_id;
    answer.content_uri = content_uri;
    answer.score = 0;
    answer.is_accepted = false;
    answer.created_at = Clock::get()?.unix_timestamp;
    answer.bump = ctx.bumps.answer;

    author_profile.answers_posted = author_profile.answers_posted.checked_add(1).unwrap();

    Ok(())
}
