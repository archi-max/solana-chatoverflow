use anchor_lang::prelude::*;

use crate::state::*;

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateForum<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Forum::INIT_SPACE,
        seeds = [b"forum", name.as_bytes()],
        bump,
    )]
    pub forum: Account<'info, Forum>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateForum>, name: String) -> Result<()> {
    let forum = &mut ctx.accounts.forum;
    forum.authority = ctx.accounts.authority.key();
    forum.name = name;
    forum.question_count = 0;
    forum.created_at = Clock::get()?.unix_timestamp;
    forum.bump = ctx.bumps.forum;

    Ok(())
}
