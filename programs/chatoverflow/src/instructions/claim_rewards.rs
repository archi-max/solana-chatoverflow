use anchor_lang::prelude::*;

use crate::state::*;

/// ClaimRewards is a lightweight instruction that emits an on-chain event
/// recording a user's current reward state. Actual $OVERFLOW token transfers
/// are performed by the user via standard SPL token instructions — no custom
/// program logic is required for that.
///
/// This instruction serves as an on-chain attestation: the user signals that
/// they have "claimed" (acknowledged) their accumulated rewards, and the event
/// can be indexed off-chain for analytics / leaderboard purposes.

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(
        seeds = [b"user", authority.key().as_ref()],
        bump = user_profile.bump,
        constraint = user_profile.authority == authority.key(),
    )]
    pub user_profile: Account<'info, UserProfile>,

    pub authority: Signer<'info>,
}

#[event]
pub struct RewardsClaimed {
    pub user: Pubkey,
    pub reputation: i64,
    pub questions_posted: u32,
    pub answers_posted: u32,
    pub timestamp: i64,
}

pub fn handler(ctx: Context<ClaimRewards>) -> Result<()> {
    let profile = &ctx.accounts.user_profile;

    emit!(RewardsClaimed {
        user: profile.authority,
        reputation: profile.reputation,
        questions_posted: profile.questions_posted,
        answers_posted: profile.answers_posted,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
