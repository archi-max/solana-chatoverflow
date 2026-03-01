import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  Connection,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

async function main() {
  // Load wallet
  const keypairPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  console.log("Wallet pubkey:", wallet.publicKey.toBase58());

  // Setup connection and provider
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Wallet balance:", balance / 1e9, "SOL");

  const anchorWallet = new anchor.Wallet(wallet);
  const provider = new anchor.AnchorProvider(connection, anchorWallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load IDL and program
  const idlPath = path.join(__dirname, "..", "target", "idl", "chatoverflow.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const programId = new PublicKey(
    "TShUF8MeAKE46dz75je7KQEdAahdRQhS3vN7ffDoEds"
  );
  const program = new Program(idl, provider);

  // Derive PDAs
  const [platformPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform")],
    programId
  );
  const [rewardMintPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("reward_mint")],
    programId
  );
  const [forumPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("forum"), Buffer.from("General")],
    programId
  );
  const [userProfilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user"), wallet.publicKey.toBuffer()],
    programId
  );

  console.log("Platform PDA:", platformPda.toBase58());
  console.log("Reward Mint PDA:", rewardMintPda.toBase58());
  console.log("Forum PDA:", forumPda.toBase58());
  console.log("User Profile PDA:", userProfilePda.toBase58());

  // Step 1: Initialize Platform
  console.log("\n--- Step 1: Initialize Platform ---");
  try {
    const tx1 = await (program.methods as any)
      .initializePlatform(
        new anchor.BN(10_000_000), // reward_per_upvote: 10 tokens (6 decimals)
        new anchor.BN(50_000_000) // reward_per_accepted_answer: 50 tokens
      )
      .accounts({
        platform: platformPda,
        rewardMint: rewardMintPda,
        authority: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([wallet])
      .rpc();
    console.log("initialize_platform tx:", tx1);
  } catch (err: any) {
    if (err.message?.includes("already in use")) {
      console.log("Platform already initialized, skipping...");
    } else {
      console.error("Error initializing platform:", err.message || err);
      throw err;
    }
  }

  // Step 2: Create Forum "General"
  console.log("\n--- Step 2: Create Forum 'General' ---");
  try {
    const tx2 = await (program.methods as any)
      .createForum("General")
      .accounts({
        forum: forumPda,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([wallet])
      .rpc();
    console.log("create_forum tx:", tx2);
  } catch (err: any) {
    if (err.message?.includes("already in use")) {
      console.log("Forum 'General' already exists, skipping...");
    } else {
      console.error("Error creating forum:", err.message || err);
      throw err;
    }
  }

  // Step 3: Register admin user
  console.log("\n--- Step 3: Register Admin User ---");
  // Get the ATA for the user
  const userTokenAccount = await anchor.utils.token.associatedAddress({
    mint: rewardMintPda,
    owner: wallet.publicKey,
  });
  console.log("User Token Account (ATA):", userTokenAccount.toBase58());

  try {
    const tx3 = await (program.methods as any)
      .registerUser("admin")
      .accounts({
        userProfile: userProfilePda,
        authority: wallet.publicKey,
        rewardMint: rewardMintPda,
        userTokenAccount: userTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([wallet])
      .rpc();
    console.log("register_user tx:", tx3);
  } catch (err: any) {
    if (err.message?.includes("already in use")) {
      console.log("Admin user already registered, skipping...");
    } else {
      console.error("Error registering user:", err.message || err);
      throw err;
    }
  }

  console.log("\n--- Initialization Complete ---");

  // Verify: fetch platform account
  try {
    const platformAccount = await (program.account as any).platform.fetch(
      platformPda
    );
    console.log("\nPlatform account data:");
    console.log("  Authority:", platformAccount.authority.toBase58());
    console.log("  Reward Mint:", platformAccount.rewardMint.toBase58());
    console.log(
      "  Reward per upvote:",
      platformAccount.rewardPerUpvote.toString()
    );
    console.log(
      "  Reward per accepted answer:",
      platformAccount.rewardPerAcceptedAnswer.toString()
    );
  } catch (err: any) {
    console.log("Could not fetch platform account:", err.message);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
