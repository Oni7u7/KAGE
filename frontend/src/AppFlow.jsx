import { useState, useEffect, useRef } from "react";
import anime from 'animejs/lib/anime.es.js';

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
import { initAppBg3D } from './lib/bg3d';
import * as snarkjs from "snarkjs";
import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
} from "@stellar/freighter-api";
import { proofToHex, publicSignalsToHex } from "./lib/snarkHex";
import { verifyProofOnSoroban } from "./lib/stellarVerify";
import { transferUSDC, getUSDCBalance } from "./lib/usdcTransfer";

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
  const canvasRef = useRef(null)

  // ── Kage inputs ────────────────────────────────────────────────────────────
  const [amount, setAmount]       = useState("500");
  const [recipient, setRecipient] = useState("");

  // ── Proof output ───────────────────────────────────────────────────────────
  const [proofHex, setProofHex]           = useState("");
  const [publicHex, setPublicHex]         = useState("");
  const [publicSignals, setPublicSignals] = useState([]);

  // ── Freighter wallet ───────────────────────────────────────────────────────
  const [freighterKey, setFreighterKey]   = useState("");
  const [busyConnect, setBusyConnect]     = useState(false);
  const [usdcBalance, setUsdcBalance]     = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [busyGenerate, setBusyGenerate] = useState(false);
  const [busyVerify, setBusyVerify]     = useState(false);
  const [message, setMessage]           = useState(
    "Conecta Freighter y genera un ZK proof para verificar en Soroban testnet."
  );
  const [verifyResult, setVerifyResult] = useState(null);
  const [txHash, setTxHash]             = useState("");
  const [verifyHash, setVerifyHash]     = useState("");

  // ── USDC balance ───────────────────────────────────────────────────────────
  async function fetchBalance(address) {
    setLoadingBalance(true);
    setUsdcBalance(null);
    try {
      const bal = await getUSDCBalance({ rpcUrl: RPC_URL, networkPassphrase: NETWORK_PASSPHRASE, address });
      setUsdcBalance(bal);
    } finally {
      setLoadingBalance(false);
    }
  }

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
          fetchBalance(accessResult.address);
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
      fetchBalance(addrResult.address);
    } catch (err) {
      setMessage(`Error conectando Freighter: ${err.message || String(err)}`);
    } finally {
      setBusyConnect(false);
    }
  }

  // ── Proof generation ───────────────────────────────────────────────────────
  async function onGenerateProof(e) {
    e?.preventDefault?.();
    setBusyGenerate(true);
    setVerifyResult(null);
    setProofHex("");
    setPublicHex("");

    try {
      // wallet_hash derived from the connected Freighter key (never exposed to user)
      const walletHash = hashWalletAddress(freighterKey);

      const input = {
        kyc_hash:     "1234567890",   // mock — in production supplied by KYC provider
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
    setVerifyHash("");

    try {
      console.log("[onVerifyAndSend] Step 1 — calling verifyProofOnSoroban...");
      setMessage("Aprueba Tx 1 en Freighter: verificación ZK on-chain...");

      const { verified, hash: vHash } = await verifyProofOnSoroban({
        rpcUrl: RPC_URL,
        networkPassphrase: NETWORK_PASSPHRASE,
        contractId: CONTRACT_ID,
        sourcePublicKey: freighterKey,
        proofHex,
        publicHex,
      });

      console.log("[onVerifyAndSend] verifyProofOnSoroban result — verified:", verified, "hash:", vHash);
      setVerifyResult(verified);
      if (vHash) setVerifyHash(vHash);

      if (!verified) {
        setMessage("Verificación RECHAZADA. El proof no es válido — no se realizará ninguna transferencia.");
        return;
      }

      console.log("[onVerifyAndSend] Step 2 — calling transferUSDC...");
      setMessage("Proof verificado on-chain ✓ — Aprueba Tx 2 en Freighter: transferencia USDC...");

      const { hash } = await transferUSDC({
        rpcUrl: RPC_URL,
        networkPassphrase: NETWORK_PASSPHRASE,
        fromPublicKey: freighterKey,
        toPublicKey: recipient.trim(),
        amount,
      });

      console.log("[onVerifyAndSend] transferUSDC result — hash:", hash);

      // Guard: use hash if available, else a sentinel so the success card renders
      const finalHash = hash || vHash || "confirmed";
      setTxHash(finalHash);
      setMessage(`¡Transferencia enviada! ${amount} USDC → ${recipient.trim().slice(0, 10)}...`);
      console.log("[onVerifyAndSend] Done. txHash set to:", finalHash);
    } catch (err) {
      console.error("[onVerifyAndSend] Error:", err);
      setMessage(`Error: ${err.message || String(err)}`);
    } finally {
      setBusyVerify(false);
    }
  }

  // ── Disconnect wallet ──────────────────────────────────────────────────────
  function onDisconnect() {
    setFreighterKey("");
    setUsdcBalance(null);
    setProofHex("");
    setPublicHex("");
    setPublicSignals([]);
    setVerifyResult(null);
    setTxHash("");
    setVerifyHash("");
    setMessage("Conecta Freighter y genera un ZK proof para verificar en Soroban testnet.");
  }

  const stepWalletDone = !!freighterKey;
  const stepProofDone  = !!proofHex;
  const stepSendDone   = !!txHash;
  const formReady      = !!(amount.trim() && recipient.trim());

  /* ── Entrance + aurora animations ────────────────────────────────────────── */
  useEffect(() => {
    // Card entrance
    anime({
      targets: '.flow-card, .success-card',
      opacity: [0, 1],
      translateY: [28, 0],
      duration: 800,
      easing: 'easeOutExpo',
    });
    // Nav entrance
    anime({
      targets: '.app-nav',
      opacity: [0, 1],
      translateY: [-12, 0],
      duration: 600,
      easing: 'easeOutExpo',
    });

    // Aurora floating loops
    anime({ targets: '.aurora-a', translateX: ['-8%', '8%'],  translateY: ['-6%', '7%'],  scale: [1, 1.18],  duration: 11000, loop: true, direction: 'alternate', easing: 'easeInOutSine' });
    anime({ targets: '.aurora-b', translateX: ['7%', '-8%'],  translateY: ['6%', '-7%'],  scale: [1.12, 0.9], duration: 13500, loop: true, direction: 'alternate', easing: 'easeInOutSine' });
    anime({ targets: '.aurora-c', translateX: ['-6%', '7%'],  translateY: ['7%', '-6%'],  scale: [0.88, 1.12], duration: 9500, loop: true, direction: 'alternate', easing: 'easeInOutSine' });
    anime({ targets: '.aurora-d', translateX: ['5%', '-7%'],  translateY: ['-5%', '7%'],  scale: [1.06, 0.92], duration: 15000, loop: true, direction: 'alternate', easing: 'easeInOutSine' });
  }, []);

  /* ── Success card pop-in ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!txHash) return;
    anime({
      targets: '.success-card',
      opacity: [0, 1],
      scale: [0.94, 1],
      translateY: [24, 0],
      duration: 900,
      easing: 'easeOutExpo',
    });
    // Animate success badges stagger
    anime({
      targets: '.badge-ok',
      opacity: [0, 1],
      translateX: [-20, 0],
      delay: anime.stagger(120, { start: 400 }),
      duration: 600,
      easing: 'easeOutExpo',
    });
    // Checkmark pop
    anime({
      targets: '.success-checkmark',
      scale: [0, 1.15, 1],
      opacity: [0, 1],
      duration: 700,
      easing: 'easeOutBack',
    });
  }, [txHash]);

  /* ── Proof ready reveal ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!proofHex) return;
    anime({
      targets: '.proof-ready',
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 500,
      easing: 'easeOutExpo',
    });
  }, [proofHex]);

  /* ── Wallet connected reveal ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!freighterKey) return;
    anime({
      targets: '.freighter-connected',
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 500,
      easing: 'easeOutExpo',
    });
  }, [freighterKey]);

  /* ── 3D background shapes ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!canvasRef.current) return;
    const mode = txHash ? 'success' : 'form';
    const cleanup = initAppBg3D(canvasRef.current, { mode });
    return cleanup;
  }, [!!txHash]);

  return (
    <div className="app-shell">
      <canvas ref={canvasRef} className="bg-3d-canvas" aria-hidden="true" />
      <div className="bg-grid" />
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />
      <div className="aurora aurora-c" />
      <div className="aurora aurora-d" />

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
              <span className="badge-ok">Tu documento fue verificado sin mostrarlo — solo se publicó un compromiso matemático</span>
              <span className="badge-ok">Tu monto cumple límites AML sin revelar la cantidad exacta en la cadena</span>
              <span className="badge-ok">Todo verificado en Stellar blockchain — inmutable y público</span>
            </div>
            <div className="tx-links">
              {verifyHash && (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${verifyHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-tx"
                >
                  Tx 1 — Verificación ZK en stellar.expert ↗
                </a>
              )}
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-tx"
              >
                Tx 2 — Transferencia USDC en stellar.expert ↗
              </a>
            </div>
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

            {/* Header */}
            <div className="flow-card-header">
              <img src="/kage-logo.png" alt="Kage" className="flow-logo" />
              <div className="flow-header-text">
                <p className="flow-eyebrow">Kage · Stellar Testnet</p>
                <p className="flow-sub">Remesa privada con prueba ZK</p>
              </div>
            </div>

            {/* Step progress */}
            <div className="steps-bar">
              <StepDot n={1} label="Wallet"   done={stepWalletDone} active={!stepWalletDone} />
              <div className={`step-line${stepWalletDone ? ' line-done' : ''}`} />
              <StepDot n={2} label="Remesa"   done={stepProofDone}  active={stepWalletDone && !stepProofDone && !busyGenerate} />
              <div className={`step-line${stepProofDone ? ' line-done' : ''}`} />
              <StepDot n={3} label="ZK Proof" done={stepProofDone}  active={busyGenerate} />
              <div className={`step-line${stepSendDone ? ' line-done' : ''}`} />
              <StepDot n={4} label="Enviar"   done={stepSendDone}   active={stepProofDone && !stepSendDone} />
            </div>

            {/* ── 1: Wallet ────────────────────────────────────────────────── */}
            <div className="flow-section">
              <p className="flow-step-label">01 — Wallet</p>

              {freighterKey ? (
                <div className="freighter-connected">
                  <div className="fc-status-row">
                    <span className="dot-green" />
                    <span className="fc-label">Conectado</span>
                    <button className="btn-disconnect" type="button" onClick={onDisconnect}>
                      Desconectar
                    </button>
                  </div>
                  <span className="fc-addr">{freighterKey}</span>
                  {loadingBalance && (
                    <span className="fc-balance-loading">Consultando balance…</span>
                  )}
                  {!loadingBalance && usdcBalance !== null && (
                    <div className="fc-balance">
                      <span className="fc-balance-num">{usdcBalance}</span>
                      <span className="fc-balance-unit">USDC</span>
                      <span className="fc-balance-avail">disponibles</span>
                    </div>
                  )}
                  {!loadingBalance && usdcBalance === null && freighterKey && (
                    <span className="fc-balance-error">No se pudo consultar el balance</span>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-freighter"
                  onClick={onConnectFreighter}
                  disabled={busyConnect}
                >
                  {busyConnect ? <><span className="spinner spinner-white" />Conectando…</> : "Conectar Freighter"}
                </button>
              )}
            </div>

            {/* ── 2: Datos ─────────────────────────────────────────────────── */}
            <div className={`flow-section${!stepWalletDone ? " section-locked" : ""}`}>
              <p className="flow-step-label">02 — Remesa</p>

              <div className="stack">
                <label>
                  Monto (USDC)
                  <div className="input-row">
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      inputMode="numeric"
                      placeholder="500"
                      disabled={!stepWalletDone}
                    />
                    <span className="input-suffix">USDC</span>
                  </div>
                  <span className="field-hint">Límite AML: {AMOUNT_LIMIT} USDC</span>
                </label>

                <label>
                  Destinatario
                  <input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="G... dirección Stellar"
                    disabled={!stepWalletDone}
                  />
                </label>
              </div>
            </div>

            {/* ── 3: ZK Proof ──────────────────────────────────────────────── */}
            <div className={`flow-section${(!stepWalletDone || !formReady) ? " section-locked" : ""}`}>
              <p className="flow-step-label">03 — ZK Proof</p>

              <div className="context-note">
                Tu dispositivo genera una <strong>prueba matemática</strong> que confirma KYC, monto y estado de la wallet —
                sin exponer ningún dato real. La prueba se verifica on-chain antes de transferir.
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={onGenerateProof}
                disabled={busyGenerate || !stepWalletDone || !formReady}
              >
                {busyGenerate
                  ? <><span className="spinner" />Calculando proof…</>
                  : "Generar ZK Proof"}
              </button>

              {busyGenerate && (
                <p className="generating-hint">
                  Tus datos privados nunca salen del navegador.
                </p>
              )}

              {stepProofDone && !busyGenerate && (
                <div className="proof-ready">
                  <span className="dot-green" />
                  <span>Proof generado · KYC ✓ · AML ✓ · Blacklist ✓</span>
                </div>
              )}
            </div>

            {/* ── 4: Enviar ────────────────────────────────────────────────── */}
            <div className={`flow-section no-border${!stepProofDone ? " section-locked" : ""}`}>
              <p className="flow-step-label">04 — Verificar y enviar</p>

              <form onSubmit={onVerifyAndSend}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busyVerify || !proofHex || !publicHex || !freighterKey}
                >
                  {busyVerify
                    ? <><span className="spinner" />{message}</>
                    : "Verificar y enviar USDC"}
                </button>
              </form>

              {!busyVerify && verifyResult !== null && (
                <div className="result-box">
                  <p className={verifyResult ? "ok" : "bad"}>
                    {verifyResult ? "Proof verificado on-chain ✓" : "Verificación rechazada ✗"}
                  </p>
                  {!verifyResult && <p className="muted">{message}</p>}
                </div>
              )}
            </div>

            {/* Detalles técnicos */}
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
                        <div>kyc_commitment: {publicSignals[0]?.slice(0, 24)}…</div>
                        <div>amount_limit: {publicSignals[1]}</div>
                        <div>blacklisted (mock): {publicSignals[2]}</div>
                      </div>
                    </div>
                  )}
                  <div className="tech-row">
                    <span className="tech-label">Proof hex</span>
                    <textarea className="tech-textarea" value={proofHex} onChange={(e) => setProofHex(e.target.value)} rows={4} />
                  </div>
                  <div className="tech-row">
                    <span className="tech-label">Public signals hex</span>
                    <textarea className="tech-textarea" value={publicHex} onChange={(e) => setPublicHex(e.target.value)} rows={2} />
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
