import * as StellarSdk from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

// Stellar Asset Contract for USDC on testnet
const USDC_CONTRACT_ID = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
// USDC on Stellar uses 7 decimal places (same as XLM stroops)
const USDC_DECIMALS = 7;

/**
 * Transfers USDC via the SAC (Stellar Asset Contract) interface.
 *
 * Flow:
 *   1. Build invokeContractFunction tx calling transfer(from, to, amount)
 *   2. simulateTransaction → get ledger footprint + auth entries
 *   3. assembleTransaction → attach simulation results to tx
 *   4. Freighter signTransaction → user approves in wallet popup
 *   5. sendTransaction → broadcast to testnet
 *
 * @param {object} opts
 * @param {string} opts.rpcUrl
 * @param {string} opts.networkPassphrase
 * @param {string} opts.fromPublicKey   - sender (Freighter wallet)
 * @param {string} opts.toPublicKey     - recipient Stellar G... address
 * @param {string|number} opts.amount   - integer USDC units, e.g. 500 → 500 USDC
 * @returns {{ hash: string }}
 */
export async function transferUSDC({ rpcUrl, networkPassphrase, fromPublicKey, toPublicKey, amount }) {
  const rpc = StellarSdk.SorobanRpc ?? StellarSdk.rpc;
  if (!rpc?.Server) throw new Error("Soroban RPC SDK no disponible.");

  const server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });

  // Validate recipient
  try {
    StellarSdk.Keypair.fromPublicKey(toPublicKey);
  } catch {
    throw new Error("Dirección del destinatario inválida.");
  }

  // Load sender account (needed for sequence number)
  const account = await server.getAccount(fromPublicKey);

  // Amount in i128 stroops: 500 USDC → 5_000_000_000
  const amountI128 = BigInt(amount) * BigInt(10 ** USDC_DECIMALS);

  // Build the Soroban token `transfer(from, to, amount)` invocation
  const op = StellarSdk.Operation.invokeContractFunction({
    contract: USDC_CONTRACT_ID,
    function: "transfer",
    args: [
      StellarSdk.nativeToScVal(fromPublicKey, { type: "address" }),
      StellarSdk.nativeToScVal(toPublicKey,   { type: "address" }),
      StellarSdk.nativeToScVal(amountI128,    { type: "i128" }),
    ],
  });

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(60)
    .build();

  // Simulate to obtain ledger footprint and auth entries
  const simulation = await server.simulateTransaction(tx);
  if (rpc.Api?.isSimulationError?.(simulation) || simulation.error) {
    const raw = simulation.error ?? simulation;
    throw new Error(typeof raw === "string" ? raw : JSON.stringify(raw));
  }

  // Assemble: merge footprint + auth + fee into a ready-to-sign tx
  const assembleTransaction = rpc.assembleTransaction ?? StellarSdk.assembleTransaction;
  const preparedTx = assembleTransaction(tx, simulation).build();

  // Hand off to Freighter for user approval (v6 returns { signedTxXdr, signerAddress, error? })
  const signResult = await signTransaction(preparedTx.toXDR(), { networkPassphrase });

  if (signResult?.error) {
    throw new Error(`Freighter rechazó la firma: ${signResult.error}`);
  }

  const signedXdr = signResult?.signedTxXdr;
  if (!signedXdr) throw new Error("Freighter no devolvió una transacción firmada.");

  // Reconstruct and broadcast
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    const detail =
      sendResult.errorResult
        ? JSON.stringify(sendResult.errorResult)
        : sendResult.status;
    throw new Error(`La transacción fue rechazada por la red: ${detail}`);
  }

  return { hash: sendResult.hash };
}

/**
 * Reads the USDC balance of an address via Soroban simulation (no signing needed).
 * Returns the balance as a human-readable string (e.g. "500.00") or null on error.
 *
 * @param {object} opts
 * @param {string} opts.rpcUrl
 * @param {string} opts.networkPassphrase
 * @param {string} opts.address  - Stellar G... address to check
 * @returns {Promise<string|null>}
 */
export async function getUSDCBalance({ rpcUrl, networkPassphrase, address }) {
  const rpc = StellarSdk.SorobanRpc ?? StellarSdk.rpc;
  if (!rpc?.Server) return null;

  const server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });

  try {
    const account = await server.getAccount(address);

    const op = StellarSdk.Operation.invokeContractFunction({
      contract: USDC_CONTRACT_ID,
      function: "balance",
      args: [StellarSdk.nativeToScVal(address, { type: "address" })],
    });

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(op)
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (sim.result?.retval) {
      const raw = StellarSdk.scValToNative(sim.result.retval);
      return (Number(raw) / 10 ** USDC_DECIMALS).toFixed(2);
    }
    return "0.00";
  } catch {
    return null;
  }
}
