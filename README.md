# Circom Groth16 Verification on Stellar (Soroban)


Minimal end-to-end demo for verifying a Circom Groth16 proof on Soroban.

## What this repo demonstrates

- Circom circuit: `a * b = c` (`circuits/multiplier2.circom`)
- Soroban verifier contract using BLS12-381 pairing checks (`contract/src/lib.rs`)
- Rust CLI to convert `snarkjs` JSON outputs into Soroban byte payloads (`tools/circom_to_soroban_hex/`)
- Scripted flow to build, deploy, generate proof, and verify on-chain (`demo.sh`)
- React frontend for browser-side proof generation + contract verification (`frontend/`)

## Repository layout

- `circuits/`: Circom sources
- `proving/`: proving artifacts and sample inputs (`.zkey`, `.wtns`, `input.json`)
- `contract/`: Soroban verifier contract
- `tools/circom_to_soroban_hex/`: JSON -> hex encoder for Soroban contract arguments
- `frontend/`: Vite + React demo UI
- `build/`: generated artifacts (`proof.json`, `public.json`, hex outputs); safe to regenerate

## Prerequisites

- Rust toolchain (workspace uses Rust 2021; contract crate sets `rust-version = 1.89.0`)
- Soroban target:

  ```bash
  rustup target add wasm32v1-none
  ```

- Node.js + npm
- `stellar` CLI configured with a funded Testnet account as your active/default identity

## Quickstart (full on-chain flow)

Run everything with one command:

```bash
./demo.sh
```

By default, this uses `NETWORK=testnet`. You can override it:

```bash
NETWORK=testnet ./demo.sh
```

Expected end state in output:

- Contract deployed (prints a `C...` contract ID)
- Local `snarkjs` verification succeeds
- On-chain verification result is `true`

## What `demo.sh` does

1. Installs root Node dependency (`snarkjs`)
2. Builds the Soroban contract WASM
3. Deploys the verifier contract to the selected network
4. Generates `proof.json` and `public.json` from the witness
5. Verifies locally with `snarkjs`
6. Encodes verification key/proof/public inputs into Soroban byte format
7. Calls `set_vk` then `verify` on-chain

## Useful commands

Workspace checks:

```bash
cargo check --workspace
cargo test --workspace
```

Manual encoding examples:

```bash
cargo run -p circom-to-soroban-hex -- vk build/verification_key.json
cargo run -p circom-to-soroban-hex -- proof build/proof.json
cargo run -p circom-to-soroban-hex -- public build/public.json
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Generate some keys at https://lab.stellar.org and fund it with friendbot to get some testnet xlm. Then add the secret key and public key to the .env file.

Frontend production build:

```bash
cd frontend
npm run build
```


## Troubleshooting

- `stellar contract deploy` fails:
  - Ensure your active CLI identity is configured and funded on Testnet.
- On-chain result is not `true`:
  - Regenerate `build/` artifacts via `./demo.sh` to avoid stale proof/key mismatch.
- Frontend simulation errors:
  - Check `VITE_RPC_URL`, `VITE_NETWORK_PASSPHRASE`, and contract ID are on the same network.

## Resources
- https://developers.stellar.org/
- https://docs.circom.io/


## Links
- https://jamesbachini.com
- https://www.youtube.com/c/JamesBachini
- https://bachini.substack.com
- https://podcasters.spotify.com/pod/show/jamesbachini
- https://x.com/james_bachini
- https://www.linkedin.com/in/james-bachini/
- https://github.com/jamesbachini

## Disclaimer

This project is **experimental** and intended for learning, prototyping, and demonstration purposes.
It has **not been audited**.

Use at your own risk.

---

## License

MIT

