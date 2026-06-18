#!/usr/bin/env bash
# ZK-Remit demo — Groth16 proof for private remittances verified on Stellar testnet
# Replaces the original multiplier circuit with zkremit.circom
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK="${NETWORK:-testnet}"

cd "$ROOT_DIR"
mkdir -p build

# ─── 1. Node dependencies ────────────────────────────────────────────────────
echo "Installing Node dependencies (snarkjs, circomlib)..."
npm install --silent --no-audit --no-fund

# ─── 2. Soroban contract ─────────────────────────────────────────────────────
# The generic Groth16 verifier needs NO changes for zkremit — it accepts any
# number of public signals encoded in the first 4 bytes of pub_signals_bytes.
echo "Building Soroban contract..."
(cd contract && stellar contract build --optimize)

# ─── 3. Compile circuit ──────────────────────────────────────────────────────
echo "Compiling circuits/zkremit.circom (BLS12-381 field)..."
# -p bls12381 is required: circom-to-soroban-hex and the Soroban contract both
# operate on BLS12-381. Default circom prime is BN128 (bn254), which produces
# coordinates that fail the is_on_curve() check in ark-bls12-381.
circom "$ROOT_DIR/circuits/zkremit.circom" \
  --r1cs --wasm --sym \
  -p bls12381 \
  -o "$ROOT_DIR/build/" \
  -l "$ROOT_DIR/node_modules"

# ─── 4. Trusted setup — Powers of Tau (phase 1) ──────────────────────────────
# pot12 supports up to 4096 constraints; zkremit uses ~486. Cache after first run.
# Must use bls12381 — delete build/pot12_bls12381_final.ptau to force regeneration.
# (Filename includes curve name to avoid accidentally reusing a BN128 pot.)
if [ ! -f "$ROOT_DIR/build/pot12_bls12381_final.ptau" ]; then
  echo "Generating Powers of Tau (phase 1, pot12, BLS12-381)..."
  # MOCK entropy: acceptable for testnet / hackathon demo.
  # TODO (production): use a multi-party ceremony (e.g., Hermez snarkjs ceremony)
  npx snarkjs powersoftau new bls12381 12 \
    "$ROOT_DIR/build/pot12_0000.ptau" -e="zkremit-hackathon"
  npx snarkjs powersoftau contribute \
    "$ROOT_DIR/build/pot12_0000.ptau" \
    "$ROOT_DIR/build/pot12_0001.ptau" \
    --name="ZKRemit" -e="zkremit-dev-entropy"
  npx snarkjs powersoftau prepare phase2 \
    "$ROOT_DIR/build/pot12_0001.ptau" \
    "$ROOT_DIR/build/pot12_bls12381_final.ptau"
  echo "Powers of Tau ready."
else
  echo "Reusing cached build/pot12_bls12381_final.ptau"
fi

# ─── 5. Circuit-specific trusted setup (phase 2) ─────────────────────────────
# Regenerate zkey if the circuit changed (detected via SHA-256 of .r1cs).
CIRCUIT_HASH="$(sha256sum "$ROOT_DIR/build/zkremit.r1cs" | cut -d' ' -f1)"
CIRCUIT_HASH_FILE="$ROOT_DIR/build/.zkremit_r1cs_hash"
REGEN_ZKEY=false
if [ ! -f "$ROOT_DIR/proving/zkremit_final.zkey" ] || \
   [ ! -f "$CIRCUIT_HASH_FILE" ] || \
   [ "$(cat "$CIRCUIT_HASH_FILE" 2>/dev/null)" != "$CIRCUIT_HASH" ]; then
  REGEN_ZKEY=true
fi

if $REGEN_ZKEY; then
  echo "Generating circuit-specific zkey (phase 2)..."
  npx snarkjs groth16 setup \
    "$ROOT_DIR/build/zkremit.r1cs" \
    "$ROOT_DIR/build/pot12_bls12381_final.ptau" \
    "$ROOT_DIR/build/zkremit_0000.zkey"
  # MOCK contribution — replace with real randomness for production
  npx snarkjs zkey contribute \
    "$ROOT_DIR/build/zkremit_0000.zkey" \
    "$ROOT_DIR/proving/zkremit_final.zkey" \
    --name="ZKRemit" -e="zkremit-zkey-entropy"
  echo "$CIRCUIT_HASH" > "$CIRCUIT_HASH_FILE"
  echo "zkremit_final.zkey ready."
else
  echo "Reusing cached proving/zkremit_final.zkey"
fi

