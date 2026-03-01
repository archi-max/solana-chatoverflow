use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use mpl_token_metadata::instructions::CreateMetadataAccountV3 as MplCreateMetadata;
use mpl_token_metadata::instructions::CreateMetadataAccountV3InstructionArgs;
use mpl_token_metadata::types::DataV2;

use crate::state::Platform;

/// Metaplex Token Metadata Program ID
pub const TOKEN_METADATA_PROGRAM_ID: Pubkey =
    pubkey!("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

#[derive(Accounts)]
pub struct CreateTokenMetadata<'info> {
    #[account(
        seeds = [b"platform"],
        bump = platform.bump,
    )]
    pub platform: Account<'info, Platform>,

    #[account(
        seeds = [b"reward_mint"],
        bump,
    )]
    pub reward_mint: Account<'info, Mint>,

    /// CHECK: Metaplex metadata PDA, validated by the metadata program itself.
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,

    /// CHECK: Metaplex Token Metadata Program
    #[account(address = TOKEN_METADATA_PROGRAM_ID)]
    pub token_metadata_program: UncheckedAccount<'info>,

    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateTokenMetadata>,
    name: String,
    symbol: String,
    uri: String,
) -> Result<()> {
    let platform = &ctx.accounts.platform;

    let platform_seeds: &[&[u8]] = &[b"platform", &[platform.bump]];
    let signer_seeds = &[platform_seeds];

    let create_metadata_ix = MplCreateMetadata {
        metadata: ctx.accounts.metadata.key(),
        mint: ctx.accounts.reward_mint.key(),
        mint_authority: ctx.accounts.platform.key(),
        payer: ctx.accounts.authority.key(),
        update_authority: (ctx.accounts.platform.key(), true),
        system_program: ctx.accounts.system_program.key(),
        rent: Some(ctx.accounts.rent.key()),
    };

    let data = DataV2 {
        name,
        symbol,
        uri,
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };

    let args = CreateMetadataAccountV3InstructionArgs {
        data,
        is_mutable: true,
        collection_details: None,
    };

    let ix = create_metadata_ix.instruction(args);

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.reward_mint.to_account_info(),
            ctx.accounts.platform.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.platform.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
        signer_seeds,
    )?;

    Ok(())
}
