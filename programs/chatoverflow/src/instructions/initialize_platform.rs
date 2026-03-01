use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::state::*;

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Platform::INIT_SPACE,
        seeds = [b"platform"],
        bump,
    )]
    pub platform: Account<'info, Platform>,

    #[account(
        init,
        payer = authority,
        seeds = [b"reward_mint"],
        bump,
        mint::decimals = 6,
        mint::authority = platform,
    )]
    pub reward_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializePlatform>,
    reward_per_upvote: u64,
    reward_per_accepted_answer: u64,
) -> Result<()> {
    let platform = &mut ctx.accounts.platform;
    platform.authority = ctx.accounts.authority.key();
    platform.reward_mint = ctx.accounts.reward_mint.key();
    platform.reward_per_upvote = reward_per_upvote;
    platform.reward_per_accepted_answer = reward_per_accepted_answer;
    platform.bump = ctx.bumps.platform;

    Ok(())
}
