use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};

use crate::state::*;
use crate::errors::ChatOverflowError;

// ---------------------------------------------------------------------------
// vote_question
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct VoteQuestion<'info> {
    #[account(
        init,
        payer = voter,
        space = 8 + Vote::INIT_SPACE,
        seeds = [b"vote", voter.key().as_ref(), question.key().as_ref()],
        bump,
    )]
    pub vote: Account<'info, Vote>,

    #[account(mut)]
    pub question: Account<'info, Question>,

    /// The question author's profile — used to update reputation.
    #[account(
        mut,
        seeds = [b"user", question.author.as_ref()],
        bump = author_profile.bump,
        constraint = author_profile.authority == question.author,
    )]
    pub author_profile: Account<'info, UserProfile>,

    #[account(
        seeds = [b"platform"],
        bump = platform.bump,
    )]
    pub platform: Account<'info, Platform>,

    #[account(
        mut,
        seeds = [b"reward_mint"],
        bump,
    )]
    pub reward_mint: Account<'info, Mint>,

    /// Token account owned by the question author to receive reward tokens.
    #[account(
        mut,
        constraint = author_token_account.mint == reward_mint.key(),
    )]
    pub author_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = voter.key() != question.author @ ChatOverflowError::CannotVoteOnOwnContent,
    )]
    pub voter: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn vote_question_handler(ctx: Context<VoteQuestion>, vote_type: VoteType) -> Result<()> {
    let question = &mut ctx.accounts.question;
    let author_profile = &mut ctx.accounts.author_profile;
    let vote_account = &mut ctx.accounts.vote;
    let platform = &ctx.accounts.platform;

    // Persist vote record (PDA prevents double-voting).
    vote_account.voter = ctx.accounts.voter.key();
    vote_account.target = question.key();
    vote_account.vote_type = vote_type.clone();
    vote_account.created_at = Clock::get()?.unix_timestamp;
    vote_account.bump = ctx.bumps.vote;

    // Update score & reputation.
    match vote_type {
        VoteType::Up => {
            question.score = question.score.checked_add(1).unwrap();
            author_profile.reputation = author_profile.reputation.checked_add(1).unwrap();

            // Mint reward tokens to the content author.
            if platform.reward_per_upvote > 0 {
                let platform_seeds: &[&[u8]] = &[b"platform", &[platform.bump]];
                let signer_seeds = &[platform_seeds];

                token::mint_to(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        MintTo {
                            mint: ctx.accounts.reward_mint.to_account_info(),
                            to: ctx.accounts.author_token_account.to_account_info(),
                            authority: ctx.accounts.platform.to_account_info(),
                        },
                        signer_seeds,
                    ),
                    platform.reward_per_upvote,
                )?;
            }
        }
        VoteType::Down => {
            question.score = question.score.checked_sub(1).unwrap();
            author_profile.reputation = author_profile.reputation.checked_sub(1).unwrap();
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// vote_answer
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct VoteAnswer<'info> {
    #[account(
        init,
        payer = voter,
        space = 8 + Vote::INIT_SPACE,
        seeds = [b"vote", voter.key().as_ref(), answer.key().as_ref()],
        bump,
    )]
    pub vote: Account<'info, Vote>,

    #[account(mut)]
    pub answer: Account<'info, Answer>,

    /// The answer author's profile — used to update reputation.
    #[account(
        mut,
        seeds = [b"user", answer.author.as_ref()],
        bump = author_profile.bump,
        constraint = author_profile.authority == answer.author,
    )]
    pub author_profile: Account<'info, UserProfile>,

    #[account(
        seeds = [b"platform"],
        bump = platform.bump,
    )]
    pub platform: Account<'info, Platform>,

    #[account(
        mut,
        seeds = [b"reward_mint"],
        bump,
    )]
    pub reward_mint: Account<'info, Mint>,

    /// Token account owned by the answer author to receive reward tokens.
    #[account(
        mut,
        constraint = author_token_account.mint == reward_mint.key(),
    )]
    pub author_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = voter.key() != answer.author @ ChatOverflowError::CannotVoteOnOwnContent,
    )]
    pub voter: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn vote_answer_handler(ctx: Context<VoteAnswer>, vote_type: VoteType) -> Result<()> {
    let answer = &mut ctx.accounts.answer;
    let author_profile = &mut ctx.accounts.author_profile;
    let vote_account = &mut ctx.accounts.vote;
    let platform = &ctx.accounts.platform;

    // Persist vote record (PDA prevents double-voting).
    vote_account.voter = ctx.accounts.voter.key();
    vote_account.target = answer.key();
    vote_account.vote_type = vote_type.clone();
    vote_account.created_at = Clock::get()?.unix_timestamp;
    vote_account.bump = ctx.bumps.vote;

    // Update score & reputation.
    match vote_type {
        VoteType::Up => {
            answer.score = answer.score.checked_add(1).unwrap();
            author_profile.reputation = author_profile.reputation.checked_add(1).unwrap();

            // Mint reward tokens to the content author.
            if platform.reward_per_upvote > 0 {
                let platform_seeds: &[&[u8]] = &[b"platform", &[platform.bump]];
                let signer_seeds = &[platform_seeds];

                token::mint_to(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        MintTo {
                            mint: ctx.accounts.reward_mint.to_account_info(),
                            to: ctx.accounts.author_token_account.to_account_info(),
                            authority: ctx.accounts.platform.to_account_info(),
                        },
                        signer_seeds,
                    ),
                    platform.reward_per_upvote,
                )?;
            }
        }
        VoteType::Down => {
            answer.score = answer.score.checked_sub(1).unwrap();
            author_profile.reputation = author_profile.reputation.checked_sub(1).unwrap();
        }
    }

    Ok(())
}
