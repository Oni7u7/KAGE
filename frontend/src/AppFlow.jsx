import { useState } from "react";

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const CheckIconLg = () => (
  <svg width="1.7rem" height="1.7rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
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

function StepDot({ n, label, done, active }) {
  const cls = "step-dot" + (done ? " done" : active ? " active" : "");
  return (
    <div className="step-item">
      <div className={cls}>{done ? <CheckIcon /> : n}</div>
      <span className="step-label">{label}</span>
    </div>
  );
}

export default function AppFlow({ onBack }) {
  // ── Kage inputs ────────────────────────────────────────────────────────────
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
        const accessResult = await requestAccess();
        if (accessResult?.error) {
          setMessage(`Freighter: acceso denegado. ${accessResult.error}`);
          return;
        }
        if (accessResult?.address) {
          setFreighterKey(accessResult.address);
          setMessage(`Freighter conectado: ${accessResult.address.slice(0, 10)}...`);
          return;
        }
      }

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

  const step1Done = !!proofHex;
  const step3Done = !!freighterKey;
  const step4Done = !!txHash;

  return (
    <div className="app-shell">
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />

      {/* App nav */}
      <nav className="app-nav">
        <button className="app-nav-back" onClick={onBack}>← Inicio</button>
        <img src="/kage-logo.png" alt="Kage" className="app-nav-logo" />
        <span className="app-nav-badge">Stellar Testnet</span>
      </nav>

      <main className="app-container">

        {/* ── Success Card ─────────────────────────────────────────────────── */}
        {txHash ? (
          <div className="success-card">
            <div className="success-checkmark"><CheckIconLg /></div>
            <h2 className="success-title">Remesa enviada con privacidad ZK</h2>
            <div className="success-amount">
              {amount} <span className="success-unit">USDC</span>
            </div>
            <div className="success-badges">
              <span className="badge-ok">KYC verificado on-chain sin revelar tu identidad</span>
              <span className="badge-ok">AML cumplido: monto dentro del límite de {AMOUNT_LIMIT} USDC</span>
              <span className="badge-ok">Wallet no bloqueada — verificado con ZK proof</span>
            </div>
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-tx"
            >
              Ver transacción en stellar.expert ↗
            </a>
            <details className="tech-accordion">
              <summary>Ver proof técnico</summary>
              <div className="tech-body">
                <div className="tech-row">
                  <span className="tech-label">Contract ID</span>
                  <code className="tech-code">{CONTRACT_ID}</code>
                </div>
                {publicSignals.length > 0 && (
                  <div className="tech-row">
                    <span className="tech-label">Señales públicas</span>
                    <div className="tech-signals">
                      <div>kyc_commitment: {publicSignals[0]?.slice(0, 24)}...</div>
                      <div>amount_limit: {publicSignals[1]}</div>
                      <div>blacklisted (mock): {publicSignals[2]}</div>
                    </div>
                  </div>
                )}
                <div className="tech-row">
                  <span className="tech-label">Proof hex (editable)</span>
                  <textarea className="tech-textarea" value={proofHex} onChange={(e) => setProofHex(e.target.value)} rows={4} />
                </div>
                <div className="tech-row">
                  <span className="tech-label">Public signals hex (editable)</span>
                  <textarea className="tech-textarea" value={publicHex} onChange={(e) => setPublicHex(e.target.value)} rows={2} />
                </div>
              </div>
            </details>
          </div>

        ) : (

          /* ── Flow Card ─────────────────────────────────────────────────── */
          <div className="flow-card">

            <div className="flow-card-header">
              <img src="/kage-logo.png" alt="Kage" className="flow-logo" />
              <div>
                <p className="flow-eyebrow">KAGE · CIRCOM + GROTH16 + STELLAR SOROBAN</p>
                <p className="flow-sub">Remesas privadas con prueba ZK on-chain</p>
              </div>
            </div>

            {/* Step progress bar */}
            <div className="steps-bar">
              <StepDot n={1} label="Datos" done={step1Done} active={!step1Done && !busyGenerate} />
              <div className="step-line" />
              <StepDot n={2} label="ZK Proof" done={step1Done} active={busyGenerate} />
              <div className="step-line" />
              <StepDot n={3} label="Wallet" done={step3Done} active={step1Done && !step3Done} />
              <div className="step-line" />
              <StepDot n={4} label="Enviar" done={step4Done} active={step1Done && step3Done} />
            </div>

            {/* ── Paso 1 + 2: Datos + Generar Proof ──────────────────────── */}
            <div className="flow-section">
              <div className="section-header">
                <span className="section-badge">Pasos 1 – 2</span>
                <h3>Datos de la remesa y ZK Proof</h3>
              </div>

              <form onSubmit={onGenerateProof} className="stack">
                <label>
                  Monto a enviar (USDC)
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="numeric"
                    placeholder="500"
                    required
                  />
                </label>
                <div className="info-pill">
                  Límite AML: {AMOUNT_LIMIT} USDC — el proof verifica que tu monto no lo supera
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
                  KYC Hash
                  <input
                    value={kycHash}
                    onChange={(e) => setKycHash(e.target.value)}
                    inputMode="numeric"
                    placeholder="1234567890"
                    required
                  />
                </label>
                <div className="info-pill muted">
                  MOCK: en producción, el KYC hash lo genera el proveedor KYC de forma privada
                </div>

                <button type="submit" className="btn btn-primary" disabled={busyGenerate}>
                  {busyGenerate
                    ? <><span className="spinner" />Calculando prueba ZK en tu dispositivo...</>
                    : "Generar ZK Proof"}
                </button>
              </form>

              {proofHex && !busyGenerate && (
                <div className="proof-ready">
                  <span className="dot-green" />
                  <span>Proof ZK generado — KYC ✓ · AML ✓ · Blacklist ✓</span>
                </div>
              )}
            </div>

            {/* ── Paso 3: Conectar Freighter ──────────────────────────────── */}
            <div className={`flow-section${!step1Done ? " section-locked" : ""}`}>
              <div className="section-header">
                <span className="section-badge">Paso 3</span>
                <h3>Conectar wallet Freighter</h3>
              </div>

              {freighterKey ? (
                <div className="freighter-connected">
                  <span className="dot-green" />
                  <div>
                    <span className="fc-label">Freighter conectado</span>
                    <span className="fc-addr">{freighterKey}</span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-freighter"
                  onClick={onConnectFreighter}
                  disabled={busyConnect || !step1Done}
                >
                  {busyConnect ? "Conectando..." : "Conectar Freighter"}
                </button>
              )}
            </div>

            {/* ── Paso 4: Verificar + Enviar ──────────────────────────────── */}
            <div className={`flow-section${(!step1Done || !step3Done) ? " section-locked" : ""}`}>
              <div className="section-header">
                <span className="section-badge">Paso 4</span>
                <h3>Verificar y enviar USDC</h3>
              </div>

              <form onSubmit={onVerifyAndSend}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busyVerify || !proofHex || !publicHex || !freighterKey}
                >
                  {busyVerify
                    ? <><span className="spinner" />{message}</>
                    : "Verificar ZK Proof y Enviar USDC"}
                </button>
              </form>

              {!busyVerify && verifyResult !== null && (
                <div className="result-box">
                  <p className={verifyResult ? "ok" : "bad"}>
                    verifier.verify(...) &rarr; {String(verifyResult)}
                  </p>
                  {!verifyResult && <p className="muted">{message}</p>}
                </div>
              )}
            </div>

            {/* ── Detalles técnicos ───────────────────────────────────────── */}
            {(proofHex || publicHex) && (
              <details className="tech-accordion">
                <summary>Ver detalles técnicos</summary>
                <div className="tech-body">
                  <div className="tech-row">
                    <span className="tech-label">Contract ID</span>
                    <code className="tech-code">{CONTRACT_ID}</code>
                  </div>
                  {publicSignals.length > 0 && (
                    <div className="tech-row">
                      <span className="tech-label">Señales públicas</span>
                      <div className="tech-signals">
                        <div>kyc_commitment: {publicSignals[0]?.slice(0, 24)}...</div>
                        <div>amount_limit: {publicSignals[1]}</div>
                        <div>blacklisted (mock): {publicSignals[2]}</div>
                      </div>
                    </div>
                  )}
                  <div className="tech-row">
                    <span className="tech-label">Proof hex (editable)</span>
                    <textarea className="tech-textarea" value={proofHex} onChange={(e) => setProofHex(e.target.value)} rows={5} />
                  </div>
                  <div className="tech-row">
                    <span className="tech-label">Public signals hex (editable)</span>
                    <textarea className="tech-textarea" value={publicHex} onChange={(e) => setPublicHex(e.target.value)} rows={3} />
                  </div>
                </div>
              </details>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
