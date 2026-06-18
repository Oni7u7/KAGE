import * as StellarSdk from "@stellar/stellar-sdk";
import { hexToBytes } from "./snarkHex.js";

function readOnlyResultToBool(retval) {
  if (!retval) {
    throw new Error("No return value from simulation");
  }

  const scVal =
    typeof retval === "string" ? StellarSdk.xdr.ScVal.fromXDR(retval, "base64") : retval;

  if (typeof StellarSdk.scValToNative === "function") {
    return Boolean(StellarSdk.scValToNative(scVal));
  }

  if (scVal.switch().name === "scvBool") {
    return scVal.b();
  }

  throw new Error("Unexpected return type from contract");
}

/**
 * Calls verify() on the Soroban contract via simulation (read-only, no signing needed).
 * sourcePublicKey must come from Freighter (getPublicKey()).
 */
export async function verifyProofOnSoroban({
  rpcUrl,
  networkPassphrase,
  contractId,
  sourcePublicKey,
  proofHex,
  publicHex,
}) {
  const rpcNamespace = StellarSdk.SorobanRpc || StellarSdk.rpc;
  if (!rpcNamespace?.Server) {
    throw new Error("Soroban RPC SDK is unavailable in this build");
  }

  const server = new rpcNamespace.Server(rpcUrl, {
    allowHttp: rpcUrl.startsWith("http://"),
  });

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
    fee: "100",
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(tx);

  if (rpcNamespace.Api?.isSimulationError?.(simulation) || simulation.error) {
    const err = simulation.error || simulation;
    throw new Error(typeof err === "string" ? err : JSON.stringify(err));
  }

  const verified = readOnlyResultToBool(simulation.result?.retval);

  return { verified, sourcePublicKey };
}
