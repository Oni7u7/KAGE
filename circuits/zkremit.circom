pragma circom 2.0.0;

// circomlib provides Poseidon (ZK-friendly hash) and comparators
// Install with: npm install circomlib
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

/*
 * ZK-Remit: Privacy-preserving remittance compliance circuit
 *
 * Proves three compliance claims WITHOUT revealing private data:
 *
 *   Claim 1 – KYC valid:
 *     Prover knows kyc_hash s.t. Poseidon(kyc_hash) == kyc_commitment.
 *     The KYC provider publishes kyc_commitment; the prover reveals only
 *     the hash output, never the raw document identifier.
 *
 *   Claim 2 – AML compliant:
 *     amount <= amount_limit.
 *     The exact amount is never revealed; the verifier only learns it
 *     is within the regulatory ceiling.
 *
 *   Claim 3 – Non-blacklisted wallet (MOCK):
 *     wallet_hash != blacklisted.
 *     MOCK: checks against ONE hardcoded blocked value, not a full list.
 *     TODO (production): replace with a Merkle non-membership proof
 *     against a published blacklist_root. The prover would supply the
 *     sibling path; the circuit would verify the path against the root.
 *
 * ─── Signals ────────────────────────────────────────────────────────────────
 * Private inputs  (never leave the prover):
 *   kyc_hash      – secret KYC document identifier
 *   amount        – transfer amount (e.g. micro-USDC, 6 decimals)
 *   wallet_hash   – numeric hash of the sender's Stellar address
 *
 * Public inputs   (known to the on-chain verifier):
 *   amount_limit  – AML per-transfer ceiling (e.g. 10 000 USDC)
 *   blacklisted   – MOCK: one blocked wallet_hash value
 *
 * Public output   (revealed by the proof, verifiable on-chain):
 *   kyc_commitment – Poseidon(kyc_hash); verifier cross-checks against
 *                    the KYC-provider registry (mock in this demo)
 * ────────────────────────────────────────────────────────────────────────────
 */
template ZKRemit() {

    // ── Private inputs ───────────────────────────────────────────────────────
    signal input kyc_hash;      // Secret KYC document identifier
    signal input amount;        // Transfer amount (non-negative integer)
    signal input wallet_hash;   // Numeric hash of sender's Stellar G-address

    // ── Public inputs (verifier-supplied) ───────────────────────────────────
    signal input amount_limit;  // AML ceiling — regulator-published value
    signal input blacklisted;   // MOCK: single blocked wallet_hash

    // ── Public output (computed inside circuit, exposed in proof) ────────────
    signal output kyc_commitment; // = Poseidon(kyc_hash)

    // ════════════════════════════════════════════════════════════════════════
    // Claim 1: Valid KYC commitment
    // Poseidon(kyc_hash) is computed inside the circuit and exposed as a
    // public output. The verifier checks it against an off-chain registry.
    // ════════════════════════════════════════════════════════════════════════
    component poseidon = Poseidon(1);
    poseidon.inputs[0] <== kyc_hash;
    kyc_commitment <== poseidon.out;

    // ════════════════════════════════════════════════════════════════════════
    // Claim 2: AML amount compliance — amount <= amount_limit
    // LessEqThan(n) requires both operands < 2^n.
    // n=64 supports amounts up to ~1.8 × 10^19 micro-units (>10^12 USDC).
    // ════════════════════════════════════════════════════════════════════════
    component lte = LessEqThan(64);
    lte.in[0] <== amount;
    lte.in[1] <== amount_limit;
    lte.out === 1;  // MUST hold: amount <= amount_limit

    // ════════════════════════════════════════════════════════════════════════
    // Claim 3: Non-blacklisted wallet (MOCK — single value check)
    // IsEqual outputs 1 iff in[0] == in[1]; we assert it must be 0.
    //
    // MOCK: only blocks one specific wallet_hash value.
    // TODO (production): Replace with Merkle non-membership proof:
    //   - Public input becomes blacklist_root (Merkle root of blocked wallets)
    //   - Private inputs include the Merkle sibling path
    //   - Circuit verifies path and proves wallet_hash is NOT in the set
    // ════════════════════════════════════════════════════════════════════════
    component isEqual = IsEqual();
    isEqual.in[0] <== wallet_hash;
    isEqual.in[1] <== blacklisted;
    isEqual.out === 0;  // MUST hold: wallet NOT equal to blacklisted value
}

// Public signals in proof order: [kyc_commitment, amount_limit, blacklisted]
// (circom: outputs first, then public inputs in declaration order)
// The generic Soroban Groth16 verifier reads count from first 4 bytes — no
// contract changes needed regardless of how many public signals there are.
component main {public [amount_limit, blacklisted]} = ZKRemit();
