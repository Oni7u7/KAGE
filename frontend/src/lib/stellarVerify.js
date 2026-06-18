import * as StellarSdk from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import { hexToBytes } from "./snarkHex.js";

function retvalToBool(retval) {
  if (!retval) throw new Error("No return value from simulation");

  const scVal =
    typeof retval === "string" ? StellarSdk.xdr.ScVal.fromXDR(retval, "base64") : retval;

  if (typeof StellarSdk.scValToNative === "function") {
    return Boolean(StellarSdk.scValToNative(scVal));
  }

  if (scVal.switch().name === "scvBool") return scVal.b();

  throw new Error("Unexpected return type from contract");
}

/**
 * Calls verify() on the Soroban contract and submits it on-chain so the
 * ZK verification is recorded in stellar.expert (Tx 1).
 *
 * Flow (mirrors usdcTransfer.js):
 *   1. Build invokeContractFunction tx calling verify(proof, publicSignals)
 *   2. simulateTransaction → read return value + get ledger footprint
 *   3. assembleTransaction → attach footprint + fee bump
 *   4. Freighter signTransaction → user approves in wallet popup
 *   5. sendTransaction → broadcast on-chain
 *
 * Returns { verified: boolean, hash: string }
 */
export async function verifyProofOnSoroban({
  rpcUrl,
  networkPassphrase,
  contractId,
  sourcePublicKey,
  proofHex,
  publicHex,
}) {
  const rpc = StellarSdk.SorobanRpc ?? StellarSdk.rpc;
  if (!rpc?.Server) throw new Error("Soroban RPC SDK is unavailable in this build");

  const server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });

  try {
    StellarSdk.Keypair.fromPublicKey(sourcePublicKey);
  } catch {
    throw new Error("Public key inválida. Conecta Freighter primero.");
  }

  const account = await server.getAccount(sourcePublicKey);

  const op = StellarSdk.Operation.invokeContractFunction({
    contract: contractId.trim(),
    function: "verify",
    args: [
      StellarSdk.xdr.ScVal.scvBytes(hexToBytes(proofHex)),
      StellarSdk.xdr.ScVal.scvBytes(hexToBytes(publicHex)),
    ],
  });

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(60)
    .build();

  // Simulate: read verified bool + obtain ledger footprint
  const simulation = await server.simulateTransaction(tx);
  if (rpc.Api?.isSimulationError?.(simulation) || simulation.error) {
    const err = simulation.error ?? simulation;
    throw new Error(typeof err === "string" ? err : JSON.stringify(err));
  }

  const verified = retvalToBool(simulation.result?.retval);

  // Assemble: attach footprint + updated fee to the tx
  const assembleTransaction = rpc.assembleTransaction ?? StellarSdk.assembleTransaction;
  const preparedTx = assembleTransaction(tx, simulation).build();

  // Sign via Freighter (user sees wallet popup for Tx 1)
  const signResult = await signTransaction(preparedTx.toXDR(), { networkPassphrase });
  if (signResult?.error) {
    throw new Error(`Freighter rechazó la firma: ${signResult.error}`);
  }
  const signedXdr = signResult?.signedTxXdr;
  if (!signedXdr) throw new Error("Freighter no devolvió una transacción firmada.");

  // Broadcast on-chain — this is the tx that appears in stellar.expert as Tx 1
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
  const sendResult = await server.sendTransaction(signedTx);
  console.log("[stellarVerify] sendTransaction result:", sendResult);

  if (sendResult.status === "ERROR") {
    const detail = sendResult.errorResult
      ? JSON.stringify(sendResult.errorResult)
      : sendResult.status;
    throw new Error(`La verificación fue rechazada por la red: ${detail}`);
  }

  const verifyTxHash = sendResult.hash;

  // Poll until verify tx is confirmed before returning.
  // This prevents the USDC transfer from hitting a sequence-number conflict
  // (both txs would use seq N+1 if we don't wait for the ledger to advance).
  console.log("[stellarVerify] Waiting for verify tx confirmation:", verifyTxHash);
  await waitForConfirmation(server, rpc, verifyTxHash);
  console.log("[stellarVerify] Verify tx confirmed.");

  return { verified, hash: verifyTxHash };
}

/**
 * Polls getTransaction until the tx is SUCCESS or FAILED (or timeout).
 * Soroban closes a ledger every ~5 s, so 12 attempts × 5 s = 60 s max.
 */
async function waitForConfirmation(server, rpc, hash, maxAttempts = 12) {
  const NOT_FOUND =
    rpc?.Api?.GetTransactionStatus?.NOT_FOUND ??
    rpc?.GetTransactionStatus?.NOT_FOUND ??
    "NOT_FOUND";

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(5000);
    let result;
    try {
      result = await server.getTransaction(hash);
    } catch (e) {
      console.warn("[stellarVerify] getTransaction error (retrying):", e.message);
      continue;
    }
    console.log(`[stellarVerify] poll ${i + 1}/${maxAttempts} status:`, result?.status);
    if (result?.status !== NOT_FOUND) {
      if (result?.status === "FAILED") {
        throw new Error(`La transacción de verificación falló on-chain: ${JSON.stringify(result)}`);
      }
      return; // SUCCESS or any terminal state
    }
  }
  // Timed out — return anyway so the USDC transfer can proceed
  console.warn("[stellarVerify] Timed out waiting for verify tx, proceeding anyway.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
