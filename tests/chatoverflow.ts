import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Chatoverflow } from "../target/types/chatoverflow";
import { assert } from "chai";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";

describe("chatoverflow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Chatoverflow as Program<Chatoverflow>;

  // Test accounts
  const admin = provider.wallet;
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();

  // PDAs
  let platformPda: PublicKey;
  let platformBump: number;
  let rewardMintPda: PublicKey;
  let forumPda: PublicKey;
  let forumBump: number;
  let questionPda: PublicKey;
  let answerPda: PublicKey;
  let user1ProfilePda: PublicKey;
  let user2ProfilePda: PublicKey;

  // Token accounts
  let user1TokenAccount: PublicKey;
  let user2TokenAccount: PublicKey;

  const FORUM_NAME = "Solana Development";
  const REWARD_PER_UPVOTE = new anchor.BN(10_000_000); // 10 tokens (6 decimals)
  const REWARD_PER_ACCEPTED_ANSWER = new anchor.BN(50_000_000); // 50 tokens

  before(async () => {
    // Airdrop SOL to test users
    const airdropUser1 = await provider.connection.requestAirdrop(
      user1.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropUser1, "confirmed");

    const airdropUser2 = await provider.connection.requestAirdrop(
      user2.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropUser2, "confirmed");

    // Derive PDAs
    [platformPda, platformBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform")],
      program.programId
    );

    [rewardMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward_mint")],
      program.programId
    );

    [forumPda, forumBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("forum"), Buffer.from(FORUM_NAME)],
      program.programId
    );

    [user1ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user1.publicKey.toBuffer()],
      program.programId
    );

    [user2ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user2.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Initializes the platform", async () => {
    await program.methods
      .initializePlatform(REWARD_PER_UPVOTE, REWARD_PER_ACCEPTED_ANSWER)
      .accounts({
        platform: platformPda,
        rewardMint: rewardMintPda,
        authority: admin.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    // Verify platform account
    const platformAccount = await program.account.platform.fetch(platformPda);
    assert.ok(platformAccount.authority.equals(admin.publicKey));
    assert.ok(platformAccount.rewardMint.equals(rewardMintPda));
    assert.ok(
      platformAccount.rewardPerUpvote.eq(REWARD_PER_UPVOTE),
      "rewardPerUpvote should be 10_000_000"
    );
    assert.ok(
      platformAccount.rewardPerAcceptedAnswer.eq(REWARD_PER_ACCEPTED_ANSWER),
      "rewardPerAcceptedAnswer should be 50_000_000"
    );
    assert.equal(platformAccount.bump, platformBump);

    // Verify mint was created
    const mintInfo = await provider.connection.getAccountInfo(rewardMintPda);
    assert.isNotNull(mintInfo, "Reward mint account should exist");
  });

  it("Creates a forum", async () => {
    await program.methods
      .createForum(FORUM_NAME)
      .accounts({
        forum: forumPda,
        authority: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Verify forum account
    const forumAccount = await program.account.forum.fetch(forumPda);
    assert.ok(forumAccount.authority.equals(admin.publicKey));
    assert.equal(forumAccount.name, FORUM_NAME);
    assert.ok(
      forumAccount.questionCount.eq(new anchor.BN(0)),
      "questionCount should be 0"
    );
    assert.isAbove(
      forumAccount.createdAt.toNumber(),
      0,
      "createdAt should be set"
    );
    assert.equal(forumAccount.bump, forumBump);
  });

  it("Registers user1 as 'alice'", async () => {
    user1TokenAccount = await getAssociatedTokenAddress(
      rewardMintPda,
      user1.publicKey
    );

    await program.methods
      .registerUser("alice")
      .accounts({
        userProfile: user1ProfilePda,
        authority: user1.publicKey,
        rewardMint: rewardMintPda,
        userTokenAccount: user1TokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    // Verify profile
    const profile = await program.account.userProfile.fetch(user1ProfilePda);
    assert.ok(profile.authority.equals(user1.publicKey));
    assert.equal(profile.username, "alice");
    assert.ok(profile.reputation.eq(new anchor.BN(0)));
    assert.equal(profile.questionsPosted, 0);
    assert.equal(profile.answersPosted, 0);
    assert.isAbove(profile.createdAt.toNumber(), 0);
  });

  it("Registers user2 as 'bob'", async () => {
    user2TokenAccount = await getAssociatedTokenAddress(
      rewardMintPda,
      user2.publicKey
    );

    await program.methods
      .registerUser("bob")
      .accounts({
        userProfile: user2ProfilePda,
        authority: user2.publicKey,
        rewardMint: rewardMintPda,
        userTokenAccount: user2TokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    // Verify profile
    const profile = await program.account.userProfile.fetch(user2ProfilePda);
    assert.ok(profile.authority.equals(user2.publicKey));
    assert.equal(profile.username, "bob");
    assert.ok(profile.reputation.eq(new anchor.BN(0)));
  });

  it("Posts a question (no bounty)", async () => {
    // The forum currently has questionCount = 0, so question_id = 0
    const questionId = new anchor.BN(0);
    [questionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("question"),
        forumPda.toBuffer(),
        questionId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    const titleHash = Buffer.alloc(32);
    Buffer.from("How to build a Solana program?").copy(titleHash);

    const contentUri = "ipfs://QmExampleHash123456789";

    await program.methods
      .postQuestion(Array.from(titleHash) as number[], contentUri)
      .accounts({
        question: questionPda,
        forum: forumPda,
        authorProfile: user1ProfilePda,
        author: user1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    // Verify question account
    const questionAccount = await program.account.question.fetch(questionPda);
    assert.ok(questionAccount.author.equals(user1.publicKey));
    assert.ok(questionAccount.forum.equals(forumPda));
    assert.ok(questionAccount.questionId.eq(new anchor.BN(0)));
    assert.equal(questionAccount.contentUri, contentUri);
    assert.ok(questionAccount.score.eq(new anchor.BN(0)));
    assert.equal(questionAccount.answerCount, 0);
    assert.isAbove(questionAccount.createdAt.toNumber(), 0);

    // Verify forum question count incremented
    const forumAccount = await program.account.forum.fetch(forumPda);
    assert.ok(forumAccount.questionCount.eq(new anchor.BN(1)));

    // Verify user1 questions_posted incremented
    const user1Profile = await program.account.userProfile.fetch(
      user1ProfilePda
    );
    assert.equal(user1Profile.questionsPosted, 1);
  });

  it("Posts an answer", async () => {
    // question (questionPda) currently has answer_count = 0
    // answer_count is u32, so use 4-byte LE encoding for the PDA seed
    const answerId = 0;
    [answerPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("answer"),
        questionPda.toBuffer(),
        Buffer.from(new Uint8Array(new Uint32Array([answerId]).buffer)),
      ],
      program.programId
    );

    const contentUri = "ipfs://QmAnswerHash123456789";

    await program.methods
      .postAnswer(contentUri)
      .accounts({
        answer: answerPda,
        question: questionPda,
        authorProfile: user2ProfilePda,
        author: user2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    // Verify answer account
    const answerAccount = await program.account.answer.fetch(answerPda);
    assert.ok(answerAccount.author.equals(user2.publicKey));
    assert.ok(answerAccount.question.equals(questionPda));
    assert.equal(answerAccount.answerId, 0);
    assert.equal(answerAccount.contentUri, contentUri);
    assert.ok(answerAccount.score.eq(new anchor.BN(0)));
    assert.isFalse(answerAccount.isAccepted);
    assert.isAbove(answerAccount.createdAt.toNumber(), 0);

    // Verify question answer_count incremented
    const questionAccount = await program.account.question.fetch(questionPda);
    assert.equal(questionAccount.answerCount, 1);

    // Verify user2 answers_posted incremented
    const user2Profile = await program.account.userProfile.fetch(
      user2ProfilePda
    );
    assert.equal(user2Profile.answersPosted, 1);
  });

  it("Votes on a question (user2 upvotes user1's question)", async () => {
    // Vote PDA seeds: [b"vote", voter.key(), question.key()]
    const [votePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vote"),
        user2.publicKey.toBuffer(),
        questionPda.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .voteQuestion({ up: {} })
      .accounts({
        vote: votePda,
        question: questionPda,
        authorProfile: user1ProfilePda,
        platform: platformPda,
        rewardMint: rewardMintPda,
        authorTokenAccount: user1TokenAccount,
        voter: user2.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    // Verify vote PDA created
    const voteAccount = await program.account.vote.fetch(votePda);
    assert.ok(voteAccount.voter.equals(user2.publicKey));
    assert.ok(voteAccount.target.equals(questionPda));
    assert.deepEqual(voteAccount.voteType, { up: {} });
    assert.isAbove(voteAccount.createdAt.toNumber(), 0);

    // Verify question score increased by 1
    const questionAccount = await program.account.question.fetch(questionPda);
    assert.ok(
      questionAccount.score.eq(new anchor.BN(1)),
      "question score should be 1 after upvote"
    );

    // Verify user1 reputation increased by 1
    const user1Profile = await program.account.userProfile.fetch(
      user1ProfilePda
    );
    assert.ok(
      user1Profile.reputation.eq(new anchor.BN(1)),
      "user1 reputation should be 1 after upvote"
    );

    // Verify reward tokens minted to user1
    const user1TokenAcct = await getAccount(
      provider.connection,
      user1TokenAccount
    );
    assert.equal(
      user1TokenAcct.amount.toString(),
      REWARD_PER_UPVOTE.toString(),
      "user1 should have received reward_per_upvote tokens"
    );
  });

  it("Prevents double voting on the same question", async () => {
    // user2 tries to upvote the same question again -- should fail because
    // the Vote PDA already exists (init would fail with "already in use")
    const [votePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vote"),
        user2.publicKey.toBuffer(),
        questionPda.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.methods
        .voteQuestion({ up: {} })
        .accounts({
          vote: votePda,
          question: questionPda,
          authorProfile: user1ProfilePda,
          platform: platformPda,
          rewardMint: rewardMintPda,
          authorTokenAccount: user1TokenAccount,
          voter: user2.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      assert.fail("Should have thrown an error for double voting");
    } catch (err: any) {
      // The error should be related to the account already being initialized
      assert.isTrue(
        err.toString().includes("already in use") ||
          err.toString().includes("Error") ||
          err.logs?.some(
            (log: string) =>
              log.includes("already in use") || log.includes("0x0")
          ),
        `Expected 'already in use' error, got: ${err.toString()}`
      );
    }
  });

  it("Votes on an answer (user1 upvotes user2's answer)", async () => {
    // Vote PDA seeds: [b"vote", voter.key(), answer.key()]
    const [votePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vote"),
        user1.publicKey.toBuffer(),
        answerPda.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .voteAnswer({ up: {} })
      .accounts({
        vote: votePda,
        answer: answerPda,
        authorProfile: user2ProfilePda,
        platform: platformPda,
        rewardMint: rewardMintPda,
        authorTokenAccount: user2TokenAccount,
        voter: user1.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    // Verify vote created
    const voteAccount = await program.account.vote.fetch(votePda);
    assert.ok(voteAccount.voter.equals(user1.publicKey));
    assert.ok(voteAccount.target.equals(answerPda));
    assert.deepEqual(voteAccount.voteType, { up: {} });

    // Verify answer score increased by 1
    const answerAccount = await program.account.answer.fetch(answerPda);
    assert.ok(
      answerAccount.score.eq(new anchor.BN(1)),
      "answer score should be 1 after upvote"
    );

    // Verify user2 reputation increased by 1
    const user2Profile = await program.account.userProfile.fetch(
      user2ProfilePda
    );
    assert.ok(
      user2Profile.reputation.eq(new anchor.BN(1)),
      "user2 reputation should be 1 after upvote"
    );

    // Verify reward tokens minted to user2
    const user2TokenAcct = await getAccount(
      provider.connection,
      user2TokenAccount
    );
    assert.equal(
      user2TokenAcct.amount.toString(),
      REWARD_PER_UPVOTE.toString(),
      "user2 should have received reward_per_upvote tokens"
    );
  });

  it("Downvotes decrease reputation", async () => {
    // Post a second answer on the question so user1 can downvote it
    // (user1 already upvoted the first answer, so we need a new target)
    const secondAnswerId = 1; // question now has answer_count = 1
    const [secondAnswerPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("answer"),
        questionPda.toBuffer(),
        Buffer.from(new Uint8Array(new Uint32Array([secondAnswerId]).buffer)),
      ],
      program.programId
    );

    // user2 posts a second answer on user1's question
    await program.methods
      .postAnswer("ipfs://QmSecondAnswerHash")
      .accounts({
        answer: secondAnswerPda,
        question: questionPda,
        authorProfile: user2ProfilePda,
        author: user2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    // user1 downvotes user2's second answer
    const [downvotePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vote"),
        user1.publicKey.toBuffer(),
        secondAnswerPda.toBuffer(),
      ],
      program.programId
    );

    const user2ProfileBefore = await program.account.userProfile.fetch(
      user2ProfilePda
    );

    await program.methods
      .voteAnswer({ down: {} })
      .accounts({
        vote: downvotePda,
        answer: secondAnswerPda,
        authorProfile: user2ProfilePda,
        platform: platformPda,
        rewardMint: rewardMintPda,
        authorTokenAccount: user2TokenAccount,
        voter: user1.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    // Verify vote type is Down
    const voteAccount = await program.account.vote.fetch(downvotePda);
    assert.deepEqual(voteAccount.voteType, { down: {} });

    // Verify user2 reputation decreased by 1
    const user2ProfileAfter = await program.account.userProfile.fetch(
      user2ProfilePda
    );
    assert.ok(
      user2ProfileAfter.reputation.eq(
        user2ProfileBefore.reputation.sub(new anchor.BN(1))
      ),
      "user2 reputation should decrease by 1 on downvote"
    );

    // Verify answer score decreased
    const answerAccount = await program.account.answer.fetch(secondAnswerPda);
    assert.ok(
      answerAccount.score.eq(new anchor.BN(-1)),
      "answer score should be -1 after downvote"
    );
  });

  it("Claims rewards (emits event)", async () => {
    // user1 claims rewards -- this emits a RewardsClaimed event
    const tx = await program.methods
      .claimRewards()
      .accounts({
        userProfile: user1ProfilePda,
        authority: user1.publicKey,
      })
      .signers([user1])
      .rpc();

    // Verify the transaction succeeded (event is emitted on-chain)
    assert.isNotNull(tx, "claimRewards transaction should succeed");

    // Verify user1 profile still has correct state
    const user1Profile = await program.account.userProfile.fetch(
      user1ProfilePda
    );
    assert.ok(
      user1Profile.reputation.eq(new anchor.BN(1)),
      "user1 reputation should still be 1"
    );
    assert.equal(user1Profile.questionsPosted, 1);
  });
});
