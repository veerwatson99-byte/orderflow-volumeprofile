/**
 * Master Application Controller - BTC Order Flow & Volume Profile Terminal
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Engines
  const vpEngine = new VolumeProfileEngine({ binSize: 20, valueAreaPct: 0.70 });
  const ofEngine = new OrderFlowEngine({ imbalanceRatio: 3.0 });
  const strategyEngine = new StrategyEngine({ riskPct: 0.005, minRR: 2.0 });
  const backtester = new StrategyBacktester({ riskPct: 0.005 });

  let rawCandles = [];
  let enrichedCandles = [];
  let currentProfile = null;
  let currentSignals = [];

  // 2. Initialize TradingView Chart
  const chart = new TradingViewVolumetricChart('tvMainChart', 'tvFlowChart', 'tvProfileCanvas', {
    sessionCanvasId: 'tvSessionCanvas',
    onHover: (bar) => updateHoverHUD(bar)
  });

  // 3. Initialize Data Feed Manager
  const dataFeed = new DataFeedManager({
    onUpdate: (updatedCandles, options = {}) => {
      rawCandles = updatedCandles;
      if (options.isTickOnly && rawCandles.length > 0) {
        const last = rawCandles[rawCandles.length - 1];
        chart.updateLastCandle(last);
        updateLivePriceHeader(last);
        updateHoverHUD(null);
      } else {
        processDataPipeline();
      }
    },
    onStatusChange: (status, message) => {
      const connDot = document.querySelector('.conn-dot');
      const connText = document.getElementById('connText');
      if (connText) connText.textContent = message;
      if (connDot) {
        connDot.className = 'conn-dot ' + (status === 'LIVE' || status === 'SIM' ? 'live' : '');
      }
    }
  });

  function updateLivePriceHeader(last) {
    const livePriceEl = document.getElementById('topLivePrice');
    if (livePriceEl) {
      livePriceEl.textContent = '$' + last.close.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    const sideDelta = document.getElementById('sideDelta');
    if (sideDelta && last.delta !== undefined) {
      sideDelta.textContent = (last.delta >= 0 ? '+' : '') + Math.round(last.delta).toLocaleString() + ' BTC';
      sideDelta.className = 'f-val-large ' + (last.delta >= 0 ? 'pos' : 'neg');
    }
  }

  /**
   * Main Data Processing Pipeline
   */
  function processDataPipeline(options = {}) {
    if (!rawCandles || rawCandles.length === 0) return;

    // Step A: Calculate Volume Profile (WHERE)
    currentProfile = vpEngine.computeProfile(rawCandles);

    // Step B: Enrich Candles with Order Flow Metrics (WHAT IS HAPPENING)
    enrichedCandles = ofEngine.processCandles(rawCandles, currentProfile);

    // Step C: Evaluate Signals & Setups
    currentSignals = strategyEngine.evaluateSignals(enrichedCandles, currentProfile);

    // Step D: Update Canvas Chart
    chart.setData(enrichedCandles, currentProfile, currentSignals, options);

    // Step E: Update Telemetry Headers & Sidebar
    updateHeaderTelemetry();
    updateSidebarTelemetry();
    updateDecisionTreeHUD();
    updateSignalBanner();
    updateHoverHUD(null);
  }

  /**
   * Updates Top Header Telemetry Pills
   */
  function updateHeaderTelemetry() {
    if (!enrichedCandles.length || !currentProfile) return;

    const last = enrichedCandles[enrichedCandles.length - 1];

    // Live Price & Change
    const livePriceEl = document.getElementById('topLivePrice');
    const priceChangeEl = document.getElementById('topPriceChange');
    if (livePriceEl) livePriceEl.textContent = '$' + last.close.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    const first = enrichedCandles[0];
    const pctChange = ((last.close - first.open) / first.open) * 100;
    if (priceChangeEl) {
      priceChangeEl.textContent = (pctChange >= 0 ? '+' : '') + pctChange.toFixed(2) + '%';
      priceChangeEl.className = 'price-change-badge ' + (pctChange >= 0 ? 'pos' : 'neg');
    }

    // Session Delta
    const hdrDelta = document.getElementById('hdrSessionDelta');
    let sessionDelta = 0;
    for (const c of enrichedCandles) sessionDelta += (c.delta || 0);
    if (hdrDelta) {
      hdrDelta.textContent = (sessionDelta >= 0 ? '+' : '') + Math.round(sessionDelta).toLocaleString() + ' BTC';
      hdrDelta.className = 'pill-val ' + (sessionDelta >= 0 ? 'pos' : 'neg');
    }

    // POC & Value Area
    const hdrPOC = document.getElementById('hdrPOC');
    const hdrVA = document.getElementById('hdrValueArea');
    if (hdrPOC) hdrPOC.textContent = '$' + currentProfile.poc.toLocaleString('en-US', { minimumFractionDigits: 0 });
    if (hdrVA) hdrVA.textContent = `$${currentProfile.val.toFixed(0)} - $${currentProfile.vah.toFixed(0)}`;

    // Legend Prices
    document.getElementById('legVAH').textContent = '$' + currentProfile.vah.toFixed(0);
    document.getElementById('legPOC').textContent = '$' + currentProfile.poc.toFixed(0);
    document.getElementById('legVAL').textContent = '$' + currentProfile.val.toFixed(0);

    // Active Setup Pill
    const hdrSetup = document.getElementById('hdrSetupText');
    const lastSignal = currentSignals[currentSignals.length - 1];
    if (hdrSetup) {
      if (lastSignal) {
        hdrSetup.textContent = lastSignal.setupName;
        hdrSetup.className = 'pill-val highlight';
      } else {
        hdrSetup.textContent = 'NO ACTIVE SETUP (WAITING)';
        hdrSetup.className = 'pill-val';
      }
    }
  }

  /**
   * Updates Sidebar Live Order Flow & Profile Details
   */
  function updateSidebarTelemetry() {
    if (!enrichedCandles.length || !currentProfile) return;

    const last = enrichedCandles[enrichedCandles.length - 1];
    const { vah, poc, val, totalVolume, hvns, lvns } = currentProfile;

    // Profile Levels
    document.getElementById('sideVAH').textContent = '$' + vah.toLocaleString();
    document.getElementById('sidePOC').textContent = '$' + poc.toLocaleString();
    document.getElementById('sideVAL').textContent = '$' + val.toLocaleString();
    document.getElementById('sideTotalVol').textContent = Math.round(totalVolume).toLocaleString() + ' BTC';

    if (hvns && hvns.length > 0) {
      document.getElementById('sideHVN').textContent = '$' + hvns[0].price.toLocaleString();
    }
    if (lvns && lvns.length > 0) {
      document.getElementById('sideLVN').textContent = '$' + lvns[0].price.toLocaleString();
    }

    // Order Flow Box
    const deltaEl = document.getElementById('sideDelta');
    const deltaPctEl = document.getElementById('sideDeltaPercent');
    const sideBuyVol = document.getElementById('sideBuyVol');
    const sideSellVol = document.getElementById('sideSellVol');
    const buyProg = document.getElementById('sideBuyProg');
    const sellProg = document.getElementById('sideSellProg');

    const barDelta = last.delta || 0;
    const isPos = barDelta >= 0;

    deltaEl.textContent = (isPos ? '+' : '') + Math.round(barDelta).toLocaleString() + ' BTC';
    deltaEl.className = 'f-val-large ' + (isPos ? 'pos' : 'neg');

    deltaPctEl.textContent = (isPos ? '+' : '') + last.deltaPercent.toFixed(1) + '% net aggression';

    sideBuyVol.textContent = Math.round(last.buyVol || 0).toLocaleString() + ' BTC';
    sideSellVol.textContent = Math.round(last.sellVol || 0).toLocaleString() + ' BTC';

    const totVol = (last.buyVol || 0) + (last.sellVol || 0);
    const buyRatio = totVol > 0 ? (last.buyVol / totVol) * 100 : 50;
    buyProg.style.width = buyRatio + '%';
    sellProg.style.width = (100 - buyRatio) + '%';

    // Imbalance & Absorption
    const sideImbalance = document.getElementById('sideImbalance');
    const sideAbsorption = document.getElementById('sideAbsorption');

    if (last.imbalances?.stackedBuy) {
      sideImbalance.textContent = '3.0x+ Stacked Ask';
      sideImbalance.className = 'chip-val pos';
    } else if (last.imbalances?.stackedSell) {
      sideImbalance.textContent = '3.0x+ Stacked Bid';
      sideImbalance.className = 'chip-val neg';
    } else {
      sideImbalance.textContent = 'Balanced Flow';
      sideImbalance.className = 'chip-val';
    }

    const flowAnalysis = last.flowAnalysis || {};
    if (flowAnalysis.absorption === 'SELLING_ABSORBED') {
      sideAbsorption.textContent = 'SELLING ABSORBED';
      sideAbsorption.className = 'chip-val highlight';
    } else if (flowAnalysis.absorption === 'BUYING_ABSORBED') {
      sideAbsorption.textContent = 'BUYING ABSORBED';
      sideAbsorption.className = 'chip-val highlight';
    } else {
      sideAbsorption.textContent = 'No Absorption';
      sideAbsorption.className = 'chip-val';
    }

    // Market State & Active Setup
    const sysState = document.getElementById('sysMarketState');
    const sysSetup = document.getElementById('sysActiveSetup');

    sysState.textContent = flowAnalysis.marketState || 'BALANCED ROTATION';

    const latestSig = currentSignals[currentSignals.length - 1];
    if (latestSig) {
      sysSetup.textContent = latestSig.setupName;
      sysSetup.className = 's-val ' + (latestSig.type === 'BUY' ? 'badge-long' : 'badge-short');
    } else {
      sysSetup.textContent = 'NO ACTIVE SETUP';
      sysSetup.className = 's-val badge-neutral';
    }
  }

  /**
   * Updates Real-Time Decision Tree Nodes
   */
  function updateDecisionTreeHUD() {
    if (!enrichedCandles.length || !currentProfile) return;

    const last = enrichedCandles[enrichedCandles.length - 1];
    const prev = enrichedCandles.length > 1 ? enrichedCandles[enrichedCandles.length - 2] : last;
    const { vah, val, poc } = currentProfile;

    const dtStatLocation = document.getElementById('dtStatLocation');
    const stepAbsorption = document.getElementById('dtStepAbsorption');
    const stepFlip = document.getElementById('dtStepFlip');
    const stepReclaim = document.getElementById('dtStepReclaim');
    const colRejection = document.getElementById('dtColRejection');

    // Location Check
    const nearVAL = Math.abs(last.low - val) < (vah - val) * 0.08 || last.low < val;
    const nearVAH = Math.abs(last.high - vah) < (vah - val) * 0.08 || last.high > vah;

    if (nearVAL) {
      dtStatLocation.textContent = `Active: Interacting with VAL ($${val.toFixed(0)})`;
    } else if (nearVAH) {
      dtStatLocation.textContent = `Active: Interacting with VAH ($${vah.toFixed(0)})`;
    } else {
      dtStatLocation.textContent = `Between Levels: Inside Value Area ($${last.close.toFixed(0)})`;
    }

    // Absorption Step
    const hadAbsorption = (prev.flowAnalysis?.absorption === 'SELLING_ABSORBED') || 
                          (last.flowAnalysis?.absorption === 'SELLING_ABSORBED');
    if (hadAbsorption) {
      stepAbsorption.classList.add('done');
    } else {
      stepAbsorption.classList.remove('done');
    }

    // Delta Flip Step
    const deltaFlipped = last.delta > 0 && prev.delta < 0;
    if (deltaFlipped) {
      stepFlip.classList.add('done');
    } else {
      stepFlip.classList.remove('done');
    }

    // Reclaim Step
    const reclaimed = last.close > val && prev.close <= val + 20;
    if (reclaimed) {
      stepReclaim.classList.add('done');
      colRejection.classList.add('active');
    } else {
      stepReclaim.classList.remove('done');
      colRejection.classList.remove('active');
    }
  }

  /**
   * Updates Active Signal Banner Callout
   */
  function updateSignalBanner() {
    const banner = document.getElementById('activeSignalBanner');
    if (!banner) return;

    const latestSig = currentSignals[currentSignals.length - 1];
    if (latestSig && chart.showSignals) {
      banner.style.display = 'flex';
      banner.className = 'active-signal-banner ' + (latestSig.type === 'BUY' ? 'buy' : 'sell');
      document.getElementById('bannerBadge').textContent = latestSig.type === 'BUY' ? 'BUY SIGNAL' : 'SELL SIGNAL';
      document.getElementById('bannerTitle').textContent = latestSig.headline;
      document.getElementById('bannerDesc').textContent = latestSig.detail;
    } else {
      banner.style.display = 'none';
    }
  }

  /**
   * Hover HUD for precise bar metrics
   */
  function updateHoverHUD(bar) {
    const activeBar = bar || (enrichedCandles && enrichedCandles.length ? enrichedCandles[enrichedCandles.length - 1] : null);

    // Update Order Flow & Volume Subpanel Bar Metrics
    if (activeBar) {
      const elVol = document.getElementById('fptVol');
      const elBuy = document.getElementById('fptBuy');
      const elSell = document.getElementById('fptSell');
      const elDelta = document.getElementById('fptDelta');
      const elCVD = document.getElementById('fptCVD');

      if (elVol) elVol.textContent = Math.round(activeBar.volume || 0).toLocaleString() + ' BTC';
      if (elBuy) elBuy.textContent = Math.round(activeBar.buyVol || 0).toLocaleString() + ' BTC';
      if (elSell) elSell.textContent = Math.round(activeBar.sellVol || 0).toLocaleString() + ' BTC';
      if (elDelta) {
        const deltaVal = Math.round(activeBar.delta || 0);
        elDelta.textContent = (deltaVal >= 0 ? '+' : '') + deltaVal.toLocaleString() + ' BTC';
      }
      if (elCVD) {
        const cvdVal = Math.round(activeBar.cvd || 0);
        elCVD.textContent = (cvdVal >= 0 ? '+' : '') + cvdVal.toLocaleString() + ' BTC';
      }
    }

    const hud = document.getElementById('chartHoverHUD');
    if (!bar) {
      if (hud) hud.style.display = 'none';
      return;
    }

    if (hud) hud.style.display = 'block';
    const date = new Date(bar.time);
    const hudTime = document.getElementById('hudTime');
    if (hudTime) hudTime.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const hudOpen = document.getElementById('hudOpen');
    if (hudOpen) hudOpen.textContent = '$' + bar.open.toFixed(1);
    const hudHigh = document.getElementById('hudHigh');
    if (hudHigh) hudHigh.textContent = '$' + bar.high.toFixed(1);
    const hudLow = document.getElementById('hudLow');
    if (hudLow) hudLow.textContent = '$' + bar.low.toFixed(1);
    const hudClose = document.getElementById('hudClose');
    if (hudClose) hudClose.textContent = '$' + bar.close.toFixed(1);

    const hudVol = document.getElementById('hudVol');
    if (hudVol) hudVol.textContent = Math.round(bar.volume).toLocaleString();
    const deltaEl = document.getElementById('hudDelta');
    if (deltaEl) {
      deltaEl.textContent = (bar.delta >= 0 ? '+' : '') + Math.round(bar.delta);
      deltaEl.className = bar.delta >= 0 ? 'pos' : 'neg';
    }

    const hudBuy = document.getElementById('hudBuy');
    if (hudBuy) hudBuy.textContent = Math.round(bar.buyVol || 0).toLocaleString();
    const hudSell = document.getElementById('hudSell');
    if (hudSell) hudSell.textContent = Math.round(bar.sellVol || 0).toLocaleString();
    const hudStateText = document.getElementById('hudStateText');
    if (hudStateText) hudStateText.textContent = bar.flowAnalysis?.marketState || 'Neutral';
  }

  /**
   * Live Risk & Position Sizing Calculator
   */
  let riskInputsInitialized = false;
  function updateRiskCalculator() {
    const entryEl = document.getElementById('inpEntryPrice');
    const stopEl = document.getElementById('inpStopPrice');
    const targetEl = document.getElementById('inpTargetPrice');

    if (!riskInputsInitialized && enrichedCandles && enrichedCandles.length > 0) {
      const curPrice = Math.round(enrichedCandles[enrichedCandles.length - 1].close);
      if (entryEl && (entryEl.value === '66750' || !entryEl.value)) entryEl.value = curPrice;
      if (stopEl && (stopEl.value === '66620' || !stopEl.value)) stopEl.value = Math.round(curPrice * 0.995);
      if (targetEl && (targetEl.value === '67080' || !targetEl.value)) targetEl.value = Math.round(curPrice * 1.012);
      riskInputsInitialized = true;
    }

    const equity = parseFloat(document.getElementById('inpAccountEquity').value) || 10000;
    const entry = parseFloat(entryEl ? entryEl.value : 0) || (enrichedCandles[enrichedCandles.length - 1]?.close || 86500);
    const stop = parseFloat(stopEl ? stopEl.value : 0) || (entry * 0.995);
    const target = parseFloat(targetEl ? targetEl.value : 0) || (entry * 1.012);

    const calc = strategyEngine.calculatePositionSize(equity, entry, stop, target);

    document.getElementById('calcDollarRisk').textContent = '$' + (equity * 0.005).toFixed(2);

    if (calc.valid) {
      document.getElementById('calcRR').textContent = '1 : ' + calc.rrRatio.toFixed(2);
      document.getElementById('calcRR').className = 'rr-value ' + (calc.isValidRR ? 'pos' : 'neg');

      const statusEl = document.getElementById('rrStatus');
      if (calc.isValidRR) {
        statusEl.textContent = '✓ Valid (≥ 1:2.0 Minimum)';
        statusEl.className = 'rr-status valid';
      } else {
        statusEl.textContent = '✗ Invalid (< 1:2.0 Rule)';
        statusEl.className = 'rr-status invalid';
      }

      document.getElementById('calcPosBTC').textContent = calc.btcSize + ' BTC';
      document.getElementById('calcNotional').textContent = '$' + calc.notionalValue.toLocaleString();
      document.getElementById('calcEstProfit').textContent = '+$' + calc.estProfit.toFixed(2);
    }
  }

  // Bind Risk Calculator Inputs
  ['inpAccountEquity', 'inpEntryPrice', 'inpStopPrice', 'inpTargetPrice'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateRiskCalculator);
  });

  // 4. UI Toolbar & Subpanel Buttons Handlers
  document.getElementById('btnToggleProfile').addEventListener('click', function() {
    chart.showProfile = !chart.showProfile;
    this.classList.toggle('active', chart.showProfile);
    chart.renderVolumeProfileOverlay();
  });

  const btnToggleFootprint = document.getElementById('btnToggleFootprint');
  if (btnToggleFootprint) {
    btnToggleFootprint.addEventListener('click', function() {
      chart.showFootprint = !chart.showFootprint;
      this.classList.toggle('active', chart.showFootprint);
      const flowContainer = document.getElementById('tvFlowChart');
      const flowToolbar = document.getElementById('flowPaneToolbar');
      if (flowContainer) {
        flowContainer.style.display = chart.showFootprint ? 'block' : 'none';
      }
      if (flowToolbar) {
        flowToolbar.style.display = chart.showFootprint ? 'flex' : 'none';
      }
    });
  }

  // Subpanel internal toggles
  const btnPaneToggleVol = document.getElementById('btnPaneToggleVol');
  if (btnPaneToggleVol) {
    btnPaneToggleVol.addEventListener('click', function() {
      const active = chart.toggleVolume();
      this.classList.toggle('active', active);
    });
  }

  const btnPaneToggleDelta = document.getElementById('btnPaneToggleDelta');
  if (btnPaneToggleDelta) {
    btnPaneToggleDelta.addEventListener('click', function() {
      const active = chart.toggleDelta();
      this.classList.toggle('active', active);
    });
  }

  const btnPaneToggleCVD = document.getElementById('btnPaneToggleCVD');
  const btnToggleCVD = document.getElementById('btnToggleCVD');

  function handleCVDToggle() {
    const active = chart.toggleCVD();
    if (btnPaneToggleCVD) btnPaneToggleCVD.classList.toggle('active', active);
    if (btnToggleCVD) btnToggleCVD.classList.toggle('active', active);
  }

  if (btnPaneToggleCVD) btnPaneToggleCVD.addEventListener('click', handleCVDToggle);
  if (btnToggleCVD) btnToggleCVD.addEventListener('click', handleCVDToggle);

  const btnToggleSignals = document.getElementById('btnToggleSignals');
  if (btnToggleSignals) {
    btnToggleSignals.addEventListener('click', function() {
      chart.showSignals = !chart.showSignals;
      this.classList.toggle('active', chart.showSignals);
      chart.updateTradingViewMarkers();
      updateSignalBanner();
    });
  }

  const btnToggleSessions = document.getElementById('btnToggleSessions');
  if (btnToggleSessions) {
    btnToggleSessions.addEventListener('click', function() {
      const active = chart.toggleSessions();
      this.classList.toggle('active', active);
    });
  }

  document.getElementById('btnResetView').addEventListener('click', () => {
    chart.resetView();
  });

  document.getElementById('btnCloseBanner').addEventListener('click', () => {
    document.getElementById('activeSignalBanner').style.display = 'none';
  });

  // Timeframe buttons with debounce and smooth transition
  let isSwitchingTf = false;
  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const tf = this.getAttribute('data-tf');
      if (tf === dataFeed.timeframe && !isSwitchingTf) return;
      if (isSwitchingTf) return;
      isSwitchingTf = true;

      document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      const origText = this.textContent;
      this.style.opacity = '0.65';

      try {
        rawCandles = await dataFeed.loadFeed(dataFeed.currentMode, tf);
        processDataPipeline({ isTimeframeChange: true });
      } catch (err) {
        console.error('Error shifting timeframe:', err);
      } finally {
        this.style.opacity = '1';
        this.textContent = origText;
        isSwitchingTf = false;
      }
    });
  });

  // Feed selector
  document.getElementById('dataFeedSelect').addEventListener('change', async function() {
    const mode = this.value;
    rawCandles = await dataFeed.loadFeed(mode, dataFeed.timeframe);
    processDataPipeline();
  });

  // Sidebar Tabs
  document.querySelectorAll('.sb-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.sb-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.sb-tab-pane').forEach(p => p.classList.remove('active'));

      this.classList.add('active');
      const targetPane = this.getAttribute('data-tab');
      if (targetPane === 'telemetry') document.getElementById('paneTelemetry').classList.add('active');
      if (targetPane === 'decision') document.getElementById('paneDecision').classList.add('active');
      if (targetPane === 'risk') {
        document.getElementById('paneRisk').classList.add('active');
        updateRiskCalculator();
      }
    });
  });

  // 5. Backtest Modal
  const backtestModal = document.getElementById('backtestModal');
  const btnBacktest = document.getElementById('btnBacktest');
  const btnCloseBacktest = document.getElementById('btnCloseBacktest');
  const btnRerunBacktest = document.getElementById('btnRerunBacktest');

  function runAndDisplayBacktest() {
    const res = backtester.run(enrichedCandles, currentProfile);
    if (!res) return;

    document.getElementById('btTotalTrades').textContent = res.totalTrades;
    document.getElementById('btWinRate').textContent = res.winRate + '%';
    document.getElementById('btWinRate').className = 'btc-val ' + (res.winRate >= 50 ? 'pos' : 'neg');
    document.getElementById('btProfitFactor').textContent = res.profitFactor;
    document.getElementById('btNetProfit').textContent = (res.netPnL >= 0 ? '+' : '') + '$' + res.netPnL.toLocaleString();
    document.getElementById('btNetProfit').className = 'btc-val ' + (res.netPnL >= 0 ? 'pos' : 'neg');
    document.getElementById('btMaxDD').textContent = '-' + res.maxDrawdownPct + '%';

    // Render Equity Canvas
    const eqCanvas = document.getElementById('equityCanvas');
    backtester.renderEquityCanvas(eqCanvas, res.equityCurve);

    // Populate Trades Table
    const tbody = document.getElementById('btTableBody');
    tbody.innerHTML = '';
    for (const t of res.trades) {
      const tr = document.createElement('tr');
      const timeStr = new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      tr.innerHTML = `
        <td>#${t.tradeId}</td>
        <td>${timeStr}</td>
        <td>${t.setupType}</td>
        <td>${t.triggerLevel}</td>
        <td>${t.delta}</td>
        <td>$${t.entry}</td>
        <td>$${t.exit}</td>
        <td>${t.rr}</td>
        <td class="${t.netPnL >= 0 ? 'pos' : 'neg'}">${t.netPnL >= 0 ? '+' : ''}$${t.netPnL.toFixed(2)}</td>
        <td class="${t.outcome === 'WIN' ? 'pos' : 'neg'}">${t.outcome}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  btnBacktest.addEventListener('click', () => {
    backtestModal.classList.add('open');
    runAndDisplayBacktest();
  });

  btnCloseBacktest.addEventListener('click', () => {
    backtestModal.classList.remove('open');
  });

  btnRerunBacktest.addEventListener('click', () => {
    runAndDisplayBacktest();
  });

  // 6. Decision Tree Modal
  const decisionModal = document.getElementById('decisionModal');
  const btnDecisionTree = document.getElementById('btnDecisionTree');
  const btnCloseDecision = document.getElementById('btnCloseDecision');

  btnDecisionTree.addEventListener('click', () => {
    decisionModal.classList.add('open');
  });

  btnCloseDecision.addEventListener('click', () => {
    decisionModal.classList.remove('open');
  });

  // Close modals on escape key or clicking backdrop
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      backtestModal.classList.remove('open');
      decisionModal.classList.remove('open');
    }
  });

  // 7. Initial Load
  const initialMode = document.getElementById('dataFeedSelect').value || 'delta_india_btc';
  rawCandles = await dataFeed.loadFeed(initialMode, '5m');
  updateSymbolPill(initialMode);
  processDataPipeline();
  updateRiskCalculator();

  function updateSymbolPill(mode) {
    const symName = document.querySelector('.symbol-name');
    const symTag = document.querySelector('.symbol-tag');
    if (mode === 'delta_india_btc') {
      if (symName) symName.textContent = 'BTCUSD';
      if (symTag) symTag.textContent = 'DELTA INDIA';
    } else {
      if (symName) symName.textContent = 'BTCUSDT';
      if (symTag) symTag.textContent = 'PERP';
    }
  }

  // Update symbol pill on feed change
  document.getElementById('dataFeedSelect').addEventListener('change', function() {
    updateSymbolPill(this.value);
  });
});
