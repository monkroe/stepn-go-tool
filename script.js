// Failas: script.js (Versija su platformų logika ir logotipais)
(function() {
    'use strict';
    const SUPABASE_URL = 'https://zojhurhwmceoqxkatvkx.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpvamh1cmh3bWNlb3F4a2F0dmt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNjYxNDYsImV4cCI6MjA2NDc0MjE0Nn0.NFGhQc7H95U9vOaM7OVxNUgTuXSughz8ZuxaCLfbfQE';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
// Atnaujinkite TIK šį objektą savo script.js faile

const ALL_TOKENS_CONFIG = {
    // PATAISYTOS IR PATIKRINTOS NUORODOS
    'gmt': { key: 'gmt', symbol: 'GMT', apiId: 'stepn', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/18069.png' },
    'ggt': { key: 'ggt', symbol: 'GGT', apiId: 'go-game-token', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/31191.png' },
    'gst': { key: 'gst', symbol: 'GST (SOL)', apiId: 'green-satoshi-token', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/16353.png' },
    
    // LIKUSIOS NUORODOS, KURIOS VEIKIA
    'sol': { key: 'sol', symbol: 'SOL', apiId: 'solana', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png' },
    'usdc': { key: 'usdc', symbol: 'USDC', apiId: 'usd-coin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png' },
    'btc': { key: 'btc', symbol: 'BTC', apiId: 'bitcoin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png' },
    'usdt': { key: 'usdt', symbol: 'USDT', apiId: 'tether', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png' },
    'bnb':  { key: 'bnb', symbol: 'BNB', apiId: 'binancecoin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png' },
    'eth':  { key: 'eth', symbol: 'ETH', apiId: 'ethereum', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png' }
};
    
    const CATEGORIES = {
        go: {
            income: { "GGT Earnings": "GGT Uždarbis", "Other": "Kita" },
            expense: { "Level-up": "Lygio kėlimas", "Minting": "Mintinimas", "Other": "Kita" }
        },
        og: {
            income: { "GST Earnings": "GST Uždarbis", "Sneaker Sale": "Sportbačio pardavimas", "Other": "Kita" },
            expense: { "Level-up": "Lygio kėlimas", "Minting": "Mintinimas", "Other": "Kita" }
        }
    };

    let liveTokenPrices = {};
    let elements = {};
    
    window.appData = { tokens: ALL_TOKENS_CONFIG, prices: liveTokenPrices };
    window.appActions = { fetchPrices: fetchLiveTokenPrices };

    async function init() {
        cacheDOMElements();
        bindEventListeners();
        updateDynamicForm(); 
        await fetchLiveTokenPrices(true);
        await loadAndRenderLogTable();
        resetLogForm();
        if (!document.querySelector('script[src="converter.js"]')) {
            const script = document.createElement('script');
            script.src = 'converter.js';
            script.defer = true;
            document.body.appendChild(script);
        }
    }

    function cacheDOMElements() {
        const ids = [
            'tab-btn-logger', 'tab-btn-converter', 'tab-content-logger', 'tab-content-converter',
            'logForm', 'platform', 'logDate', 'logType', 'logCategory', 'logDescription', 'logSubmitBtn',
            'standardFields', 'goLevelUpFields', 'ogLevelUpFields', 'ogMintFields', 'editFields',
            'logTokenRadioGroup', 'logTokenAmount',
            'goLevelUpGgt', 'goLevelUpGmt', 'ogLevelUpGst', 'ogLevelUpGmt', 'ogMintGst', 'ogMintGmt', 'ogMintScrolls',
            'editRateUsd', 'editAmountUsd',
            'logTableBody', 'summaryContainer',
            'filterStartDate', 'filterEndDate', 'filterToken', 'filterSort', 'filterOrder', 'filterBtn'
        ];
        ids.forEach(id => { if(document.getElementById(id)) elements[id] = document.getElementById(id); });
    }

    function bindEventListeners() {
        if (elements['tab-btn-logger']) elements['tab-btn-logger'].addEventListener('click', () => switchTab('logger'));
        if (elements['tab-btn-converter']) elements['tab-btn-converter'].addEventListener('click', () => switchTab('converter'));
        if (elements.logForm) elements.logForm.addEventListener('submit', handleLogSubmit);
        if (elements.logTableBody) elements.logTableBody.addEventListener('click', handleLogTableClick);
        if (elements.platform) elements.platform.addEventListener('change', updateDynamicForm);
        if (elements.logType) elements.logType.addEventListener('change', updateDynamicForm);
        if (elements.logCategory) elements.logCategory.addEventListener('change', updateDynamicForm);
        if (elements.filterBtn) elements.filterBtn.addEventListener('click', loadAndRenderLogTable);
        if (elements.editRateUsd) elements.editRateUsd.addEventListener('input', () => syncEditInputs('rate'));
        if (elements.editAmountUsd) elements.editAmountUsd.addEventListener('input', () => syncEditInputs('amount'));
    }

    function updateDynamicForm() {
        updateCategoryDropdown();
        updateVisibleFields();
    }
    
    function updateCategoryDropdown() {
        if (!elements.platform || !elements.logType || !elements.logCategory) return;
        const platform = elements.platform.value;
        const type = elements.logType.value;
        const platformCategories = CATEGORIES[platform]?.[type] || {};
        const currentCategory = elements.logCategory.value;
        let optionsHTML = `<option value="" disabled selected>Pasirinkite kategoriją...</option>`;
        optionsHTML += Object.entries(platformCategories).map(([key, value]) => `<option value="${key}">${value}</option>`).join('');
        elements.logCategory.innerHTML = optionsHTML;
        if (platformCategories[currentCategory]) {
            elements.logCategory.value = currentCategory;
        } else {
            elements.logCategory.value = "";
        }
    }

    function updateVisibleFields() {
        if (!elements.platform || !elements.logCategory) return;
        const platform = elements.platform.value;
        const category = elements.logCategory.value;
        ['standardFields', 'goLevelUpFields', 'ogLevelUpFields', 'ogMintFields', 'editFields'].forEach(id => {
            if (elements[id]) elements[id].classList.add('hidden');
        });
        const isEditing = !!elements.logForm.dataset.editingId;
        if (isEditing) {
            elements.standardFields.classList.remove('hidden');
            elements.editFields.classList.remove('hidden');
            return;
        }
        if (platform === 'go' && category === 'Level-up') {
            elements.goLevelUpFields.classList.remove('hidden');
        } else if (platform === 'go' && category === 'Minting') {
            elements.standardFields.classList.remove('hidden');
            updateTokenRadioButtons(['ggt']);
        } else if (platform === 'og' && category === 'Level-up') {
            elements.ogLevelUpFields.classList.remove('hidden');
        } else if (platform === 'og' && category === 'Minting') {
            elements.ogMintFields.classList.remove('hidden');
        } else if (category) {
            elements.standardFields.classList.remove('hidden');
            updateTokenRadioButtons(platform === 'go' ? ['ggt', 'gmt', 'usdc'] : ['gst', 'gmt', 'sol', 'usdc']);
        }
    }

    function updateTokenRadioButtons(tokensToShow) {
        if (!elements.logTokenRadioGroup) return;
        elements.logTokenRadioGroup.innerHTML = tokensToShow.map((key, index) => {
            const token = ALL_TOKENS_CONFIG[key];
            return `<label class="radio-label"><span><img src="${token.logo}" alt="${token.symbol}" class="token-logo">${token.symbol}</span><input type="radio" name="logToken" value="${key}" ${index === 0 ? 'checked' : ''}><span class="radio-custom-dot"></span></label>`;
        }).join('');
    }

    async function handleLogSubmit(event) {
        event.preventDefault();
        const editingId = elements.logForm.dataset.editingId;
        elements.logSubmitBtn.disabled = true;
        elements.logSubmitBtn.textContent = 'Apdorojama...';
        try {
            if (editingId) {
                await handleUpdate(editingId);
            } else {
                await handleCreate();
            }
            await loadAndRenderLogTable();
        } catch (error) {
            console.error("Submit error:", error);
            alert(`Įvyko klaida: ${error.message}`);
        } finally {
            resetLogForm();
        }
    }

    async function handleCreate() {
        const platform = elements.platform.value;
        const category = elements.logCategory.value;
        const date = elements.logDate.value;
        const type = elements.logType.value;
        let description = elements.logDescription.value.trim();
        if (!platform || !type || !category) throw new Error("Prašome pasirinkti platformą, tipą ir kategoriją.");
        const commonData = { date, type, category, description }; 
        let operations = []; 
        if (platform === 'go' && category === 'Level-up') {
            const ggt = parseFloat(elements.goLevelUpGgt.value) || 0;
            const gmt = parseFloat(elements.goLevelUpGmt.value) || 0;
            if(ggt > 0) operations.push({ ...commonData, tokenKey: 'ggt', tokenAmount: ggt });
            if(gmt > 0) operations.push({ ...commonData, tokenKey: 'gmt', tokenAmount: gmt });
        } else if (platform === 'og' && category === 'Level-up') {
            const gst = parseFloat(elements.ogLevelUpGst.value) || 0;
            const gmt = parseFloat(elements.ogLevelUpGmt.value) || 0;
            if(gst > 0) operations.push({ ...commonData, tokenKey: 'gst', tokenAmount: gst });
            if(gmt > 0) operations.push({ ...commonData, tokenKey: 'gmt', tokenAmount: gmt });
        } else if (platform === 'og' && category === 'Minting') {
            const gst = parseFloat(elements.ogMintGst.value) || 0;
            const gmt = parseFloat(elements.ogMintGmt.value) || 0;
            const scrolls = parseInt(elements.ogMintScrolls.value) || 0;
            let mintDesc = description;
            if (scrolls > 0) mintDesc += ` (Panaudota ${scrolls} Minting Scrolls)`;
            if(gst > 0) operations.push({ ...commonData, description: mintDesc, tokenKey: 'gst', tokenAmount: gst });
            if(gmt > 0) operations.push({ ...commonData, description: mintDesc, tokenKey: 'gmt', tokenAmount: gmt });
        } else {
            const selectedTokenRadio = document.querySelector('input[name="logToken"]:checked');
            if (!selectedTokenRadio) throw new Error("Prašome pasirinkti žetoną.");
            const tokenAmount = parseFloat(elements.logTokenAmount.value);
            if (isNaN(tokenAmount) || tokenAmount <= 0) throw new Error("Prašome įvesti teigiamą sumą.");
            operations.push({ ...commonData, tokenKey: selectedTokenRadio.value, tokenAmount });
        }
        if (operations.length === 0) throw new Error("Neįvesta jokia suma arba visos sumos lygios nuliui.");
        for (const op of operations) {
            await createSingleLogEntry(op);
        }
    }
    
    async function handleUpdate(id) {
        const record = {
            date: elements.logDate.value,
            type: elements.logType.value,
            token: document.querySelector('input[name="logToken"]:checked').value,
            token_amount: parseFloat(elements.logTokenAmount.value),
            category: elements.logCategory.value,
            description: elements.logDescription.value.trim(),
            platform: elements.platform.value,
            rate_usd: parseFloat(elements.editRateUsd.value)
        };
        const oldEntry = JSON.parse(elements.logForm.dataset.oldEntry);
        if (record.date !== oldEntry.date || record.token !== oldEntry.token) {
            elements.logSubmitBtn.textContent = 'Gaunamas kursas...';
            record.rate_usd = await getPriceForDate(record.token, record.date);
        }
        const { error } = await supabase.from('transactions').update(record).eq('id', id);
        if (error) throw error;
    }

    function resetLogForm() {
        if (elements.logForm) {
            elements.logForm.reset();
            delete elements.logForm.dataset.editingId;
            delete elements.logForm.dataset.oldEntry;
            elements.platform.value = ""; 
            elements.logType.value = ""; 
            updateDynamicForm();
            const today = new Date();
            today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
            elements.logDate.value = today.toISOString().split('T')[0];
            elements.logSubmitBtn.textContent = 'Pridėti įrašą';
            elements.logSubmitBtn.disabled = false;
        }
    }
    
    async function createSingleLogEntry(entryData) {
         elements.logSubmitBtn.textContent = `Išsaugoma ${entryData.tokenKey.toUpperCase()}...`;
         const rate_usd = await getPriceForDate(entryData.tokenKey, entryData.date);
         const record = { date: entryData.date, type: entryData.type, token: entryData.tokenKey, token_amount: entryData.tokenAmount, category: entryData.category, description: entryData.description, rate_usd, platform: elements.platform.value };
         const { error } = await supabase.from('transactions').insert([record]).select();
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
                if (error) { alert(`Klaida trinant: ${error.message}`); } 
                else { await loadAndRenderLogTable(); }
            }
        } else if (target.matches('.btn-edit')) {
            const { data, error } = await supabase.from('transactions').select().eq('id', entryId).single();
            if(error) { alert(`Klaida gaunant įrašą: ${error.message}`); return; }
            startEditEntry(data);
        }
    }
    
    function startEditEntry(entry) {
        resetLogForm();
        elements.logForm.dataset.editingId = entry.id;
        elements.logForm.dataset.oldEntry = JSON.stringify(entry);
        elements.platform.value = entry.platform || 'go';
        elements.logDate.value = entry.date;
        elements.logType.value = entry.type;
        updateDynamicForm();
        elements.logCategory.value = entry.category;
        updateVisibleFields();
        const tokensForPlatform = entry.platform === 'go' ? ['ggt', 'gmt', 'usdc'] : ['gst', 'gmt', 'sol', 'usdc'];
        updateTokenRadioButtons(tokensForPlatform);
        const radioToSelect = document.querySelector(`input[name="logToken"][value="${entry.token}"]`);
        if (radioToSelect) radioToSelect.checked = true;
        elements.logTokenAmount.value = entry.token_amount;
        elements.logDescription.value = entry.description;
        elements.editRateUsd.value = (entry.rate_usd || 0).toFixed(8);
        elements.editAmountUsd.value = ((entry.rate_usd || 0) * (entry.token_amount || 0)).toFixed(2);
        elements.logSubmitBtn.textContent = 'Atnaujinti įrašą';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function syncEditInputs(source) {
        const rate = parseFloat(elements.editRateUsd.value);
        const total = parseFloat(elements.editAmountUsd.value);
        const amount = parseFloat(elements.logTokenAmount.value);
        if (source === 'rate' && !isNaN(rate) && !isNaN(amount)) {
            elements.editAmountUsd.value = (amount * rate).toFixed(2);
        } else if (source === 'amount' && !isNaN(total) && !isNaN(amount) && amount > 0) {
            elements.editRateUsd.value = (total / amount).toFixed(8);
        }
    }

    async function getPriceForDate(tokenKey, dateString) {
        const config = ALL_TOKENS_CONFIG[tokenKey]; if (!config) throw new Error(`Nežinomas žetonas: ${tokenKey}`); if (config.fixedPrice) return config.fixedPrice;
        const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        if (dateString >= today.toISOString().split('T')[0] && window.appData.prices[config.apiId]) { return window.appData.prices[config.apiId].price; }
        const [year, month, day] = dateString.split('-'); const apiDate = `${day}-${month}-${year}`;
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/coins/${config.historyApiId}/history?date=${apiDate}`);
            if (!response.ok) throw new Error(`API klaida (${response.status})`); 
            const data = await response.json();
            if (data.market_data?.current_price?.usd) return data.market_data.current_price.usd;
            console.warn(`Istorinė kaina nerasta ${config.symbol} datai ${dateString}. Bandoma gauti dabartinę kainą.`);
            alert(`Dėmesio: Nepavyko gauti istorinio ${config.symbol.toUpperCase()} kurso. Įrašui panaudotas dabartinis kursas.`);
            if (Object.keys(window.appData.prices).length === 0) await fetchLiveTokenPrices(true);
            const currentPrice = window.appData.prices[config.apiId]?.price;
            if (currentPrice) return currentPrice;
            throw new Error(`Neįmanoma gauti kainos ${config.symbol} žetonui.`);
        } catch (error) { console.error("Klaida gaunant istorinę kainą:", error); throw error; }
    }

    async function fetchLiveTokenPrices(fetchAll = false, singleApiId = null) {
        let tokenApiIds;
        if(fetchAll) { 
            tokenApiIds = Object.values(ALL_TOKENS_CONFIG).map(t => t.apiId).filter(id => id);
        } else if (singleApiId) { 
            tokenApiIds = [singleApiId]; 
        } else { return; }
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${[...new Set(tokenApiIds)].join(',')}&vs_currencies=usd&include_24hr_change=true`);
            if (!response.ok) throw new Error(`API klaida: ${response.statusText}`);
            const data = await response.json();
            window.appData.prices['usd'] = { price: 1, change: 0 };
            for (const apiId in data) { 
                window.appData.prices[apiId] = { price: data[apiId].usd, change: data[apiId].usd_24h_change || 0 }; 
            }
            if (window.appActions && typeof window.appActions.updateConverterUI === 'function') {
                window.appActions.updateConverterUI();
            }
        } catch (error) { 
            console.error("Klaida gaunant realaus laiko kainas:", error); 
        }
    }

    async function loadAndRenderLogTable() {
        let query = supabase.from('transactions').select('*');
        if (elements.filterStartDate && elements.filterStartDate.value) query = query.gte('date', elements.filterStartDate.value);
        if (elements.filterEndDate && elements.filterEndDate.value) query = query.lte('date', elements.filterEndDate.value);
        const filterTokenValue = elements.filterToken ? elements.filterToken.value : "";
        if (filterTokenValue) { query = query.eq('token', filterTokenValue); }
        const sortOrder = elements.filterOrder ? elements.filterOrder.value === 'asc' : true;
        const sortBy = elements.filterSort ? elements.filterSort.value : 'date';
        query = query.order(sortBy, { ascending: sortOrder }).order('id', { ascending: false });
        const { data, error } = await query;
        if (error) { console.error('Klaida gaunant duomenis:', error); return; }
        renderLogTable(data);
        populateFilterDropdowns(data);
    }
    
    function populateFilterDropdowns(data) {
        if (!elements.filterToken) return;
        const uniqueTokens = [...new Set(data.map(item => item.token))];
        let optionsHTML = '<option value="">Visi</option>';
        uniqueTokens.sort().forEach(token => {
            optionsHTML += `<option value="${token}">${token.toUpperCase()}</option>`;
        });
        const currentValue = elements.filterToken.value;
        elements.filterToken.innerHTML = optionsHTML;
        elements.filterToken.value = currentValue;
    }

    function renderLogTable(data) {
        if (!elements.logTableBody) return;
        elements.logTableBody.innerHTML = ''; 
        let totalIncomeUSD = 0, totalExpenseUSD = 0; 
        const tokenBalances = {};
        if(!data || data.length === 0) {
            elements.logTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4">Įrašų nerasta.</td></tr>`;
            renderSummary(0,0,{});
            return;
        }
        data.forEach(entry => {
            const amount_usd = (entry.token_amount || 0) * (entry.rate_usd || 0);
            const isIncome = entry.type === 'income';
            if (isIncome) totalIncomeUSD += amount_usd; else totalExpenseUSD += amount_usd;
            if (!tokenBalances[entry.token]) tokenBalances[entry.token] = 0;
            tokenBalances[entry.token] += isIncome ? entry.token_amount : -entry.token_amount;
            const row = document.createElement('tr'); 
            row.dataset.id = entry.id;
            row.innerHTML = `<td>${entry.date}</td><td style="font-size: 1.25rem; text-align: center;" class="${isIncome ? 'income-color' : 'expense-color'}">${isIncome ? '▼' : '▲'}</td><td>${entry.token.toUpperCase()}</td><td>${(entry.token_amount || 0).toLocaleString('en-US', {maximumFractionDigits: 2})}</td><td>$${(entry.rate_usd || 0).toFixed(5)}</td><td>$${amount_usd.toFixed(2)}</td><td>${entry.description || ''}</td><td class="log-table-actions"><button class="btn-edit">Taisyti</button><button class="btn-delete">Trinti</button></td>`;
            elements.logTableBody.appendChild(row);
        });
        renderSummary(totalIncomeUSD, totalExpenseUSD, tokenBalances);
    }
    
    function renderSummary(income, expense, tokenBalances) {
        if (!elements.summaryContainer) return;
        const balance = income - expense;
        const btcPrice = window.appData.prices['bitcoin']?.price;
        let btcValueHTML = '';
        if (btcPrice > 0) {
            const btcValue = balance / btcPrice;
            btcValueHTML = `<div class="summary-row"><span class="summary-label btc-value"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left-right" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/></svg> BTC Atitikmuo:</span><span class="summary-value btc-value">${btcValue.toFixed(8)} BTC</span></div>`;
        }
        let tokenBalancesHTML = '<hr class="my-4 border-gray-700"><h3 class="text-lg font-semibold mb-2">Žetonų Balansai</h3>';
        Object.keys(tokenBalances).sort().forEach(token => { const amount = tokenBalances[token]; tokenBalancesHTML += `<div class="summary-row"><span class="summary-label">${token.toUpperCase()} Balansas:</span><span class="summary-value ${amount >= 0 ? 'income-color' : 'expense-color'}">${amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 4})}</span></div>`; });
        elements.summaryContainer.innerHTML = `<h3 class="text-lg font-semibold mb-2">Bendra suvestinė (pagal filtrus)</h3><div class="summary-row"><span class="summary-label">Viso Pajamų (USD):</span><span class="summary-value income-color">$${income.toFixed(2)}</span></div><div class="summary-row"><span class="summary-label">Viso Išlaidų (USD):</span><span class="summary-value expense-color">$${expense.toFixed(2)}</span></div><div class="summary-row text-lg border-t border-gray-700 mt-2 pt-2"><strong class="summary-label">Grynasis Balansas (USD):</strong><strong class="summary-value ${balance >= 0 ? 'income-color' : 'expense-color'}">$${balance.toFixed(2)}</strong></div>${btcValueHTML}${tokenBalancesHTML}`;
    }

    function switchTab(tabName) {
        if(elements['tab-content-logger']) elements['tab-content-logger'].classList.toggle('active', tabName === 'logger');
        if(elements['tab-content-converter']) elements['tab-content-converter'].classList.toggle('active', tabName === 'converter');
        if(elements['tab-btn-logger']) elements['tab-btn-logger'].classList.toggle('active', tabName === 'logger');
        if(elements['tab-btn-converter']) elements['tab-btn-converter'].classList.toggle('active', tabName === 'converter');
    }
    
    document.addEventListener('DOMContentLoaded', init);
})();
