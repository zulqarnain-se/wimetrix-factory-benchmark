/* WiMetrix Factory Benchmark — DOM wiring: wizard steps, results.
   Requires config.js and formulas.js to be loaded first. */
(function(){
  "use strict";

  const {
    QUESTIONS, CATEGORY_CARDS,
    AI_OPS_MODULE_URL, PLAN_PRO_MODULE_URL, SPTS_MODULE_URL, SQMS_MODULE_URL, FABRIC_SAVER_MODULE_URL
  } = window.WiMetrix.config;
  const { getQ3PredictedBaseline, getQ3ComparisonValues, computeDiagnostic } = window.WiMetrix.formulas;

  var answers = { q1:"", q2:"", q3:"", currentProfitPercentage:"" };

  /* ---------------------------- Modal field rendering ---------------------------- */
  var wizardSteps = document.getElementById("step-panels");
  var stepPanelEls = wizardSteps.querySelectorAll(".step-panel");
  var progressFill = document.getElementById("progress-fill");
  var stepBadge = document.getElementById("step-badge");
  var backBtn = document.getElementById("wizard-back");
  var nextBtn = document.getElementById("wizard-next");
  var nextBtnDefaultHTML = nextBtn.innerHTML;
  var pendingAdvanceTimer = null;
  var currentStep = 1;
  var submitBtn = null;

  function optionItemHtml(opt, extraAttr){
    return '<button type="button" '+extraAttr+' data-value="'+opt+'" ' +
      'class="w-full px-3.5 py-2.5 text-xs font-medium text-slate-700 rounded-lg cursor-pointer transition-colors duration-150 flex items-center justify-between hover:bg-emerald-50 hover:text-emerald-700 hover:font-semibold">' +
      '<span>'+opt+'</span>' +
      '<svg aria-hidden="true" class="opt-check hidden shrink-0 ml-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
    '</button>';
  }

  function markSelectedOption(optionEls, selectedValue){
    optionEls.forEach(function(el){
      var isSel = selectedValue != null && el.getAttribute("data-value") === selectedValue;
      el.classList.toggle("bg-emerald-50", isSel);
      el.classList.toggle("text-emerald-700", isSel);
      el.classList.toggle("font-bold", isSel);
      el.classList.toggle("border-l-4", isSel);
      el.classList.toggle("border-emerald-500", isSel);
      var check = el.querySelector(".opt-check");
      if (check) check.classList.toggle("hidden", !isSel);
    });
  }

  function setCardSelected(card, isSel){
    if (isSel){
      card.classList.remove("border", "border-slate-200/90");
      card.classList.add("border-2", "border-emerald-500", "bg-emerald-50/20");
    } else {
      card.classList.remove("border-2", "border-emerald-500", "bg-emerald-50/20");
      card.classList.add("border", "border-slate-200/90");
    }
  }

  /* Reusable unified combo-box (typed input + floating preset panel), used by Steps 2-4 */
  function buildComboField(q, onChange, enterBehavior){
    var wrap = document.createElement("div");
    var comboOptionsHtml = "";
    q.options.forEach(function(opt, idx){
      comboOptionsHtml += optionItemHtml(opt, 'data-role="combo-option" data-idx="'+idx+'"');
    });
    wrap.innerHTML =
      '<h3 class="text-xl font-semibold text-slate-900 leading-snug mb-1">'+q.label+'</h3>' +
      '<p class="text-xs text-slate-500 mb-3">'+(q.subtext || "")+'</p>' +
      '<div class="relative" data-role="combo-wrap">' +
        '<div data-role="combo-box" class="flex items-center rounded-xl border border-slate-200/80 bg-slate-50/70 hover:border-slate-300 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:bg-white transition-all duration-200">' +
          '<input type="text" inputmode="numeric" data-role="combo-input" placeholder="'+q.placeholder+'" autocomplete="off" ' +
            'class="flex-1 min-w-0 bg-transparent text-xs font-medium text-slate-800 pl-4 pr-1 py-2.5 outline-none" />' +
          '<button type="button" data-role="combo-toggle" aria-label="Show preset options" aria-expanded="false" ' +
            'class="pl-1 pr-4 py-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors">' +
            '<svg aria-hidden="true" data-role="combo-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-150"><polyline points="6 9 12 15 18 9"/></svg>' +
          '</button>' +
        '</div>' +
        '<div data-role="combo-panel" class="hidden absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200/90 rounded-xl shadow-xl shadow-slate-900/10 p-1.5 overflow-hidden">' +
          comboOptionsHtml +
        '</div>' +
      '</div>';

    var comboWrap = wrap.querySelector('[data-role="combo-wrap"]');
    var comboBox = wrap.querySelector('[data-role="combo-box"]');
    var comboInput = wrap.querySelector('[data-role="combo-input"]');
    var comboToggle = wrap.querySelector('[data-role="combo-toggle"]');
    var comboChevron = wrap.querySelector('[data-role="combo-chevron"]');
    var comboPanel = wrap.querySelector('[data-role="combo-panel"]');
    var comboOptionEls = wrap.querySelectorAll('[data-role="combo-option"]');

    function openPanel(){
      comboPanel.classList.remove("hidden");
      comboToggle.setAttribute("aria-expanded", "true");
      comboChevron.classList.add("rotate-180");
    }
    function closePanel(){
      comboPanel.classList.add("hidden");
      comboToggle.setAttribute("aria-expanded", "false");
      comboChevron.classList.remove("rotate-180");
    }
    function togglePanel(){
      if (comboPanel.classList.contains("hidden")) openPanel(); else closePanel();
    }

    comboBox.addEventListener("click", function(){ openPanel(); comboInput.focus(); });
    comboToggle.addEventListener("click", function(e){ e.stopPropagation(); togglePanel(); });
    comboInput.addEventListener("focus", openPanel);

    comboInput.addEventListener("input", function(e){
      var digits = e.target.value.replace(/[^0-9]/g, "");
      if (digits){
        answers[q.key] = { source: "manual", numeric: parseInt(digits, 10), display: e.target.value };
      } else {
        answers[q.key] = null;
      }
      markSelectedOption(comboOptionEls, null);
      if (onChange) onChange(answers[q.key]);
      updateNextEnabled();
    });

    comboInput.addEventListener("keydown", function(e){
      if (e.key !== "Enter") return;
      e.preventDefault();
      closePanel();
      if (enterBehavior === "none"){
        comboInput.blur();
        return;
      }
      if (!answers[q.key]) return;
      if (enterBehavior === "delay") scheduleAutoAdvance(1200); else advanceCurrentStep();
    });

    comboOptionEls.forEach(function(optBtn){
      optBtn.addEventListener("click", function(e){
        e.stopPropagation();
        var idx = parseInt(optBtn.getAttribute("data-idx"), 10);
        comboInput.value = q.options[idx];
        answers[q.key] = { source: "range", numeric: q.mid[idx], display: q.options[idx] };
        markSelectedOption(comboOptionEls, q.options[idx]);
        if (onChange) onChange(answers[q.key]);
        updateNextEnabled();
        closePanel();
        if (enterBehavior === "delay") scheduleAutoAdvance(1200);
      });
    });

    document.addEventListener("click", function(e){
      if (!comboWrap.contains(e.target)) closePanel();
    });

    return wrap;
  }

  /* Native select dropdown — used by Q04 (profit percentage) */
  function buildSelectField(q){
    var wrap = document.createElement("div");
    var itemsHtml = "";
    q.options.forEach(function(opt, idx){
      itemsHtml +=
        '<button type="button" data-role="dd-item" data-idx="'+idx+'" ' +
          'class="dd-item w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium text-slate-700 transition-colors flex items-center justify-between hover:bg-[#e6f7f3] hover:text-[#00a884] hover:font-bold">' +
          '<span>'+opt+'</span>' +
          '<svg aria-hidden="true" class="dd-check hidden shrink-0 ml-2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</button>';
    });
    wrap.innerHTML =
      '<h3 class="text-xl font-semibold text-slate-900 leading-snug mb-1">'+q.label+'</h3>' +
      '<p class="text-xs text-slate-500 mb-3">'+(q.subtext || "")+'</p>' +
      '<div class="relative" data-role="dd-wrap">' +
        '<button type="button" data-role="dd-trigger" aria-haspopup="listbox" aria-expanded="false" ' +
          'class="w-full flex items-center justify-between gap-2 rounded-xl bg-gray-50/50 border border-slate-200/80 hover:border-slate-300 text-left pl-4 pr-4 py-3 text-xs font-medium transition-all duration-200" >' +
          '<span data-role="dd-label" class="truncate text-gray-400">'+q.placeholder+'</span>' +
          '<svg aria-hidden="true" data-role="dd-chevron" class="shrink-0 text-slate-400 transition-transform duration-200" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>' +
        '</button>' +
        '<div data-role="dd-panel" class="hidden absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-lg border border-slate-100 p-2">' +
          itemsHtml +
        '</div>' +
      '</div>';

    var ddWrap = wrap.querySelector('[data-role="dd-wrap"]');
    var trigger = wrap.querySelector('[data-role="dd-trigger"]');
    var label = wrap.querySelector('[data-role="dd-label"]');
    var chevron = wrap.querySelector('[data-role="dd-chevron"]');
    var panel = wrap.querySelector('[data-role="dd-panel"]');
    var items = wrap.querySelectorAll('[data-role="dd-item"]');

    function openDD(){
      panel.classList.remove("hidden");
      trigger.setAttribute("aria-expanded", "true");
      chevron.classList.add("rotate-180");
      trigger.style.boxShadow = "0 0 0 3px rgba(0,168,132,0.18)";
    }
    function closeDD(){
      panel.classList.add("hidden");
      trigger.setAttribute("aria-expanded", "false");
      chevron.classList.remove("rotate-180");
      trigger.style.boxShadow = "";
    }
    function toggleDD(){
      if (panel.classList.contains("hidden")) openDD(); else closeDD();
    }

    trigger.addEventListener("click", function(e){ e.stopPropagation(); toggleDD(); });

    items.forEach(function(item){
      item.addEventListener("click", function(e){
        e.stopPropagation();
        var idx = parseInt(item.getAttribute("data-idx"), 10);
        answers[q.key] = { source: "select", numeric: q.mid[idx], display: q.options[idx] };
        label.textContent = q.options[idx];
        label.classList.remove("text-gray-400");
        label.classList.add("text-slate-900");
        items.forEach(function(other){
          var isSel = other === item;
          other.classList.toggle("bg-[#e6f7f3]", isSel);
          other.classList.toggle("text-[#00a884]", isSel);
          other.classList.toggle("font-bold", isSel);
          var check = other.querySelector(".dd-check");
          if (check) check.classList.toggle("hidden", !isSel);
        });
        updateNextEnabled();
        closeDD();
      });
    });

    document.addEventListener("click", function(e){
      if (!ddWrap.contains(e.target)) closeDD();
    });

    return wrap;
  }

  /* Plain numeric input, no dropdown/presets — used by Q03 */
  /* ---- Step 1: visual category grid ---- */
  function buildStep1(){
    var panel = stepPanelEls[0];
    var iconFrame = function(iconSrc, imgClass){
      return '<div class="cat-frame h-28 w-full rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center p-3 transition-all duration-200 group-hover:bg-emerald-50/40 group-hover:border-emerald-300">' +
        '<img src="'+iconSrc+'" alt="" class="'+(imgClass || "h-14 w-14 object-contain filter drop-shadow-sm transition-transform duration-200 group-hover:scale-105")+'" />' +
      '</div>';
    };
    var cardsHtml = CATEGORY_CARDS.map(function(card){
      var isSingle = card.icons.length === 1;
      var iconsBlock, textAlignClass;
      if (isSingle){
        iconsBlock =
          '<div class="mb-3 h-28 w-full rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center p-5 transition-all duration-200 group-hover:bg-emerald-50/40 group-hover:border-emerald-300 cat-frame">' +
            '<img src="'+card.icons[0]+'" alt="" class="'+(card.imgClass || "w-10 h-10 object-contain mix-blend-multiply")+'" />' +
          '</div>';
        textAlignClass = " text-center";
      } else {
        iconsBlock =
          '<div class="grid grid-cols-2 gap-2 mb-3">' +
            iconFrame(card.icons[0], (card.imgClasses && card.imgClasses[0]) || card.imgClass) +
            iconFrame(card.icons[1], (card.imgClasses && card.imgClasses[1]) || card.imgClass) +
          '</div>';
        textAlignClass = "";
      }
      return '<button type="button" data-role="cat-card" data-value="'+card.value+'" ' +
        'class="group cat-card relative bg-white/80 border border-slate-200/90 rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md hover:bg-white/90 text-left">' +
        '<span class="cat-check hidden absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white items-center justify-center shadow-md">' +
          '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</span>' +
        iconsBlock +
        '<div class="text-sm font-bold text-slate-900 mt-1'+textAlignClass+'">'+card.title+'</div>' +
        '<div class="text-xs text-slate-500'+textAlignClass+'">'+card.subtitle+'</div>' +
      '</button>';
    }).join("");

    panel.innerHTML =
      '<div class="flex items-start gap-3 mb-4">' +
        '<span class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">' +
          '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>' +
        '</span>' +
        '<div>' +
          '<h3 class="text-xl font-semibold text-slate-900 leading-snug">'+QUESTIONS[0].label+'</h3>' +
          '<p class="text-xs text-slate-500 mt-0.5">'+QUESTIONS[0].subtext+'</p>' +
        '</div>' +
      '</div>' +
      '<div class="grid grid-cols-2 gap-4">' + cardsHtml + '</div>';

    var cardEls = panel.querySelectorAll('[data-role="cat-card"]');
    cardEls.forEach(function(card){
      card.addEventListener("click", function(){
        var val = card.getAttribute("data-value");
        answers.q1 = val;
        cardEls.forEach(function(c){
          var isSel = c === card;
          setCardSelected(c, isSel);
          var check = c.querySelector(".cat-check");
          if (isSel) check.classList.remove("hidden"); else check.classList.add("hidden");
          c.querySelectorAll(".cat-frame").forEach(function(frame){
            frame.classList.toggle("border-2", isSel);
            frame.classList.toggle("border-emerald-500", isSel);
            frame.classList.toggle("bg-emerald-50/20", isSel);
            frame.classList.toggle("border", !isSel);
            frame.classList.toggle("border-slate-200/80", !isSel);
            frame.classList.toggle("bg-slate-50", !isSel);
          });
        });
        setTimeout(function(){ goToStep(2); }, 300);
      });
    });
  }

  /* ---- Step 2: capacity combo + dynamic benchmark hint ---- */
  var q3ComparisonChoice = "exact";

  function updateQ3CardSelection(direction){
    var ids = { less: "q3-less-btn", exact: "q3-exact-btn", greater: "q3-greater-btn" };
    Object.keys(ids).forEach(function(key){
      var btn = document.getElementById(ids[key]);
      if (!btn) return;
      var isSel = key === direction;
      btn.classList.toggle("border-emerald-500", isSel);
      btn.classList.toggle("bg-emerald-50/50", isSel);
      btn.classList.toggle("border-gray-200", !isSel);
    });
  }

  function updateQ3BenchmarkNote(){
    var note = document.getElementById("q3-benchmark-note");
    var lessValue = document.getElementById("q3-less-value");
    var exactValue = document.getElementById("q3-exact-value");
    var greaterValue = document.getElementById("q3-greater-value");
    if (!note) return;
    var vol = answers.q2 ? answers.q2.numeric : null;
    var predicted = getQ3PredictedBaseline(answers);
    if (!vol || predicted == null){
      note.classList.add("hidden");
      note.innerHTML = "";
      if (lessValue) lessValue.textContent = "--";
      if (exactValue) exactValue.textContent = "--";
      if (greaterValue) greaterValue.textContent = "--";
      return;
    }
    note.innerHTML =
      '<p class="leading-relaxed"><span class="text-emerald-600" aria-hidden="true">\u2728</span> WiMetrix Predicted Baseline: <span class="font-bold text-slate-900">' + predicted + ' Machines</span></p>' +
      '<p class="text-emerald-800/80 mt-0.5">Optimal setup for ' + vol.toLocaleString() + ' monthly pieces.</p>';
    note.classList.remove("hidden");

    var cmp = getQ3ComparisonValues(predicted);
    if (lessValue) lessValue.textContent = predicted;
    if (exactValue) exactValue.textContent = predicted;
    if (greaterValue) greaterValue.textContent = predicted;

    // Keep the saved answer in sync with whichever card is chosen (or default to the
    // baseline card) whenever the predicted value is recalculated.
    var actual = cmp[q3ComparisonChoice];
    answers.q3 = { source: "comparison", numeric: actual, display: actual + " machines (" + q3ComparisonChoice + ")" };
    updateQ3CardSelection(q3ComparisonChoice);
  }

  function selectQ3Comparison(direction){
    var predicted = getQ3PredictedBaseline(answers);
    if (predicted == null) return;
    var cmp = getQ3ComparisonValues(predicted);
    var actual = cmp[direction];
    q3ComparisonChoice = direction;
    answers.q3 = { source: "comparison", numeric: actual, display: actual + " machines (" + direction + ")" };

    updateQ3CardSelection(direction);
    updateNextEnabled();
    setTimeout(function(){ goToStep(4); }, 300);
  }

  function buildStep2(){
    var panel = stepPanelEls[1];
    var field = buildComboField(QUESTIONS[1], null, "none");
    panel.appendChild(field);
  }

  /* ---- Step 3: AI-predicted baseline banner + a unified 3-card comparison grid ---- */
  function buildStep3(){
    var panel = stepPanelEls[2];

    var header = document.createElement("div");
    header.innerHTML =
      '<h3 class="text-xl font-semibold text-slate-900 leading-snug mb-1">'+QUESTIONS[2].label+'</h3>' +
      '<p class="text-xs text-slate-500 mb-3">'+QUESTIONS[2].subtext+'</p>';
    panel.appendChild(header);

    var note = document.createElement("div");
    note.id = "q3-benchmark-note";
    note.className = "hidden mb-4 p-5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 shadow-sm";
    panel.appendChild(note);

    var cardBase = "q3-choice-card relative min-h-[92px] sm:min-h-[100px] flex flex-col items-center justify-center border-2 border-gray-200 rounded-xl p-3 text-center cursor-pointer hover:border-emerald-300 transition-all duration-200";
    var symbolClass = "text-2xl font-extrabold text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] text-center";

    var controlWrap = document.createElement("div");
    controlWrap.innerHTML =
      '<p class="text-center text-sm text-gray-600 mb-2">Your Current Active Machine Count</p>' +
      '<div class="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-1.5 items-center">' +
        '<button type="button" id="q3-less-btn" class="'+cardBase+'">' +
          '<span class="flex items-baseline justify-center gap-1 leading-tight flex-wrap">' +
            '<span id="q3-less-value" class="text-xl font-bold text-slate-900">--</span>' +
            '<span class="text-xl font-bold text-slate-900">Machines</span>' +
          '</span>' +
          '<span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-1.5">Less</span>' +
        '</button>' +
        '<span class="'+symbolClass+'" aria-hidden="true">&lt;</span>' +
        '<button type="button" id="q3-exact-btn" class="'+cardBase+'">' +
          '<span class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-1">' +
            '<span aria-hidden="true">\u2728</span> AI Suggested' +
          '</span>' +
          '<span class="flex items-baseline justify-center gap-1 leading-tight flex-wrap">' +
            '<span id="q3-exact-value" class="text-xl font-bold text-emerald-600">--</span>' +
            '<span class="text-xl font-bold text-emerald-600">Machines</span>' +
          '</span>' +
          '<span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-1.5">Exact Match</span>' +
        '</button>' +
        '<span class="'+symbolClass+'" aria-hidden="true">&gt;</span>' +
        '<button type="button" id="q3-greater-btn" class="'+cardBase+'">' +
          '<span class="flex items-baseline justify-center gap-1 leading-tight flex-wrap">' +
            '<span id="q3-greater-value" class="text-xl font-bold text-slate-900">--</span>' +
            '<span class="text-xl font-bold text-slate-900">Machines</span>' +
          '</span>' +
          '<span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-1.5">Greater</span>' +
        '</button>' +
      '</div>';
    panel.appendChild(controlWrap);

    controlWrap.querySelector("#q3-less-btn").addEventListener("click", function(){ selectQ3Comparison("less"); });
    controlWrap.querySelector("#q3-exact-btn").addEventListener("click", function(){ selectQ3Comparison("exact"); });
    controlWrap.querySelector("#q3-greater-btn").addEventListener("click", function(){ selectQ3Comparison("greater"); });
  }

  /* ---- Step 4: profit margin combo + submit action ---- */
  function buildStep4(){
    var panel = stepPanelEls[3];
    var field = buildSelectField(QUESTIONS[3]);
    panel.appendChild(field);

    var actionWrap = document.createElement("div");
    actionWrap.innerHTML =
      '<button id="submit-btn" disabled ' +
        'class="mt-5 w-full py-3 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all duration-200 bg-slate-100 text-slate-400 cursor-not-allowed">' +
        '<span class="shimmer text-base leading-none" aria-hidden="true">✦</span> Get My Diagnostic Report' +
      '</button>' +
      '<p class="mt-2.5 text-center text-[11px] text-slate-400">Diagnostic report generated instantly by the WiMetrix AI engine.</p>';
    panel.appendChild(actionWrap);

    submitBtn = actionWrap.querySelector("#submit-btn");
    submitBtn.addEventListener("click", function(){
      if (submitBtn.disabled) return;
      renderResults();
      formState.classList.add("hidden");
      resultsState.classList.remove("hidden");
    });
  }

  buildStep1();
  buildStep2();
  buildStep3();
  buildStep4();

  /* ---- Wizard navigation ---- */
  function updateNextEnabled(){
    var q = QUESTIONS[currentStep - 1];
    var answered = !!(q && answers[q.key]);
    if (currentStep === 4){
      if (!submitBtn) return;
      submitBtn.disabled = !answered;
      submitBtn.className = answered
        ? "mt-5 w-full py-3 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all duration-200 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.01] active:scale-[0.99]"
        : "mt-5 w-full py-3 inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all duration-200 bg-slate-100 text-slate-400 cursor-not-allowed";
    } else if (currentStep === 2 || currentStep === 3){
      nextBtn.disabled = !answered;
      nextBtn.className = answered
        ? "ml-auto inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-bold transition-all duration-200 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
        : "ml-auto inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-bold transition-all duration-200 bg-slate-100 text-slate-400 cursor-not-allowed";
    }
  }

  function showNextBtnLoading(){
    nextBtn.disabled = true;
    nextBtn.innerHTML =
      '<svg aria-hidden="true" class="shimmer" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Saved';
    nextBtn.className = "ml-auto inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-bold transition-all duration-200 bg-emerald-600 text-white shadow-md shadow-emerald-600/20 cursor-default";
  }

  function restoreNextBtn(){
    nextBtn.innerHTML = nextBtnDefaultHTML;
  }

  function scheduleAutoAdvance(delay){
    if (pendingAdvanceTimer) clearTimeout(pendingAdvanceTimer);
    var stepAtSchedule = currentStep;
    showNextBtnLoading();
    pendingAdvanceTimer = setTimeout(function(){
      pendingAdvanceTimer = null;
      restoreNextBtn();
      if (currentStep === stepAtSchedule) goToStep(stepAtSchedule + 1);
    }, delay);
  }

  function goToStep(step){
    if (pendingAdvanceTimer){
      clearTimeout(pendingAdvanceTimer);
      pendingAdvanceTimer = null;
      restoreNextBtn();
    }
    currentStep = step;
    stepPanelEls.forEach(function(p){
      var s = parseInt(p.getAttribute("data-step"), 10);
      p.classList.toggle("hidden", s !== step);
    });
    progressFill.style.width = (step / 4 * 100) + "%";
    stepBadge.textContent = "Step " + step + " of 4";
    backBtn.classList.toggle("hidden", step === 1);
    nextBtn.classList.toggle("hidden", step === 1 || step === 4);
    if (step === 3) updateQ3BenchmarkNote();
    updateNextEnabled();
  }

  function advanceCurrentStep(){
    var q = QUESTIONS[currentStep - 1];
    if (!q || !answers[q.key]) return;
    if (currentStep === 4){
      if (submitBtn && !submitBtn.disabled) submitBtn.click();
    } else if (currentStep < 4){
      goToStep(currentStep + 1);
    }
  }

  nextBtn.addEventListener("click", function(){
    if (nextBtn.disabled) return;
    advanceCurrentStep();
  });
  backBtn.addEventListener("click", function(){
    if (currentStep > 1) goToStep(currentStep - 1);
  });

  goToStep(1);

  /* ---------------------------- Results rendering ---------------------------- */
  var formState = document.getElementById("modal-form-state");
  var resultsState = document.getElementById("modal-results-state");

  /* ---- Module catalog: one definition reused across all scenarios ---- */
  function renderResults(){
    var r = computeDiagnostic(answers);
    var volumeFormatted = r.volume.toLocaleString();

    var highEfficiency = (r.predictedMachines != null) &&
                         (r.totalMachines < r.predictedMachines) &&
                         (r.profitPercentage > 7);

    var fabricSaverSpts = (r.predictedMachines != null) &&
                          (r.totalMachines > r.predictedMachines) &&
                          (r.marginDisplay === "Less than 3%");

    var fabricSaverSqmsLow = (r.predictedMachines != null) &&
                             (r.totalMachines === r.predictedMachines) &&
                             (r.marginDisplay === "Less than 3%");

    var sqmsFabricSaver = (r.predictedMachines != null) &&
                          (r.totalMachines < r.predictedMachines) &&
                          (r.marginDisplay === "Less than 3%");

    var sqmsSpts = (r.predictedMachines != null) &&
                   (r.totalMachines > r.predictedMachines) &&
                   (r.marginDisplay === "3 – 6%");

    var fabricSaverSqms = (r.predictedMachines != null) &&
                          (r.totalMachines === r.predictedMachines) &&
                          (r.marginDisplay === "3 – 6%");

    var sqmsPlanPro = (r.predictedMachines != null) &&
                      (r.totalMachines < r.predictedMachines) &&
                      (r.marginDisplay === "3 – 6%");

    var planProSpts = (r.predictedMachines != null) &&
                      (r.totalMachines > r.predictedMachines) &&
                      (r.profitPercentage > 7);

    var planPro = (r.predictedMachines != null) &&
                  (r.totalMachines === r.predictedMachines) &&
                  (r.profitPercentage > 7);

    var middleSection, ctaSection;

    const ICON_SQMS = '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>';
    const ICON_FABRIC = '<path d="M3 6l3-3h12l3 3"/><path d="M4 6h16v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M9 11l2 2 4-4"/>';
    const ICON_SPTS = '<path d="M3 3v18h18"/><path d="M7 15l3-4 3 2 4-6"/><circle cx="7" cy="15" r="1" fill="#00a884" stroke="none"/><circle cx="10" cy="11" r="1" fill="#00a884" stroke="none"/><circle cx="13" cy="13" r="1" fill="#00a884" stroke="none"/><circle cx="17" cy="7" r="1" fill="#00a884" stroke="none"/>';
    const ICON_PLANPRO = '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><path d="M8 14l2.5 2.5L16 12"/>';
    const ICON_AIOPS = '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 8V5"/><circle cx="12" cy="3.5" r="1.2" fill="#00a884" stroke="none"/><circle cx="9" cy="13" r="1.3" fill="#00a884" stroke="none"/><circle cx="15" cy="13" r="1.3" fill="#00a884" stroke="none"/><path d="M9 17h6"/>';

    const DESC_FABRIC = '<span class="font-bold text-gray-900">Save 2%\u20135% fabric utilization</span> through optimized spreading and marker control.';
    const DESC_SQMS = '<span class="font-bold text-gray-900">Cut floor defect rates by up to 50%</span> with station-level inline quality tracking.';
    const DESC_SPTS = '<span class="font-bold text-gray-900">Boost line efficiency by 10%\u201315%</span> with real-time operator output tracking.';
    const DESC_PLANPRO = '<span class="font-bold text-gray-900">Reduce changeover downtime by 20%</span> through automated capacity planning.';
    const DESC_AIOPS = '<span class="font-bold text-gray-900">Prevent floor stoppages</span> with predictive anomaly detection.';

    function moduleCard(icon, title, desc){
      return '<div class="rounded-2xl bg-white border border-[#00a884]/40 p-5 text-center shadow-[0_4px_20px_rgba(0,168,132,0.12)]">' +
        '<span class="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-2.5 chip-emerald">' +
          '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00a884" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+icon+'</svg>' +
        '</span>' +
        '<h3 class="text-base font-black tracking-tight text-gray-900">'+title+'</h3>' +
        '<p class="text-[11.5px] leading-relaxed text-gray-500 mt-1">'+desc+'</p>' +
      '</div>';
    }
    function moduleBtn(label, url){
      return '<a href="'+url+'" target="_blank" rel="noopener noreferrer" class="w-full py-3.5 px-4 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md" style="background-color:#00a884;" onmouseover="this.style.backgroundColor=\'#008f70\'" onmouseout="this.style.backgroundColor=\'#00a884\'">' +
        label +
        '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
      '</a>';
    }
    function banner(msg){
      return '<div class="my-5 rounded-2xl bg-emerald-50/70 border border-emerald-400/50 p-4 text-center shadow-[0_4px_20px_rgba(0,168,132,0.12)]"><p class="text-[13px] leading-relaxed font-bold text-gray-900">'+msg+'</p></div>';
    }
    function dualCards(c1, c2){ return '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">'+c1+c2+'</div>'; }
    function labeledDualCards(label, c1, c2){
      return '<div class="my-5"><h4 class="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-2">'+label+'</h4>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">'+c1+c2+'</div></div>';
    }
    function dualBtns(b1, b2){
      return '<div class="flex flex-col gap-3 mt-2"><div class="grid grid-cols-1 sm:grid-cols-2 gap-3">'+b1+b2+'</div>' +
        '<button id="results-secondary-cta" class="w-full py-2 text-xs font-semibold text-gray-400 hover:text-gray-700 transition text-center">Restart diagnostic</button></div>';
    }
    function singleBtn(b1){
      return '<div class="flex flex-col gap-3 mt-2">'+b1+
        '<button id="results-secondary-cta" class="w-full py-2 text-xs font-semibold text-gray-400 hover:text-gray-700 transition text-center">Restart diagnostic</button></div>';
    }

    if (fabricSaverSpts){
      middleSection =
        banner('High machinery overhead paired with critically low margins indicates severe operational inefficiencies! Deploy Fabric Saver &amp; SPTS to cut material costs and lift operator productivity.') +
        dualCards(
          moduleCard(ICON_FABRIC, "Fabric Saver", DESC_FABRIC),
          moduleCard(ICON_SPTS, "SPTS", DESC_SPTS)
        );
      ctaSection = dualBtns(moduleBtn("Explore Fabric Saver", FABRIC_SAVER_MODULE_URL), moduleBtn("Explore SPTS Module", SPTS_MODULE_URL));
    } else if (fabricSaverSqmsLow){
      middleSection =
        banner('Machine scale is on benchmark, but profit margins are critically low! Deploy Fabric Saver &amp; SQMS to recover lost margins.') +
        dualCards(
          moduleCard(ICON_FABRIC, "Fabric Saver", DESC_FABRIC),
          moduleCard(ICON_SQMS, "SQMS", DESC_SQMS)
        );
      ctaSection = dualBtns(moduleBtn("Explore Fabric Saver", FABRIC_SAVER_MODULE_URL), moduleBtn("Explore SQMS Module", SQMS_MODULE_URL));
    } else if (sqmsFabricSaver){
      middleSection =
        banner('Margins are severely compressed! Deploy SQMS &amp; Fabric Saver to eliminate defects and reclaim margin.') +
        dualCards(
          moduleCard(ICON_SQMS, "SQMS", DESC_SQMS),
          moduleCard(ICON_FABRIC, "Fabric Saver", DESC_FABRIC)
        );
      ctaSection = dualBtns(moduleBtn("Explore SQMS Module", SQMS_MODULE_URL), moduleBtn("Explore Fabric Saver", FABRIC_SAVER_MODULE_URL));
    } else if (sqmsSpts){
      middleSection =
        banner('Your line count is expanded, but your margins indicate operational leakage! Deploy SQMS &amp; SPTS to tighten quality and track operator efficiency.') +
        dualCards(
          moduleCard(ICON_SQMS, "SQMS", DESC_SQMS),
          moduleCard(ICON_SPTS, "SPTS", DESC_SPTS)
        );
      ctaSection = dualBtns(moduleBtn("Explore SQMS Module", SQMS_MODULE_URL), moduleBtn("Explore SPTS Module", SPTS_MODULE_URL));
    } else if (fabricSaverSqms){
      middleSection =
        banner('Your plant capacity is aligned! Enhance fabric yield efficiency &amp; automated defect tracking to cut operational waste and boost overall margins.') +
        labeledDualCards("Recommended Solutions",
          moduleCard(ICON_FABRIC, "Fabric Saver", DESC_FABRIC),
          moduleCard(ICON_SQMS, "SQMS", DESC_SQMS)
        );
      ctaSection = dualBtns(moduleBtn("Explore Fabric Saver", FABRIC_SAVER_MODULE_URL), moduleBtn("Explore SQMS Module", SQMS_MODULE_URL));
    } else if (sqmsPlanPro){
      middleSection =
        banner('Your plant is operating steadily with good baseline profitability! Deploy SQMS &amp; Plan Pro to upgrade quality and planning.') +
        dualCards(
          moduleCard(ICON_SQMS, "SQMS", DESC_SQMS),
          moduleCard(ICON_PLANPRO, "Plan Pro", DESC_PLANPRO)
        );
      ctaSection = dualBtns(moduleBtn("Explore SQMS Module", SQMS_MODULE_URL), moduleBtn("Explore Plan Pro", PLAN_PRO_MODULE_URL));
    } else if (planProSpts){
      middleSection =
        banner('Your plant capacity is expanding with healthy margins! Deploy Plan Pro &amp; SPTS to optimize tracking and scheduling.') +
        dualCards(
          moduleCard(ICON_PLANPRO, "Plan Pro", DESC_PLANPRO),
          moduleCard(ICON_SPTS, "SPTS", DESC_SPTS)
        );
      ctaSection = dualBtns(moduleBtn("Explore Plan Pro", PLAN_PRO_MODULE_URL), moduleBtn("Explore SPTS Module", SPTS_MODULE_URL));
    } else if (planPro){
      middleSection =
        banner('You are operating at peak industry benchmark! Deploy Plan Pro &amp; AI Production Intelligence to sustain margins and end manual scheduling.') +
        dualCards(
          moduleCard(ICON_PLANPRO, "Plan Pro", DESC_PLANPRO),
          moduleCard(ICON_AIOPS, "AI Production Intelligence", DESC_AIOPS)
        );
      ctaSection = dualBtns(moduleBtn("Explore Plan Pro", PLAN_PRO_MODULE_URL), moduleBtn("Explore AI Production Intelligence", AI_OPS_MODULE_URL));
    } else if (highEfficiency){
      middleSection =
        banner('Your factory is operating at high efficiency and everything is on track! Deploy AI Production Intelligence to take operations to the next level.') +
        '<div class="my-5 rounded-2xl bg-white border border-[#00a884]/40 p-6 text-center shadow-[0_4px_20px_rgba(0,168,132,0.12)]">' +
          '<span class="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 chip-emerald">' +
            '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00a884" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+ICON_AIOPS+'</svg>' +
          '</span>' +
          '<h3 class="text-lg font-black tracking-tight text-gray-900">AI-Based Operations Management</h3>' +
          '<p class="text-[12px] leading-relaxed text-gray-500 mt-1.5 max-w-[38ch] mx-auto">Real-time floor intelligence, predictive scheduling, and automated bottleneck detection \u2014 built to push a high-performing plant even further.</p>' +
        '</div>';
      ctaSection = singleBtn(moduleBtn("Explore AI Operations Management", AI_OPS_MODULE_URL));
    } else {
      middleSection =
        '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">' +
          '<div class="bg-white border border-emerald-400/50 rounded-2xl p-5 flex flex-col shadow-[0_4px_20px_rgba(0,168,132,0.12)]">' +
            '<h4 class="text-[11px] font-bold tracking-wider uppercase text-gray-500">Efficiency &amp; Time Savings</h4>' +
            '<h3 class="text-2xl font-black tracking-tight leading-tight text-gray-900 mt-3">RECOVER '+r.otHours+' HRS/WK</h3>' +
            '<div class="pt-4 mt-4 grid grid-cols-2 gap-2 text-[11px] leading-snug text-gray-500 card-divider">' +
              '<div>Reduce changeover and rework time by up to 60%</div>' +
              '<div>Potential for +'+r.effGain+' efficiency pts gain</div>' +
            '</div>' +
          '</div>' +
          '<div class="bg-white border border-emerald-400/50 rounded-2xl p-5 flex flex-col shadow-[0_4px_20px_rgba(0,168,132,0.12)]">' +
            '<h4 class="text-[11px] font-bold tracking-wider uppercase text-gray-500">Machine &amp; Production Volume</h4>' +
            '<h3 class="text-2xl font-black tracking-tight leading-tight text-gray-900 mt-3">'+volumeFormatted+' PCS/MONTH</h3>' +
            '<div class="pt-4 mt-4 text-[11px] leading-snug space-y-1 text-gray-500 card-divider">' +
              '<div>Optimal performance for '+r.totalMachines+' active machines is achievable</div>' +
              '<div>Improve capacity utilization without increasing machine count</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      ctaSection =
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">' +
          '<button id="results-primary-cta" class="w-full py-3.5 px-4 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md btn-pine" onmouseover="this.style.backgroundColor=\'#004d40\'" onmouseout="this.style.backgroundColor=\'#00796b\'">' +
            'Book a 20-min Demo' +
            '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
          '</button>' +
          '<button id="results-secondary-cta" class="w-full py-3.5 px-4 bg-white hover:bg-gray-50 text-xs font-semibold rounded-xl transition flex items-center justify-center" style="border:1px solid #cbd5e1; color:#475569;">' +
            'Restart diagnostic' +
          '</button>' +
        '</div>';
    }

    resultsState.innerHTML =
      '<div class="flex items-center justify-between mb-2">' +
        '<div class="flex items-center gap-2">' +
          '<div class="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm btn-pine">W</div>' +
          '<span class="font-bold text-gray-900 text-lg">WiMetrix</span>' +
          '<span class="text-gray-400 text-sm font-medium">Diagnostic Complete</span>' +
        '</div>' +
        '<span class="text-xs text-gray-400 font-medium">Report 1 of 1</span>' +
      '</div>' +

      '<div class="relative flex flex-col items-center justify-center my-4">' +
        '<div class="relative w-72 h-36 flex items-end justify-center">' +
          '<svg aria-hidden="true" class="w-full h-full overflow-visible" viewBox="0 0 200 110">' +
            '<defs>' +
              '<pattern id="fabricWeave" width="8" height="8" patternUnits="userSpaceOnUse">' +
                '<rect width="8" height="8" fill="'+r.arcColor+'"/>' +
                '<path d="M0 2h8M0 6h8" stroke="rgba(0,0,0,0.18)" stroke-width="1.5"/>' +
                '<path d="M2 0v8M6 0v8" stroke="rgba(255,255,255,0.35)" stroke-width="1.5" stroke-dasharray="2,2"/>' +
              '</pattern>' +
              '<pattern id="fabricWeaveGray" width="8" height="8" patternUnits="userSpaceOnUse">' +
                '<rect width="8" height="8" fill="#e2e8f0"/>' +
                '<path d="M0 2h8M0 6h8" stroke="#cbd5e1" stroke-width="1.5"/>' +
                '<path d="M2 0v8M6 0v8" stroke="#b8c2cf" stroke-width="1.5" stroke-dasharray="2,2"/>' +
              '</pattern>' +
            '</defs>' +
            '<path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#fabricWeaveGray)" stroke-width="20" stroke-linecap="round"/>' +
            '<path id="gauge-arc-fill" d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#fabricWeave)" stroke-width="20" stroke-linecap="round" ' +
              'stroke-dasharray="'+(Math.PI*80).toFixed(1)+'" stroke-dashoffset="'+(Math.PI*80).toFixed(1)+'" style="transition:stroke-dashoffset 900ms ease-out;"/>' +
          '</svg>' +
          '<div class="absolute bottom-0 text-center" style="transform:translateY(0.5rem);">' +
            '<span class="text-4xl font-extrabold text-gray-900 tracking-tight">'+r.score+'</span>' +
            '<span class="text-lg font-bold text-gray-400">/100</span>' +
          '</div>' +
        '</div>' +
        '<p class="mt-3 text-xs font-bold tracking-wide uppercase" style="color:'+r.arcColor+';">' +
          r.tierLabel+' <span class="text-gray-400 font-normal lowercase">\u2014 '+r.tierSub+'</span>' +
        '</p>' +
        '<span class="mt-2 inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full border border-slate-200">' +
          '<svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.4H22l-6 4.5 2.3 7.1-6.3-4.6L5.7 21l2.3-7.1-6-4.5h7.6z"/></svg>' +
          r.maturity +
        '</span>' +
      '</div>' +

      middleSection +
      ctaSection;

    var primaryCta = document.getElementById("results-primary-cta");
    if (primaryCta && primaryCta.tagName === "BUTTON") primaryCta.addEventListener("click", restartDiagnostic);
    document.getElementById("results-secondary-cta").addEventListener("click", restartDiagnostic);

    var arc = document.getElementById("gauge-arc-fill");
    if (arc){
      var targetOffset = (Math.PI * 80) * (1 - r.score / 100);
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){ arc.style.strokeDashoffset = targetOffset.toFixed(1); });
      });
    }
  }

  function restartDiagnostic(){
    answers = { q1:"", q2:"", q3:"", currentProfitPercentage:"" };

    wizardSteps.querySelectorAll('[data-role="cat-card"]').forEach(function(c){
      setCardSelected(c, false);
      var check = c.querySelector(".cat-check");
      if (check) check.classList.add("hidden");
      c.querySelectorAll(".cat-frame").forEach(function(frame){
        frame.classList.remove("border-2", "border-emerald-500", "bg-emerald-50/20");
        frame.classList.add("border", "border-slate-200/80", "bg-slate-50");
      });
    });

    wizardSteps.querySelectorAll('[data-role="combo-input"]').forEach(function(inp){ inp.value = ""; });
    wizardSteps.querySelectorAll('[data-role="number-input"]').forEach(function(inp){ inp.value = ""; });
    wizardSteps.querySelectorAll('[data-role="dd-panel"]').forEach(function(panel){ panel.classList.add("hidden"); });
    wizardSteps.querySelectorAll('[data-role="dd-trigger"]').forEach(function(t){ t.setAttribute("aria-expanded", "false"); t.style.boxShadow = ""; });
    wizardSteps.querySelectorAll('[data-role="dd-chevron"]').forEach(function(c){ c.classList.remove("rotate-180"); });
    wizardSteps.querySelectorAll('[data-role="dd-label"]').forEach(function(l){
      var qDef = QUESTIONS[3];
      l.textContent = qDef.placeholder;
      l.classList.add("text-gray-400");
      l.classList.remove("text-slate-900");
    });
    wizardSteps.querySelectorAll('[data-role="dd-item"]').forEach(function(o){
      o.classList.remove("bg-[#e6f7f3]", "text-[#00a884]", "font-bold");
      var check = o.querySelector(".dd-check");
      if (check) check.classList.add("hidden");
    });
    wizardSteps.querySelectorAll('[data-role="combo-panel"]').forEach(function(panel){ panel.classList.add("hidden"); });
    wizardSteps.querySelectorAll('[data-role="combo-toggle"]').forEach(function(btn){ btn.setAttribute("aria-expanded", "false"); });
    wizardSteps.querySelectorAll('[data-role="combo-chevron"]').forEach(function(c){ c.classList.remove("rotate-180"); });
    wizardSteps.querySelectorAll('[data-role="combo-option"]').forEach(function(o){
      o.classList.remove("bg-emerald-50", "text-emerald-700", "font-bold", "border-l-4", "border-emerald-500");
      var check = o.querySelector(".opt-check");
      if (check) check.classList.add("hidden");
    });

    var q3Note = document.getElementById("q3-benchmark-note");
    if (q3Note){ q3Note.classList.add("hidden"); q3Note.innerHTML = ""; }

    ["q3-less-value", "q3-exact-value", "q3-greater-value"].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.textContent = "--";
    });
    q3ComparisonChoice = "exact";
    ["q3-less-btn", "q3-exact-btn", "q3-greater-btn"].forEach(function(id){
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.classList.remove("border-emerald-500", "bg-emerald-50/50");
      btn.classList.add("border-gray-200");
    });

    goToStep(1);
    resultsState.classList.add("hidden");
    formState.classList.remove("hidden");
  }

})();
