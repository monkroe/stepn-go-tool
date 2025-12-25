// Failas: js/logger.js (Versija V1.2.0 - RLS: Privatus režimas)

(function() {
    'use strict';

    // === 1. INTEGRUOTI SUPABASE NUSTATYMAI ===
    const SB_URL = 'https://zojhurhwmceoqxkatvkx.supabase.co';
    const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpvamh1cmh3bWNlb3F4a2F0dmt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNjYxNDYsImV4cCI6MjA2NDc0MjE0Nn0.NFGhQc7H95U9vOaM7OVxNUgTuXSughz8ZuxaCLfbfQE';

    // === 2. SAUGI PRISIJUNGIMO FUNKCIJA ===
    function getSupabase() {
        if (window.supabase && window.supabase.auth) return window.supabase;
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            const client = supabase.createClient(SB_URL, SB_KEY);
            window.supabase = client;
            return client;
        }
        return null;
    }

    // === 3. KATEGORIJOS IR KINTAMIEJI ===
    const CATEGORIES = {
        go: {
            income: { "GGT Earnings": "GGT uždarbis", "Sneaker Rental": "Sportbačių nuoma", "Sneaker Sale": "Sportbačių pardavimas", "Shoe Box Sale": "Batų dėžės (Shoe Box) pardavimas", "Gem Sale": "Brangakmenių pardavimas", "Raw Stone Sale": "Neapdirbtų brangakmenių (Raw Stone) pardavimas", "Other": "Kita" },
            expense: { 
                "Level-up": "Lygio kėlimas", 
                "Minting": "Mintinimas", 
                "Socket Unlock": "Socket atidarymas", 
                "Gem Removal": "Brangakmenio išėmimas", 
                "Mystery Box Speed-up": "Dėžutės atidarymo pagreitinimas", 
                "Raw Stone Upgrade": "Neapdirbtų brangakmenių (Raw Stone) lygio kėlimas", 
                "Sneaker Purchase": "Sportbačių pirkimas", 
                "Shoe Box Purchase": "Batų dėžės (Shoe Box) pirkimas", 
                "Gem Purchase": "Brangakmenių pirkimas", 
                "Mystery Box Slot Purchase": "Papildomų 'Mystery Box' vietų pirkimas", 
                "Other": "Kita" 
            }
        },
        og: {
            income: { "GST Earnings": "GST uždarbis", "Sneaker Sale": "Sportbačio pardavimas", "Shoe Box Sale": "Batų dėžės (Shoe Box) pardavimas", "Gem Sale": "Brangakmenių pardavimas", "Scroll Sale": "'Minting Scroll' pardavimas", "Other": "Kita" },
            expense: { "Repair": "Taisymas (HP)", "Level-up": "Lygio kėlimas", "Mystery Box opening": "Dėžutės atidarymas", "Restore": "Atributų atkūrimas", "Minting": "Mintinimas", "Sneaker Purchase": "Sportbačių pirkimas", "Shoe Box Purchase": "Batų dėžės (Shoe Box) pirkimas", "Scroll Purchase": "'Minting Scroll' pirkimas", "Other": "Kita" }
        }
    };

    const loggerElements = {};
    let currentLogData = []; 

    window.appActions = window.appActions || {};
    window.appActions.initLogger = initLogger;
    window.appActions.loadAndRenderLogTable = loadAndRenderLogTable;
    window.appActions.renderLogTable = renderLogTable;

    // === 4. INICIALIZACIJA ===
    function initLogger() {
        cacheLoggerElements();
        populateCategoryFilter();
        resetLogForm();
        bindLoggerEventListeners();
        // Palaukiame šiek tiek, kad Supabase spėtų inicijuotis
        setTimeout(() => { loadAndRenderLogTable(); }, 500);
    }

    function cacheLoggerElements() {
        const ids = [ 
            'logForm', 'platform', 'logDate', 'logType', 'logCategory', 'logDescription', 'logSubmitBtn', 
            'standardFields', 'goLevelUpFields', 'ogLevelUpFields', 'ogMintFields', 'ogRestoreFields', 'editFields', 
            'logTokenRadioGroup', 'logTokenAmount', 
            'goLevelUpGgt', 'goLevelUpGmt', 
            'ogLevelUpGst', 'ogLevelUpGmt', 
            'ogMintGst', 'ogMintGmt', 'ogMintScrollsCost',
            'ogRestoreGst', 'ogRestoreGmt', 'ogRestoreGemsGmt',
            'editRateUsd', 'editAmountUsd', 
            'logTableBody', 'summaryContainer', 
            'filterStartDate', 'filterEndDate', 'filterToken', 'filterSort', 'filterOrder', 'filterBtn', 'exportCsvBtn',
            'filterCategory'
        ];
        ids.forEach(id => { 
            const element = document.getElementById(id);
            if (element) loggerElements[id] = element;
        });
    }

    function bindLoggerEventListeners() {
        if (loggerElements.logForm) loggerElements.logForm.addEventListener('submit', handleLogSubmit);
        if (loggerElements.logTableBody) loggerElements.logTableBody.addEventListener('click', handleLogTableClick);
        if (loggerElements.filterBtn) loggerElements.filterBtn.addEventListener('click', loadAndRenderLogTable);
        if (loggerElements.exportCsvBtn) loggerElements.exportCsvBtn.addEventListener('click', handleExportToCsv);
        
        if (loggerElements.platform) {
            loggerElements.platform.addEventListener('change', () => {
                updateDynamicForm();
                updateCategoryFilter();
            });
        }
        if (loggerElements.logType) loggerElements.logType.addEventListener('change', updateDynamicForm);
        if (loggerElements.logCategory) loggerElements.logCategory.addEventListener('change', updateDynamicForm);
        if (loggerElements.editRateUsd) loggerElements.editRateUsd.addEventListener('input', () => syncEditInputs('rate'));
        if (loggerElements.editAmountUsd) loggerElements.editAmountUsd.addEventListener('input', () => syncEditInputs('amount'));
    }

    // === 5. UI PILDYMAS ===
    function populateCategoryFilter() {
        if (!loggerElements.filterCategory) return;
        const allCategories = new Set();
        const reverseCategoryMap = {};
        
        const currentPlat = loggerElements.platform && loggerElements.platform.value ? loggerElements.platform.value : 'go';
        const platformsToProcess = loggerElements.platform && loggerElements.platform.value ? [currentPlat] : ['go', 'og'];

        platformsToProcess.forEach(plat => {
            if (!CATEGORIES[plat]) return;
            ['income', 'expense'].forEach(type => {
                Object.entries(CATEGORIES[plat][type]).forEach(([key, value]) => {
                    allCategories.add(value);
                    reverseCategoryMap[value] = key;
                });
            });
        });

        const sortedCategories = [...allCategories].sort();
        let optionsHTML = `<option value="">Visos</option>`;
        sortedCategories.forEach(cat => {
            const key = reverseCategoryMap[cat] || cat;
            optionsHTML += `<option value="${key}">${cat}</option>`;
        });
        
        loggerElements.filterCategory.innerHTML = optionsHTML;
        loggerElements.filterCategory.disabled = false;
    }
    
    function updateCategoryFilter() { populateCategoryFilter(); }

    function updateDynamicForm() {
        updateCategoryDropdown();
        updateVisibleFields();
    }

    function updateCategoryDropdown() {
        if (!loggerElements.platform || !loggerElements.logType || !loggerElements.logCategory) return;
        const platform = loggerElements.platform.value;
        const type = loggerElements.logType.value;
        
        if (!platform || !type) {
            loggerElements.logCategory.innerHTML = `<option value="" disabled selected>Pasirinkite kategoriją...</option>`;
            return;
        }

        const platformCategories = CATEGORIES[platform]?.[type] || {};
        let optionsHTML = `<option value="" disabled selected>Pasirinkite kategoriją...</option>`;
        Object.entries(platformCategories).forEach(([key, value]) => { optionsHTML += `<option value="${key}">${value}</option>`; });
        
        const currentVal = loggerElements.logCategory.value;
        loggerElements.logCategory.innerHTML = optionsHTML;
        if (platformCategories[currentVal]) loggerElements.logCategory.value = currentVal;
        loggerElements.logCategory.disabled = false;
    }

    function updateVisibleFields() {
        if (!loggerElements.platform || !loggerElements.logCategory) return;
        const platform = loggerElements.platform.value;
        const category = loggerElements.logCategory.value;
        
        ['standardFields', 'goLevelUpFields', 'ogLevelUpFields', 'ogMintFields', 'ogRestoreFields', 'editFields'].forEach(id => { 
            if(loggerElements[id]) loggerElements[id].classList.add('hidden'); 
        });

        if (loggerElements.logForm.dataset.editingId) {
            loggerElements.standardFields.classList.remove('hidden');
            loggerElements.editFields.classList.remove('hidden');
            return;
        }

        if (platform === 'go' && (category === 'Gem Removal' || category === 'Socket Unlock')) {
            loggerElements.standardFields.classList.remove('hidden');
            updateTokenRadioButtons(['ggt']);
        } else if (platform === 'go' && category === 'Level-up') loggerElements.goLevelUpFields.classList.remove('hidden');
        else if (platform === 'og' && category === 'Level-up') loggerElements.ogLevelUpFields.classList.remove('hidden');
        else if (platform === 'og' && category === 'Minting') loggerElements.ogMintFields.classList.remove('hidden');
        else if (platform === 'og' && category === 'Repair') {
            loggerElements.standardFields.classList.remove('hidden');
            updateTokenRadioButtons(['gst']);
        } else if (platform === 'og' && category === 'Restore') loggerElements.ogRestoreFields.classList.remove('hidden');
        else if (category) {
            loggerElements.standardFields.classList.remove('hidden');
            updateTokenRadioButtons(platform === 'go' ? ['ggt', 'gmt', 'usdc'] : ['gst', 'gmt', 'sol', 'usdc']);
        }
    }

    function updateTokenRadioButtons(tokensToShow) {
        if (!loggerElements.logTokenRadioGroup) return;
        const tokens = window.appData?.tokens || {};
        loggerElements.logTokenRadioGroup.innerHTML = tokensToShow.map((key, index) => {
            const token = tokens[key];
            if(!token) return '';
            return `<label class="radio-label"><span><img src="${token.logo}" alt="${token.symbol}" class="token-logo">${token.symbol}</span><input type="radio" name="logToken" value="${key}" ${index === 0 ? 'checked' : ''}><span class="radio-custom-dot"></span></label>`;
        }).join('');
    }

    function syncEditInputs(source) {
        const rate = parseFloat(loggerElements.editRateUsd.value);
        const amount = parseFloat(loggerElements.logTokenAmount.value);
        const total = parseFloat(loggerElements.editAmountUsd.value);
        
        if (source === 'rate' && !isNaN(rate) && !isNaN(amount)) {
            loggerElements.editAmountUsd.value = (amount * rate).toFixed(2);
        } else if (source === 'amount' && !isNaN(total) && !isNaN(amount) && amount > 0) {
            loggerElements.editRateUsd.value = (total / amount).toFixed(8);
        }
    }

    // === 6. DUOMENŲ LOGIKA (PATAISYTA PAGAL INSTRUKCIJAS) ===
    
    async function loadAndRenderLogTable() {
        const sb = getSupabase();
        if (!sb || !sb.from) { 
            console.warn("Supabase klientas nerastas."); 
            return; 
        }

        // KRITINIS PATAISYMAS: Tikrinti autentifikaciją
        const { data: { user } } = await sb.auth.getUser();
        
        if (!user) {
            console.log('⚠️ Vartotojas neprisijungęs - rodoma tuščia lentelė');
            currentLogData = [];
            renderLogTable(currentLogData);
            populateFilterDropdowns(currentLogData);
            return;
        }

        console.log('✅ Prisijungęs vartotojas:', user.email, 'ID:', user.id);

        // KRITINIS PATAISYMAS: Pridėti user_id filtrą
        let query = sb.from('transactions').select('*').eq('user_id', user.id);
        
        if (loggerElements.filterStartDate && loggerElements.filterStartDate.value) {
            query = query.gte('date', loggerElements.filterStartDate.value);
        }
        if (loggerElements.filterEndDate && loggerElements.filterEndDate.value) {
            query = query.lte('date', loggerElements.filterEndDate.value);
        }
        if (loggerElements.filterToken && loggerElements.filterToken.value) {
            query = query.eq('token', loggerElements.filterToken.value);
        }
        if (loggerElements.filterCategory && loggerElements.filterCategory.value) {
            query = query.eq('category', loggerElements.filterCategory.value);
        }
        
        query = query.order(loggerElements.filterSort.value, { 
            ascending: loggerElements.filterOrder.value === 'asc' 
        }).order('id', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) { 
            console.error('❌ Klaida gaunant duomenis:', error); 
            alert(`Klaida: ${error.message}`);
            return; 
        }
        
        console.log(`📊 Rasta ${data ? data.length : 0} transakcijų vartotojui ${user.email}`);
        
        currentLogData = data || [];
        renderLogTable(currentLogData);
        populateFilterDropdowns(currentLogData);
    }

    function populateFilterDropdowns(data) {
        if (!loggerElements.filterToken) return;
        const uniqueTokens = [...new Set(data.map(item => item.token))];
        let optionsHTML = '<option value="">Visi</option>';
        const tokens = window.appData?.tokens || {};
        uniqueTokens.sort().forEach(token => { 
            let displayToken = tokens[token]?.symbol || token.toUpperCase();
            if (displayToken === 'GST (SOL)') displayToken = 'GST';
            optionsHTML += `<option value="${token}">${displayToken}</option>`; 
        });
        const currentVal = loggerElements.filterToken.value;
        loggerElements.filterToken.innerHTML = optionsHTML;
        if (uniqueTokens.includes(currentVal)) loggerElements.filterToken.value = currentVal;
    }

    function groupDataByMonthAndDay(transactions) {
        const monthlyData = {};
        transactions.forEach(entry => {
            const date = new Date(entry.date + 'T00:00:00');
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const dayKey = entry.date;
            
            if (!monthlyData[monthKey]) monthlyData[monthKey] = { days: {}, monthlyIncome: 0, monthlyExpense: 0 };
            if (!monthlyData[monthKey].days[dayKey]) monthlyData[monthKey].days[dayKey] = { transactions: [], dailyIncome: 0, dailyExpense: 0 };
            
            const val = (entry.token_amount || 0) * (entry.rate_usd || 0);
            if (entry.type === 'income') { monthlyData[monthKey].monthlyIncome += val; monthlyData[monthKey].days[dayKey].dailyIncome += val; } 
            else { monthlyData[monthKey].monthlyExpense += val; monthlyData[monthKey].days[dayKey].dailyExpense += val; }
            monthlyData[monthKey].days[dayKey].transactions.push(entry);
        });
        return monthlyData;
    }

    function renderLogTable(data) {
        if (!loggerElements.logTableBody) return;
        if (!data || data.length === 0) {
            loggerElements.logTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-gray-500">Įrašų nerasta.</td></tr>`;
            renderSummary(0, 0, {});
            return;
        }
        
        const grouped = groupDataByMonthAndDay(data);
        const months = Object.keys(grouped).sort().reverse();
        let totalIncomeUSD = 0, totalExpenseUSD = 0;
        const tokenBalances = {};
        let html = '';

        months.forEach(monthKey => {
            const mData = grouped[monthKey];
            const mDate = new Date(monthKey + '-01T00:00:00');
            const monthName = mDate.toLocaleDateString('lt-LT', { month: 'long', year: 'numeric' });
            const net = mData.monthlyIncome - mData.monthlyExpense;
            const netColor = net >= 0 ? 'income-color' : 'expense-color';
            const netSign = net >= 0 ? '+' : '';

            html += `<tr class="month-separator-row"><td colspan="8"><div class="date-separator-content"><span>${monthName.toUpperCase()}</span><span class="monthly-summary"><span class="daily-income">+${mData.monthlyIncome.toFixed(2)}</span><span class="daily-expense">-${mData.monthlyExpense.toFixed(2)}</span><span class="daily-net ${netColor}">${netSign}${net.toFixed(2)}</span></span></div></td></tr>`;
            
            Object.keys(mData.days).sort().reverse().forEach(dayKey => {
                const dData = mData.days[dayKey];
                const displayDate = new Date(dayKey + 'T00:00:00');
                const dailyNet = dData.dailyIncome - dData.dailyExpense;
                const dColor = dailyNet >= 0 ? 'income-color' : 'expense-color';
                const dSign = dailyNet >= 0 ? '+' : '';

                html += `<tr class="date-separator-row" data-date-group="${dayKey}"><td colspan="8"><div class="date-separator-content"><span class="date-display"><span class="toggle-arrow">▸</span> ${displayDate.toLocaleDateString('lt-LT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span><span class="daily-summary"><span class="daily-income">+${dData.dailyIncome.toFixed(2)}</span><span class="daily-expense">-${dData.dailyExpense.toFixed(2)}</span><span class="daily-net ${dColor}">${dSign}${dailyNet.toFixed(2)}</span></span></div></td></tr>`;

                dData.transactions.forEach(entry => {
                    const usd = (entry.token_amount || 0) * (entry.rate_usd || 0);
                    const isInc = entry.type === 'income';
                    totalIncomeUSD += isInc ? usd : 0;
                    totalExpenseUSD += !isInc ? usd : 0;
                    if (!tokenBalances[entry.token]) tokenBalances[entry.token] = 0;
                    tokenBalances[entry.token] += isInc ? entry.token_amount : -entry.token_amount;
                    
                    const tokenSymbol = (window.appData.tokens[entry.token]?.symbol || entry.token.toUpperCase()).replace(' (SOL)', '');
                    const iconPath = `img/${entry.token.toLowerCase()}.svg`;
                    const tokenCellHTML = `<img src="${iconPath}" alt="${tokenSymbol}" class="token-icon-table" onerror="this.outerHTML = '<span>${tokenSymbol}</span>'">`;

                    html += `<tr class="transaction-row hidden" data-id="${entry.id}" data-date-group="${dayKey}"><td class="align-middle text-sm text-gray-400">${entry.date}</td><td class="arrow-cell align-middle ${isInc ? 'income-color' : 'expense-color'} font-bold text-center">${isInc ? '▲' : '▼'}</td><td class="token-cell align-middle">${tokenCellHTML} <span class="ml-1">${tokenSymbol}</span></td><td class="align-middle font-mono ${isInc ? 'income-color' : 'expense-color'}">${(entry.token_amount || 0).toLocaleString('en-US', { maximumFractionDigits: 4 })}</td><td class="align-middle text-gray-400">$${(entry.rate_usd || 0).toFixed(4)}</td><td class="align-middle font-bold">$${usd.toFixed(2)}</td><td class="align-middle text-sm text-gray-300">${entry.description || ''}</td><td class="log-table-actions align-middle"><button class="btn-edit">Taisyti</button><button class="btn-delete">Trinti</button></td></tr>`;
                });
            });
        });
        
        loggerElements.logTableBody.innerHTML = html;
        renderSummary(totalIncomeUSD, totalExpenseUSD, tokenBalances);
    }
    
    function renderSummary(income, expense, tokenBalances) {
        if (!loggerElements.summaryContainer) return;
        const balance = income - expense;
        const btcPrice = window.appData?.prices?.['bitcoin']?.price || 0;
        let btcValueHTML = '';
        if (btcPrice > 0) { btcValueHTML = `<div class="summary-row"><span class="summary-label btc-value"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left-right" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/></svg> BTC Atitikmuo:</span><span class="summary-value btc-value">${(balance / btcPrice).toFixed(8)} BTC</span></div>`; }
        
        let tokenBalancesHTML = '<hr class="my-4 border-gray-700"><h3 class="text-lg font-semibold mb-2 text-white">Žetonų Balansai</h3>';
        const tokens = window.appData?.tokens || {};
        Object.keys(tokenBalances).sort().forEach(token => { 
            const amount = tokenBalances[token];
            if (Math.abs(amount) < 0.0001) return;
            let displayToken = tokens[token]?.symbol || token.toUpperCase();
            if (displayToken === 'GST (SOL)') displayToken = 'GST';
            tokenBalancesHTML += `<div class="summary-row"><span class="summary-label">${displayToken}:</span><span class="summary-value ${amount >= 0 ? 'income-color' : 'expense-color'}">${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span></div>`; 
        });
        
        loggerElements.summaryContainer.innerHTML = `<h3 class="text-lg font-semibold mb-2 text-white">Bendra suvestinė</h3><div class="summary-row"><span class="summary-label">Viso Pajamų (USD):</span><span class="summary-value income-color">$${income.toFixed(2)}</span></div><div class="summary-row"><span class="summary-label">Viso Išlaidų (USD):</span><span class="summary-value expense-color">$${expense.toFixed(2)}</span></div><div class="summary-row text-lg border-t border-gray-700 mt-2 pt-2"><strong class="summary-label">Grynasis Balansas (USD):</strong><strong class="summary-value ${balance >= 0 ? 'income-color' : 'expense-color'}">$${balance.toFixed(2)}</strong></div>${btcValueHTML}${tokenBalancesHTML}`;
    }

    // === 7. VEIKSMAI (CREATE, UPDATE, DELETE, CSV) ===
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
            const scrolls = parseFloat(loggerElements.ogMintScrollsCost.value) || 0;
            if (gst > 0) operations.push({ ...commonData, tokenKey: 'gst', tokenAmount: gst });
            if (gmt > 0) operations.push({ ...commonData, tokenKey: 'gmt', tokenAmount: gmt });
            if (scrolls > 0) operations.push({ ...commonData, description: description ? description + " (Scrolls)" : "(Scrolls Cost)", tokenKey: 'gmt', tokenAmount: scrolls });
        } else if (platform === 'og' && category === 'Restore') {
            const gst = parseFloat(loggerElements.ogRestoreGst.value) || 0;
            const gmtD = parseFloat(loggerElements.ogRestoreGmt.value) || 0;
            const gmtG = parseFloat(loggerElements.ogRestoreGemsGmt.value) || 0;
            if (gst > 0) operations.push({ ...commonData, tokenKey: 'gst', tokenAmount: gst });
            if (gmtD > 0) operations.push({ ...commonData, tokenKey: 'gmt', tokenAmount: gmtD });
            if (gmtG > 0) operations.push({ ...commonData, description: description ? description + " (Gems)" : "(Gems Cost)", tokenKey: 'gmt', tokenAmount: gmtG });
        } else {
            const radio = document.querySelector('input[name="logToken"]:checked');
            if (radio) {
                const amount = parseFloat(loggerElements.logTokenAmount.value);
                if (!isNaN(amount) && amount > 0) operations.push({ ...commonData, tokenKey: radio.value, tokenAmount: amount });
            }
        }

        if (operations.length === 0) throw new Error("Neįvesta jokia suma.");
        for (const op of operations) await createSingleLogEntry(op);
    }

    async function createSingleLogEntry(entryData) {
        const sb = getSupabase();
        if (!sb) throw new Error("Klaida: Nėra ryšio su DB.");
        
        // KRITINIS PATAISYMAS: Gauti user_id
        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw new Error("Vartotojas neprisijungęs.");
        
        console.log('💾 Saugoma transakcija vartotojui:', user.email);
        
        loggerElements.logSubmitBtn.textContent = `Išsaugoma...`;
        
        let rate = 0;
        if (window.appActions && window.appActions.getPriceForDate) {
            try { 
                rate = await window.appActions.getPriceForDate(entryData.tokenKey, entryData.date); 
            } catch (e) {
                console.error('Klaida gaunant kainą:', e);
            }
        }
        
        const record = { 
            ...entryData, 
            token: entryData.tokenKey, 
            token_amount: entryData.tokenAmount, 
            rate_usd: rate, 
            user_id: user.id // SVARBU: Pridėti user_id
        };
        
        delete record.tokenKey;
        delete record.tokenAmount;
        
        const { error } = await sb.from('transactions').insert(record);
        if (error) {
            console.error('❌ Klaida saugant:', error);
            throw error;
        }
        
        console.log('✅ Transakcija išsaugota');
    }

    async function handleUpdate(id) {
        const sb = getSupabase();
        if(!sb) throw new Error("Klaida: Nėra ryšio su DB.");

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
        
        if (window.appActions.getPriceForDate) {
             const oldEntry = JSON.parse(loggerElements.logForm.dataset.oldEntry);
             if (record.date !== oldEntry.date || record.token !== oldEntry.token) {
                 record.rate_usd = await window.appActions.getPriceForDate(record.token, record.date);
             }
        }
        
        const { error } = await sb.from('transactions').update(record).eq('id', id);
        if (error) throw error;
    }

    async function handleLogTableClick(event) {
        const target = event.target;
        const separatorRow = target.closest('.date-separator-row');
        if (separatorRow) { 
            const date = separatorRow.dataset.dateGroup;
            if (!date) return;
            separatorRow.classList.toggle('expanded');
            const arrow = separatorRow.querySelector('.toggle-arrow');
            if (arrow) arrow.textContent = separatorRow.classList.contains('expanded') ? '▾' : '▸';
            document.querySelectorAll(`.transaction-row[data-date-group="${date}"]`).forEach(row => row.classList.toggle('hidden'));
            return;
        }
        const btn = target.closest('button');
        if (!btn) return;
        const row = btn.closest('tr');
        if (!row || !row.dataset.id) return;
        const id = parseInt(row.dataset.id);
        const sb = getSupabase();
        if (btn.matches('.btn-delete')) {
            if (confirm('Ar tikrai trinti?')) {
                const { error } = await sb.from('transactions').delete().eq('id', id);
                if (error) alert(`Klaida: ${error.message}`);
                else await loadAndRenderLogTable();
            }
        } else if (btn.matches('.btn-edit')) {
            const { data, error } = await sb.from('transactions').select().eq('id', id).single();
            if (error) { alert(`Klaida: ${error.message}`); return; }
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
        const tokens = entry.platform === 'go' ? ['ggt', 'gmt', 'usdc'] : ['gst', 'gmt', 'sol', 'usdc'];
        updateTokenRadioButtons(tokens);
        setTimeout(() => {
            const radio = document.querySelector(`input[name="logToken"][value="${entry.token}"]`);
            if (radio) radio.checked = true;
        }, 0);
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

    function handleExportToCsv() {
        try {
            if (!currentLogData || currentLogData.length === 0) { alert('Nėra duomenų.'); return; }
            const headers = [ "Data", "Platforma", "Tipas", "Kategorija", "Žetonas", "Kiekis", "Kursas (USD)", "Suma (USD)", "Aprašymas" ];
            const rows = currentLogData.map(entry => {
                const usd = (entry.token_amount || 0) * (entry.rate_usd || 0);
                return [ entry.date, entry.platform, entry.type, entry.category, entry.token, entry.token_amount || 0, entry.rate_usd || 0, usd, entry.description || '' ].map(String); 
            });
            const escape = (f) => (f.includes(',') || f.includes('"') || f.includes('\n')) ? `"${f.replace(/"/g, '""')}"` : f;
            const csv = [ headers.join(','), ...rows.map(row => row.map(escape).join(',')) ].join('\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `stepn-go-transakcijos-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) { alert(`Klaida: ${error.message}`); }
    }

})();
