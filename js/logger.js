// Failas: js/logger.js (Galutinė versija su visomis kategorijomis)
(function() {
    'use strict';
    
    // === ATNAUJINTAS KATEGORIJŲ OBJEKTAS ===
    const CATEGORIES = {
        go: {
            income: { 
                "GGT Earnings": "GGT Uždarbis",
                "Gem Sale": "Brangakmenių pardavimas",
                "Other": "Kita" 
            },
            expense: { 
                "Level-up": "Lygio kėlimas", 
                "Minting": "Mintinimas", 
                "Mystery Box opening": "Dėžutės atidarymas",
                "Other": "Kita" 
            }
        },
        og: {
            income: { 
                "GST Earnings": "GST Uždarbis", 
                "Sneaker Sale": "Sportbačio pardavimas",
                "Gem Sale": "Brangakmenių pardavimas",
                "Other": "Kita" 
            },
            expense: { 
                "Level-up": "Lygio kėlimas", 
                "Minting": "Mintinimas", 
                "Mystery Box opening": "Dėžutės atidarymas",
                "Other": "Kita" 
            }
        }
    };

    const loggerElements = {};

    window.appActions = window.appActions || {};
    window.appActions.initLogger = initLogger;
    window.appActions.loadAndRenderLogTable = loadAndRenderLogTable;
    window.appActions.renderLogTable = renderLogTable;

    function initLogger() {
        cacheLoggerElements();
        bindLoggerEventListeners();
        updateDynamicForm();
        loadAndRenderLogTable();
        resetLogForm();
    }

    function cacheLoggerElements() {
        const ids = [ 'logForm', 'platform', 'logDate', 'logType', 'logCategory', 'logDescription', 'logSubmitBtn', 'standardFields', 'goLevelUpFields', 'ogLevelUpFields', 'ogMintFields', 'editFields', 'logTokenRadioGroup', 'logTokenAmount', 'goLevelUpGgt', 'goLevelUpGmt', 'ogLevelUpGst', 'ogLevelUpGmt', 'ogMintGst', 'ogMintGmt', 'ogMintScrolls', 'editRateUsd', 'editAmountUsd', 'logTableBody', 'summaryContainer', 'filterStartDate', 'filterEndDate', 'filterToken', 'filterSort', 'filterOrder', 'filterBtn' ];
        ids.forEach(id => { if(document.getElementById(id)) loggerElements[id] = document.getElementById(id); });
    }

    function bindLoggerEventListeners() {
        if (loggerElements.logForm) loggerElements.logForm.addEventListener('submit', handleLogSubmit);
        if (loggerElements.logTableBody) loggerElements.logTableBody.addEventListener('click', handleLogTableClick);
        if (loggerElements.filterBtn) loggerElements.filterBtn.addEventListener('click', loadAndRenderLogTable);
        if (loggerElements.platform) loggerElements.platform.addEventListener('change', updateDynamicForm);
        if (loggerElements.logType) loggerElements.logType.addEventListener('change', updateDynamicForm);
        if (loggerElements.logCategory) loggerElements.logCategory.addEventListener('change', updateDynamicForm);
        if (loggerElements.editRateUsd) loggerElements.editRateUsd.addEventListener('input', () => syncEditInputs('rate'));
        if (loggerElements.editAmountUsd) loggerElements.editAmountUsd.addEventListener('input', () => syncEditInputs('amount'));
    }

    async function handleLogSubmit(event) {
        event.preventDefault();
        const editingId = loggerElements.logForm.dataset.editingId;
        loggerElements.logSubmitBtn.disabled = true;
        loggerElements.logSubmitBtn.textContent = 'Apdorojama...';
        try {
            if (editingId) await handleUpdate(editingId);
            else await handleCreate();
            await loadAndRenderLogTable();
        } catch (error) {
            console.error("Submit error:", error);
            alert(`Įvyko klaida: ${error.message}`);
        } finally {
            resetLogForm();
        }
    }

    async function handleCreate() {
        const platform = loggerElements.platform.value;
        const category = loggerElements.logCategory.value;
        const date = loggerElements.logDate.value;
        const type = loggerElements.logType.value;
        let description = loggerElements.logDescription.value.trim();
        if (!platform || !type || !category) throw new Error("Prašome pasirinkti platformą, tipą ir kategoriją.");
        const commonData = { date, type, category, description, platform };
        let operations = [];
        if (platform === 'go' && category === 'Level-up') {
            const ggt = parseFloat(loggerElements.goLevelUpGgt.value) || 0;
            const gmt = parseFloat(loggerElements.goLevelUpGmt.value) || 0;
            if (ggt > 0) operations.push({ ...commonData, tokenKey: 'ggt', tokenAmount: ggt });
            if (gmt > 0) operations.push({ ...commonData, tokenKey: 'gmt', tokenAmount: gmt });
        } else if (platform === 'og' && category === 'Level-up') {
            const gst = parseFloat(loggerElements.ogLevelUpGst.value) || 0;
            const gmt = parseFloat(loggerElements.ogLevelUpGmt.value) || 0;
            if (gst > 0) operations.push({ ...commonData, tokenKey: 'gst', tokenAmount: gst });
            if (gmt > 0) operations.push({ ...commonData, tokenKey: 'gmt', tokenAmount: gmt });
        } else if (platform === 'og' && category === 'Minting') {
            const gst = parseFloat(loggerElements.ogMintGst.value) || 0;
            const gmt = parseFloat(loggerElements.ogMintGmt.value) || 0;
            const scrolls = parseInt(loggerElements.ogMintScrolls.value) || 0;
            let mintDesc = description;
            if (scrolls > 0) mintDesc += ` (Panaudota ${scrolls} Minting Scrolls)`;
            if (gst > 0) operations.push({ ...commonData, description: mintDesc, tokenKey: 'gst', tokenAmount: gst });
            if (gmt > 0) operations.push({ ...commonData, description: mintDesc, tokenKey: 'gmt', tokenAmount: gmt });
        } else {
            const selectedTokenRadio = document.querySelector('input[name="logToken"]:checked');
            if (!selectedTokenRadio) throw new Error("Prašome pasirinkti žetoną.");
            const tokenAmount = parseFloat(loggerElements.logTokenAmount.value);
            if (isNaN(tokenAmount) || tokenAmount <= 0) throw new Error("Prašome įvesti teigiamą sumą.");
            operations.push({ ...commonData, tokenKey: selectedTokenRadio.value, tokenAmount });
        }
        if (operations.length === 0) throw new Error("Neįvesta jokia suma.");
        for (const op of operations) {
            await createSingleLogEntry(op);
        }
    }

    async function createSingleLogEntry(entryData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Vartotojas neprisijungęs.");
        loggerElements.logSubmitBtn.textContent = `Išsaugoma ${entryData.tokenKey.toUpperCase()}...`;
        const rate_usd = await window.appActions.getPriceForDate(entryData.tokenKey, entryData.date);
        const record = { ...entryData, token: entryData.tokenKey, token_amount: entryData.tokenAmount, rate_usd, user_id: user.id };
        delete record.tokenKey; delete record.tokenAmount;
        const { error } = await supabase.from('transactions').insert(record);
        if (error) throw error;
    }

    async function handleUpdate(id) {
        const record = {
            date: loggerElements.logDate.value,
            type: loggerElements.logType.value,
            token: document.querySelector('input[name="logToken"]:checked').value,
            token_amount: parseFloat(loggerElements.logTokenAmount.value),
            category: loggerElements.logCategory.value,
            description: loggerElements.logDescription.value.trim(),
            platform: loggerElements.platform.value,
            rate_usd: parseFloat(loggerElements.editRateUsd.value)
        };
        const oldEntry = JSON.parse(loggerElements.logForm.dataset.oldEntry);
        if (record.date !== oldEntry.date || record.token !== oldEntry.token) {
            loggerElements.logSubmitBtn.textContent = 'Gaunamas kursas...';
            record.rate_usd = await window.appActions.getPriceForDate(record.token, record.date);
        }
        const { error } = await supabase.from('transactions').update(record).eq('id', id);
        if (error) throw error;
    }

    async function handleLogTableClick(event) {
        const target = event.target.closest('button');
        if (!target) return;
        const row = target.closest('tr');
        if (!row || !row.dataset.id) return;
        const entryId = parseInt(row.dataset.id);
        if (target.matches('.btn-delete')) {
            if (confirm('Ar tikrai norite ištrinti šį įrašą?')) {
                const { error } = await supabase.from('transactions').delete().eq('id', entryId);
                if (error) alert(`Klaida trinant: ${error.message}`);
                else await loadAndRenderLogTable();
            }
        } else if (target.matches('.btn-edit')) {
            const { data, error } = await supabase.from('transactions').select().eq('id', entryId).single();
            if (error) { alert(`Klaida gaunant įrašą: ${error.message}`); return; }
            startEditEntry(data);
        }
    }

    function startEditEntry(entry) {
        resetLogForm();
        loggerElements.logForm.dataset.editingId = entry.id;
        loggerElements.logForm.dataset.oldEntry = JSON.stringify(entry);
        loggerElements.platform.value = entry.platform || 'go';
        loggerElements.logDate.value = entry.date;
        loggerElements.logType.value = entry.type;
        updateDynamicForm();
        loggerElements.logCategory.value = entry.category;
        updateVisibleFields();
        const tokensForPlatform = entry.platform === 'go' ? ['ggt', 'gmt', 'usdc'] : ['gst', 'gmt', 'sol', 'usdc'];
        updateTokenRadioButtons(tokensForPlatform);
        const radioToSelect = document.querySelector(`input[name="logToken"][value="${entry.token}"]`);
        if (radioToSelect) radioToSelect.checked = true;
        loggerElements.logTokenAmount.value = entry.token_amount;
        loggerElements.logDescription.value = entry.description;
        loggerElements.editRateUsd.value = (entry.rate_usd || 0).toFixed(8);
        loggerElements.editAmountUsd.value = ((entry.rate_usd || 0) * (entry.token_amount || 0)).toFixed(2);
        loggerElements.logSubmitBtn.textContent = 'Atnaujinti įrašą';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetLogForm() {
        if (loggerElements.logForm) {
            loggerElements.logForm.reset();
            delete loggerElements.logForm.dataset.editingId;
            delete loggerElements.logForm.dataset.oldEntry;
            loggerElements.platform.value = "";
            loggerElements.logType.value = "";
            updateDynamicForm();
            const today = new Date();
            today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
            loggerElements.logDate.value = today.toISOString().split('T')[0];
            loggerElements.logSubmitBtn.textContent = 'Pridėti įrašą';
            loggerElements.logSubmitBtn.disabled = false;
        }
    }

    function updateDynamicForm() {
        updateCategoryDropdown();
        updateVisibleFields();
    }

    function updateCategoryDropdown() {
        if (!loggerElements.platform || !loggerElements.logType || !loggerElements.logCategory) return;
        const platform = loggerElements.platform.value;
        const type = loggerElements.logType.value;
        const platformCategories = CATEGORIES[platform]?.[type] || {};
        const currentCategory = loggerElements.logCategory.value;
        let optionsHTML = `<option value="" disabled selected>Pasirinkite kategoriją...</option>`;
        optionsHTML += Object.entries(platformCategories).map(([key, value]) => `<option value="${key}">${value}</option>`).join('');
        loggerElements.logCategory.innerHTML = optionsHTML;
        if (platformCategories[currentCategory]) loggerElements.logCategory.value = currentCategory;
        else loggerElements.logCategory.value = "";
    }

    function updateVisibleFields() {
        if (!loggerElements.platform || !loggerElements.logCategory) return;
        const platform = loggerElements.platform.value;
        const category = loggerElements.logCategory.value;
        ['standardFields', 'goLevelUpFields', 'ogLevelUpFields', 'ogMintFields', 'editFields'].forEach(id => { if (loggerElements[id]) loggerElements[id].classList.add('hidden'); });
        const isEditing = !!loggerElements.logForm.dataset.editingId;
        if (isEditing) {
            loggerElements.standardFields.classList.remove('hidden');
            loggerElements.editFields.classList.remove('hidden');
            return;
        }
        if (platform === 'go' && category === 'Level-up') loggerElements.goLevelUpFields.classList.remove('hidden');
        else if (platform === 'go' && category === 'Minting') {
            loggerElements.standardFields.classList.remove('hidden');
            updateTokenRadioButtons(['ggt']);
        } else if (platform === 'og' && category === 'Level-up') loggerElements.ogLevelUpFields.classList.remove('hidden');
        else if (platform === 'og' && category === 'Minting') loggerElements.ogMintFields.classList.remove('hidden');
        else if (category) {
            loggerElements.standardFields.classList.remove('hidden');
            updateTokenRadioButtons(platform === 'go' ? ['ggt', 'gmt', 'usdc'] : ['gst', 'gmt', 'sol', 'usdc']);
        }
    }

    function updateTokenRadioButtons(tokensToShow) {
        if (!loggerElements.logTokenRadioGroup) return;
        const tokens = window.appData.tokens;
        loggerElements.logTokenRadioGroup.innerHTML = tokensToShow.map((key, index) => {
            const token = tokens[key];
            return `<label class="radio-label"><span><img src="${token.logo}" alt="${token.symbol}" class="token-logo">${token.symbol}</span><input type="radio" name="logToken" value="${key}" ${index === 0 ? 'checked' : ''}><span class="radio-custom-dot"></span></label>`;
        }).join('');
    }

    function syncEditInputs(source) {
        const rate = parseFloat(loggerElements.editRateUsd.value);
        const total = parseFloat(loggerElements.editAmountUsd.value);
        const amount = parseFloat(loggerElements.logTokenAmount.value);
        if (source === 'rate' && !isNaN(rate) && !isNaN(amount)) loggerElements.editAmountUsd.value = (amount * rate).toFixed(2);
        else if (source === 'amount' && !isNaN(total) && !isNaN(amount) && amount > 0) loggerElements.editRateUsd.value = (total / amount).toFixed(8);
    }
    
    async function loadAndRenderLogTable() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            renderLogTable([]);
            populateFilterDropdowns([]);
            return;
        }
        let query = supabase.from('transactions').select('*').eq('user_id', user.id);
        if (loggerElements.filterStartDate.value) query = query.gte('date', loggerElements.filterStartDate.value);
        if (loggerElements.filterEndDate.value) query = query.lte('date', loggerElements.filterEndDate.value);
        if (loggerElements.filterToken.value) query = query.eq('token', loggerElements.filterToken.value);
        query = query.order(loggerElements.filterSort.value, { ascending: loggerElements.filterOrder.value === 'asc' }).order('id', { ascending: false });
        const { data, error } = await query;
        if (error) { console.error('Klaida gaunant duomenis:', error); return; }
        renderLogTable(data);
        populateFilterDropdowns(data);
    }
    
    function populateFilterDropdowns(data) {
        if (!loggerElements.filterToken) return;
        const uniqueTokens = [...new Set(data.map(item => item.token))];
        let optionsHTML = '<option value="">Visi</option>';
        uniqueTokens.sort().forEach(token => { optionsHTML += `<option value="${token}">${window.appData.tokens[token]?.symbol || token.toUpperCase()}</option>`; });
        const currentValue = loggerElements.filterToken.value;
        loggerElements.filterToken.innerHTML = optionsHTML;
        loggerElements.filterToken.value = currentValue;
    }

    function renderLogTable(data) {
        if (!loggerElements.logTableBody) return;
        loggerElements.logTableBody.innerHTML = '';
        if(!data || data.length === 0) {
            loggerElements.logTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4">Įrašų nerasta.</td></tr>`;
            renderSummary(0, 0, {});
            return;
        }
        let totalIncomeUSD = 0, totalExpenseUSD = 0; const tokenBalances = {};
        data.forEach(entry => {
            const amount_usd = (entry.token_amount || 0) * (entry.rate_usd || 0);
            const isIncome = entry.type === 'income';
            if (isIncome) totalIncomeUSD += amount_usd; else totalExpenseUSD += amount_usd;
            if (!tokenBalances[entry.token]) tokenBalances[entry.token] = 0;
            tokenBalances[entry.token] += isIncome ? entry.token_amount : -entry.token_amount;
            const row = document.createElement('tr'); row.dataset.id = entry.id;
            row.innerHTML = `<td>${entry.date}</td><td style="font-size: 1.25rem; text-align: center;" class="${isIncome ? 'income-color' : 'expense-color'}">${isIncome ? '▼' : '▲'}</td><td>${window.appData.tokens[entry.token]?.symbol || entry.token.toUpperCase()}</td><td>${(entry.token_amount || 0).toLocaleString('en-US', {maximumFractionDigits: 2})}</td><td>$${(entry.rate_usd || 0).toFixed(5)}</td><td>$${amount_usd.toFixed(2)}</td><td>${entry.description || ''}</td><td class="log-table-actions"><button class="btn-edit">Taisyti</button><button class="btn-delete">Trinti</button></td>`;
            loggerElements.logTableBody.appendChild(row);
        });
        renderSummary(totalIncomeUSD, totalExpenseUSD, tokenBalances);
    }
    
    function renderSummary(income, expense, tokenBalances) {
        if (!loggerElements.summaryContainer) return;
        const balance = income - expense;
        const btcPrice = window.appData.prices['bitcoin']?.price;
        let btcValueHTML = '';
        if (btcPrice > 0) { btcValueHTML = `<div class="summary-row"><span class="summary-label btc-value"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left-right" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/></svg> BTC Atitikmuo:</span><span class="summary-value btc-value">${(balance / btcPrice).toFixed(8)} BTC</span></div>`; }
        let tokenBalancesHTML = '<hr class="my-4 border-gray-700"><h3 class="text-lg font-semibold mb-2">Žetonų Balansai</h3>';
        Object.keys(tokenBalances).sort().forEach(token => { const amount = tokenBalances[token]; tokenBalancesHTML += `<div class="summary-row"><span class="summary-label">${window.appData.tokens[token]?.symbol || token.toUpperCase()} Balansas:</span><span class="summary-value ${amount >= 0 ? 'income-color' : 'expense-color'}">${amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 4})}</span></div>`; });
        loggerElements.summaryContainer.innerHTML = `<h3 class="text-lg font-semibold mb-2">Bendra suvestinė (pagal filtrus)</h3><div class="summary-row"><span class="summary-label">Viso Pajamų (USD):</span><span class="summary-value income-color">$${income.toFixed(2)}</span></div><div class="summary-row"><span class="summary-label">Viso Išlaidų (USD):</span><span class="summary-value expense-color">$${expense.toFixed(2)}</span></div><div class="summary-row text-lg border-t border-gray-700 mt-2 pt-2"><strong class="summary-label">Grynasis Balansas (USD):</strong><strong class="summary-value ${balance >= 0 ? 'income-color' : 'expense-color'}">$${balance.toFixed(2)}</strong></div>${btcValueHTML}${tokenBalancesHTML}`;
    }

})();