# ─── 6. Witness generation ───────────────────────────────────────────────────
echo "Generating witness from proving/input_zkremit.json..."
node "$ROOT_DIR/build/zkremit_js/generate_witness.js" \
  "$ROOT_DIR/build/zkremit_js/zkremit.wasm" \
  "$ROOT_DIR/proving/input_zkremit.json" \
  "$ROOT_DIR/build/witness_zkremit.wtns"

# ─── 7. Deploy verifier contract ─────────────────────────────────────────────
echo "Deploying verifier contract to $NETWORK..."
DEPLOY_OUTPUT="$(stellar contract deploy \
  --source-account myaccount \
  --wasm "$ROOT_DIR/target/wasm32v1-none/release/soroban_groth16_verifier.wasm" \
  --network "$NETWORK")"
CONTRACT_ID="$(echo "$DEPLOY_OUTPUT" | grep -Eo 'C[A-Z0-9]{55}' | tail -n1)"
test -n "$CONTRACT_ID"
echo "Contract ID: $CONTRACT_ID"

# ─── 8. Generate Groth16 proof ───────────────────────────────────────────────
echo "Generating Groth16 proof..."
npx snarkjs groth16 prove \
  "$ROOT_DIR/proving/zkremit_final.zkey" \
  "$ROOT_DIR/build/witness_zkremit.wtns" \
  "$ROOT_DIR/build/proof.json" \
  "$ROOT_DIR/build/public.json"

npx snarkjs zkey export verificationkey \
  "$ROOT_DIR/proving/zkremit_final.zkey" \
  "$ROOT_DIR/build/verification_key.json"

# ─── 9. Local verification ───────────────────────────────────────────────────
echo "Verifying proof locally with snarkjs..."
npx snarkjs groth16 verify \
  "$ROOT_DIR/build/verification_key.json" \
  "$ROOT_DIR/build/public.json" \
  "$ROOT_DIR/build/proof.json"

# ─── 10. Encode for Soroban ──────────────────────────────────────────────────
echo "Encoding verification artifacts into Soroban byte format..."
cargo run --quiet -p circom-to-soroban-hex -- vk    "$ROOT_DIR/build/verification_key.json" > "$ROOT_DIR/build/vk.hex"
cargo run --quiet -p circom-to-soroban-hex -- proof  "$ROOT_DIR/build/proof.json"            > "$ROOT_DIR/build/proof.hex"
cargo run --quiet -p circom-to-soroban-hex -- public "$ROOT_DIR/build/public.json"            > "$ROOT_DIR/build/public.hex"

VK_HEX="$(tr -d '\r\n' < "$ROOT_DIR/build/vk.hex")"
PROOF_HEX="$(tr -d '\r\n' < "$ROOT_DIR/build/proof.hex")"
PUBLIC_HEX="$(tr -d '\r\n' < "$ROOT_DIR/build/public.hex")"

# ─── 11. Store VK on-chain ───────────────────────────────────────────────────
echo "Storing verification key in contract..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --network "$NETWORK" \
  --source-account myaccount \
  -- set_vk --vk_bytes "$VK_HEX" >/dev/null

# ─── 12. On-chain verification ───────────────────────────────────────────────
echo "Verifying proof on-chain..."
VERIFY_RESULT="$(stellar contract invoke \
  --id "$CONTRACT_ID" \
  --network "$NETWORK" \
  --source-account myaccount \
  -- verify --proof_bytes "$PROOF_HEX" --pub_signals_bytes "$PUBLIC_HEX")"

echo "On-chain verification result: $VERIFY_RESULT"
test "$VERIFY_RESULT" = "true"

# ─── 13. Copy artifacts to frontend ──────────────────────────────────────────
echo "Copying circuit artifacts to frontend/public/..."
mkdir -p "$ROOT_DIR/frontend/public/circuits"
mkdir -p "$ROOT_DIR/frontend/public/proving"
cp "$ROOT_DIR/build/zkremit_js/zkremit.wasm" \
   "$ROOT_DIR/frontend/public/circuits/zkremit.wasm"
cp "$ROOT_DIR/proving/zkremit_final.zkey" \
   "$ROOT_DIR/frontend/public/proving/zkremit_final.zkey"

echo ""
echo "Success: ZK-Remit Groth16 proof verified on Stellar testnet."
echo "Public signals (revealed by proof):"
echo "  [0] kyc_commitment  — Poseidon(kyc_hash), verifier checks KYC registry"
echo "  [1] amount_limit    — AML ceiling used in proof"
echo "  [2] blacklisted     — blocked wallet_hash used in proof (MOCK)"
cat "$ROOT_DIR/build/public.json"
