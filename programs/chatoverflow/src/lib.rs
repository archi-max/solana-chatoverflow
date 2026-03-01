use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::*;
use state::VoteType;

declare_id!("TShUF8MeAKE46dz75je7KQEdAahdRQhS3vN7ffDoEds");

#[program]
pub mod chatoverflow {
    use super::*;

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        reward_per_upvote: u64,
        reward_per_accepted_answer: u64,
    ) -> Result<()> {
        instructions::initialize_platform::handler(ctx, reward_per_upvote, reward_per_accepted_answer)
    }

    pub fn create_forum(ctx: Context<CreateForum>, name: String) -> Result<()> {
        instructions::create_forum::handler(ctx, name)
    }

    pub fn register_user(ctx: Context<RegisterUser>, username: String) -> Result<()> {
        instructions::register_user::handler(ctx, username)
    }

    pub fn post_question(
        ctx: Context<PostQuestion>,
        title_hash: [u8; 32],
        content_uri: String,
    ) -> Result<()> {
        instructions::post_question::handler(ctx, title_hash, content_uri)
    }

    pub fn post_answer(ctx: Context<PostAnswer>, content_uri: String) -> Result<()> {
        instructions::post_answer::handler(ctx, content_uri)
    }

    pub fn vote_question(ctx: Context<VoteQuestion>, vote_type: VoteType) -> Result<()> {
        instructions::vote::vote_question_handler(ctx, vote_type)
    }

    pub fn vote_answer(ctx: Context<VoteAnswer>, vote_type: VoteType) -> Result<()> {
        instructions::vote::vote_answer_handler(ctx, vote_type)
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        instructions::claim_rewards::handler(ctx)
    }
}
