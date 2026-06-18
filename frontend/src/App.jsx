import { useState } from "react";
import * as snarkjs from "snarkjs";
import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
} from "@stellar/freighter-api";
import { proofToHex, publicSignalsToHex } from "./lib/snarkHex";
import { verifyProofOnSoroban } from "./lib/stellarVerify";
import { transferUSDC } from "./lib/usdcTransfer";

const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID ||
  "CBNGVDN6DH4LRK6LDIKSR5EP7BDEWK4SDD7YZSMIZNW5NIHQT4SRXSR6";
const RPC_URL =
  import.meta.env.VITE_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";

const AMOUNT_LIMIT = "10000";
const BLACKLISTED_WALLET = "999888777666";

function hashWalletAddress(addr) {
  let h = BigInt(0);
  for (let i = 0; i < addr.length; i++) {
    h = (h * BigInt(31) + BigInt(addr.charCodeAt(i))) % (BigInt(2) ** BigInt(63));
  }
  return h.toString();
}

export default function App() {
  // ── ZK-Remit inputs ────────────────────────────────────────────────────────
  const [amount, setAmount]       = useState("500");
  const [recipient, setRecipient] = useState("");
  const [kycHash, setKycHash]     = useState("1234567890");

  // ── Proof output ───────────────────────────────────────────────────────────
  const [proofHex, setProofHex]           = useState("");
  const [publicHex, setPublicHex]         = useState("");
  const [publicSignals, setPublicSignals] = useState([]);

  // ── Freighter wallet ───────────────────────────────────────────────────────
  const [freighterKey, setFreighterKey]   = useState("");
  const [busyConnect, setBusyConnect]     = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [busyGenerate, setBusyGenerate] = useState(false);
  const [busyVerify, setBusyVerify]     = useState(false);
  const [message, setMessage]           = useState(
    "Conecta Freighter y genera un ZK proof para verificar en Soroban testnet."
  );
  const [verifyResult, setVerifyResult] = useState(null);
  const [txHash, setTxHash]             = useState("");

  // ── Connect Freighter ──────────────────────────────────────────────────────
  async function onConnectFreighter() {
    setBusyConnect(true);
    try {
      const installed = await isConnected();
      if (!installed?.isConnected) {
        setMessage("Freighter no está instalado. Instálalo desde freighter.app y recarga.");
        return;
      }

      const allowed = await isAllowed();
      if (!allowed?.isAllowed) {
        // requestAccess also returns { address, error? } in v6
        const accessResult = await requestAccess();
        if (accessResult?.error) {
          setMessage(`Freighter: acceso denegado. ${accessResult.error}`);
          return;
        }
        // requestAccess already gives us the address on success
        if (accessResult?.address) {
          setFreighterKey(accessResult.address);
          setMessage(`Freighter conectado: ${accessResult.address.slice(0, 10)}...`);
          return;
        }
      }

      // Already allowed — just fetch the address
      const addrResult = await getAddress();
      if (addrResult?.error) {
        setMessage(`Freighter: error obteniendo dirección. ${addrResult.error}`);
        return;
      }
      if (!addrResult?.address) {
        setMessage("Freighter: no se obtuvo ninguna dirección. ¿Está desbloqueado?");
        return;
      }

      setFreighterKey(addrResult.address);
      setMessage(`Freighter conectado: ${addrResult.address.slice(0, 10)}...`);
    } catch (err) {
      setMessage(`Error conectando Freighter: ${err.message || String(err)}`);
    } finally {
      setBusyConnect(false);
    }
  }

  // ── Proof generation ───────────────────────────────────────────────────────
  async function onGenerateProof(e) {
    e.preventDefault();
    setBusyGenerate(true);
    setVerifyResult(null);
    setProofHex("");
    setPublicHex("");

    try {
      const walletHash = hashWalletAddress(recipient.trim());

      const input = {
        kyc_hash:     kycHash.trim(),
        amount:       amount.trim(),
        wallet_hash:  walletHash,
        amount_limit: AMOUNT_LIMIT,
        blacklisted:  BLACKLISTED_WALLET,
      };

      setMessage("Generando ZK proof en el browser (snarkjs Groth16)...");

      const { proof, publicSignals: pub } = await snarkjs.groth16.fullProve(
        input,
        "/circuits/zkremit.wasm",
        "/proving/zkremit_final.zkey"
      );

      const nextProofHex  = proofToHex(proof);
      const nextPublicHex = publicSignalsToHex(pub);

      setProofHex(nextProofHex);
      setPublicHex(nextPublicHex);
      setPublicSignals(pub);
      setMessage(
        `Proof generado. Monto ${amount} <= ${AMOUNT_LIMIT} ✓ | ` +
        `KYC commitment: ${pub[0].slice(0, 12)}... | ` +
        `Wallet no bloqueada ✓`
      );
    } catch (err) {
      setMessage(`Error al generar proof: ${err.message || String(err)}`);
    } finally {
      setBusyGenerate(false);
    }
  }

  // ── Verify on-chain → transfer USDC if approved ───────────────────────────
  async function onVerifyAndSend(e) {
    e.preventDefault();
    if (!freighterKey) {
      setMessage("Conecta Freighter primero (Panel 2).");
      return;
    }
    if (!recipient.trim()) {
      setMessage("Ingresa la dirección del destinatario en el Panel 1.");
      return;
    }

    setBusyVerify(true);
    setVerifyResult(null);
    setTxHash("");

    try {
      // ── Step 1: verify ZK proof on Soroban (simulation, no signing needed) ──
      setMessage("Verificando ZK proof on-chain...");
      const { verified } = await verifyProofOnSoroban({
        rpcUrl: RPC_URL,
        networkPassphrase: NETWORK_PASSPHRASE,
        contractId: CONTRACT_ID,
        sourcePublicKey: freighterKey,
        proofHex,
        publicHex,
      });

      setVerifyResult(verified);

      if (!verified) {
        setMessage("Verificación RECHAZADA. El proof no es válido — no se realizará ninguna transferencia.");
        return;
      }

      // ── Step 2: transfer USDC (Freighter will show signing popup) ────────────
      setMessage("Proof verificado ✓ — Aprueba la transferencia en Freighter...");
      const { hash } = await transferUSDC({
        rpcUrl: RPC_URL,
        networkPassphrase: NETWORK_PASSPHRASE,
        fromPublicKey: freighterKey,
        toPublicKey: recipient.trim(),
        amount,
      });

      setTxHash(hash);
      setMessage(`¡Transferencia enviada! ${amount} USDC → ${recipient.trim().slice(0, 10)}...`);
    } catch (err) {
      setMessage(`Error: ${err.message || String(err)}`);
    } finally {
      setBusyVerify(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />

      <main className="container">
        <header className="hero">
          <p className="eyebrow">ZK-REMIT · CIRCOM + GROTH16 + STELLAR SOROBAN</p>
          <h1>ZK-Remit</h1>
          <p className="subtitle">
            Remesas privadas: prueba KYC + cumplimiento AML on-chain sin revelar tu identidad ni el monto exacto.
          </p>
        </header>

        <section className="panel-grid">

          {/* ── Panel 1: Generar Proof ──────────────────────────────────── */}
          <article className="panel">
            <h2>1. Enviar con privacidad ZK</h2>
            <form onSubmit={onGenerateProof} className="stack">

              <label>
                Monto a enviar
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="numeric"
                  placeholder="500"
                  required
                />
              </label>
              <div className="pill">
                Límite AML: {AMOUNT_LIMIT} — el proof verifica que tu monto no lo supera
              </div>

              <label>
                Dirección destinatario (Stellar G...)
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="GABC...XYZ"
                  required
                />
              </label>

              <label>
                KYC Hash (simulado — número que representa tu documento)
                <input
                  value={kycHash}
                  onChange={(e) => setKycHash(e.target.value)}
                  inputMode="numeric"
                  placeholder="1234567890"
                  required
                />
              </label>
              <div className="pill muted">
                MOCK: en producción, el KYC hash lo genera el proveedor KYC de forma privada
              </div>

              <button type="submit" className="btn btn-primary" disabled={busyGenerate}>
                {busyGenerate ? "Generando proof ZK..." : "Generar ZK Proof"}
              </button>
            </form>

            {/* Proof hex (editable para demo de corrupción) */}
            <div className="stack" style={{ marginTop: "1rem" }}>
              <label>
                Proof hex (editable)
                <textarea
                  value={proofHex}
                  onChange={(e) => setProofHex(e.target.value)}
                  placeholder="El proof generado aparece aquí"
                  rows={5}
                />
              </label>
              <label>
                Public signals hex (editable)
                <textarea
                  value={publicHex}
                  onChange={(e) => setPublicHex(e.target.value)}
                  placeholder="Los public signals aparecen aquí"
                  rows={3}
                />
              </label>
              {publicSignals.length > 0 && (
                <div className="muted" style={{ fontSize: "0.8em" }}>
                  <div>kyc_commitment: {publicSignals[0]?.slice(0, 20)}...</div>
                  <div>amount_limit: {publicSignals[1]}</div>
                  <div>blacklisted (mock): {publicSignals[2]}</div>
                </div>
              )}
            </div>
          </article>

          {/* ── Panel 2: Conectar Freighter + Verificar ─────────────────── */}
          <article className="panel">
            <h2>2. Verificar en Soroban Testnet</h2>

            {/* Freighter connection */}
            <div className="stack" style={{ marginBottom: "1.5rem" }}>
              {freighterKey ? (
                <div className="freighter-connected">
                  <span className="dot-green" />
                  <span>
                    Freighter conectado<br />
                    <span className="muted" style={{ fontSize: "0.8em", wordBreak: "break-all" }}>
                      {freighterKey}
                    </span>
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-freighter"
                  onClick={onConnectFreighter}
                  disabled={busyConnect}
                >
                  {busyConnect ? "Conectando..." : "Conectar Freighter"}
                </button>
              )}
            </div>

            <form onSubmit={onVerifyAndSend} className="stack">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busyVerify || !proofHex || !publicHex || !freighterKey}
              >
                {busyVerify ? "Procesando..." : "Verificar y Enviar USDC"}
              </button>
            </form>

            <div className="result-box">
              <p>{message}</p>
              {verifyResult !== null && (
                <p className={verifyResult ? "ok" : "bad"}>
                  verifier.verify(...) =&gt; {String(verifyResult)}
                </p>
              )}
              {txHash && (
                <p className="tx-link">
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver transacción en stellar.expert ↗
                  </a>
                </p>
              )}
            </div>
          </article>

        </section>
      </main>
    </div>
  );
}
