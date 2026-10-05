/* WiMetrix Factory Benchmark — calculation logic.
   Pure functions: no DOM access. The wizard's `answers` object is passed in by app.js.
   Requires config.js; exposes window.WiMetrix.formulas. */
(function(){
  "use strict";

  const CATEGORY_MACHINE_PARAMS = window.WiMetrix.config.CATEGORY_MACHINE_PARAMS;
  const OPERATIONAL_DAYS_PER_MONTH = window.WiMetrix.config.OPERATIONAL_DAYS_PER_MONTH;

  /* ---------------------------- Machine baseline ---------------------------- */
  function getQ3PredictedBaseline(answers){
    var vol = answers.q2 ? answers.q2.numeric : null;
    var category = answers.q1;
    if (!vol || vol <= 0 || !category) return null;
    var params = CATEGORY_MACHINE_PARAMS[category];
    if (!params) return null;
    // Step 2 captures MONTHLY volume; convert to a daily target for the per-line-day formula.
    var targetDailyVolume = vol / OPERATIONAL_DAYS_PER_MONTH;
    return Math.round((targetDailyVolume / params.targetPerLineDay) * params.machinesPerLine);
  }

  function getQ3ComparisonValues(predicted){
    return {
      less: Math.round(predicted * 0.85),
      exact: predicted,
      greater: Math.round(predicted * 1.15)
    };
  }

  /* ---------------------------- Diagnostic scoring ---------------------------- */
  function marginTierIndex(numeric){
    if (numeric < 3) return 0;
    if (numeric <= 6) return 1;
    if (numeric <= 10) return 2;
    return 3;
  }

  function computeEffGain(category, tierIdx){
    var isComplex = (category === "Woven / Bottoms" || category === "Work Wear");
    var isLowTier = (tierIdx === 0);
    if (isComplex){
      return Math.min(25, 18 + tierIdx * 2 + 1);
    }
    if (isLowTier) return 10;
    return Math.round(10 + tierIdx * 2.5);
  }

  function computeDiagnostic(answers){
    var category = answers.q1;
    var marginNumeric = answers.currentProfitPercentage.numeric;
    var marginDisplay = answers.currentProfitPercentage.display;
    var tierIdx = marginTierIndex(marginNumeric);

    var effGain = computeEffGain(category, tierIdx);

    var totalMachines = answers.q3.numeric;
    var params = CATEGORY_MACHINE_PARAMS[category];
    var lineCount = params
      ? Math.max(1, Math.round(totalMachines / params.machinesPerLine))
      : Math.max(1, Math.round(totalMachines / 30));

    var baselineOtPerLine = (tierIdx === 2) ? 4.5 : 3;
    var otHours = Math.round(lineCount * baselineOtPerLine);

    var volume = answers.q2.numeric;
    var predictedMachines = getQ3PredictedBaseline(answers);

    // Score: base 100 minus machine-variance penalty minus profit-margin penalty
    var machinePenalty = 0;
    if (predictedMachines != null){
      if (totalMachines < predictedMachines) machinePenalty = 10;
      else if (totalMachines > predictedMachines) machinePenalty = 20;
    }
    var profitPenalty;
    if (marginDisplay === "More than 7%") profitPenalty = 0;
    else if (marginDisplay === "3 – 6%") profitPenalty = 20;
    else profitPenalty = 45; // "Less than 3%"

    var rawScore = Math.max(0, 100 - machinePenalty - profitPenalty);
    // Cap the maximum achievable baseline score at 92 (a manual high-performer, not full automation).
    var score = Math.min(92, rawScore);

    var peakTier = (score === 92);

    var tierLabel, tierSub, arcColor, maturity;
    if (peakTier){
      tierLabel = "OPTIMAL"; tierSub = "Operating at peak industry benchmark"; arcColor = "#00a884";
      maturity = "Automation Maturity: Level 3/4 (Manual High-Performer)";
    } else if (score >= 70){
      tierLabel = "MINIMAL GAP"; tierSub = "High efficiency with room to scale"; arcColor = "#84cc16";
      maturity = "Automation Maturity: Level 2/4 (Standard Tracking)";
    } else if (score >= 60){
      tierLabel = "MODERATE GAP"; tierSub = "Opportunities for operational optimization"; arcColor = "#eab308";
      maturity = "Automation Maturity: Level 1/4 (Reactive Operations)";
    } else {
      tierLabel = "CRITICAL GAP"; tierSub = "Significant operational & margin leakage"; arcColor = "#ef4444";
      maturity = "Automation Maturity: Level 1/4 (Reactive Operations)";
    }

    return {
      effGain: effGain,
      otHours: otHours,
      marginDisplay: marginDisplay,
      totalMachines: totalMachines,
      predictedMachines: predictedMachines,
      profitPercentage: marginNumeric,
      volume: volume,
      score: score,
      tierLabel: tierLabel,
      tierSub: tierSub,
      arcColor: arcColor,
      maturity: maturity
    };
  }

  window.WiMetrix.formulas = {
    getQ3PredictedBaseline: getQ3PredictedBaseline,
    getQ3ComparisonValues: getQ3ComparisonValues,
    marginTierIndex: marginTierIndex,
    computeEffGain: computeEffGain,
    computeDiagnostic: computeDiagnostic
  };

})();
