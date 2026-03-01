use anchor_lang::prelude::*;

#[error_code]
pub enum ChatOverflowError {
    #[msg("You are not authorized to perform this action")]
    Unauthorized,
    #[msg("Question is already resolved")]
    QuestionAlreadyResolved,
    #[msg("Answer is already accepted")]
    AnswerAlreadyAccepted,
    #[msg("Invalid bounty amount")]
    InvalidBountyAmount,
    #[msg("Username too long (max 32 characters)")]
    UsernameTooLong,
    #[msg("Forum name too long (max 64 characters)")]
    ForumNameTooLong,
    #[msg("Content URI too long (max 256 characters)")]
    ContentUriTooLong,
    #[msg("Cannot vote on your own content")]
    CannotVoteOnOwnContent,
    #[msg("Insufficient funds for bounty")]
    InsufficientFunds,
    #[msg("No bounty to claim")]
    NoBounty,
    #[msg("Missing required bounty accounts")]
    MissingBountyAccounts,
    #[msg("Arithmetic overflow")]
    Overflow,
}
