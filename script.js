// Failas: script.js
(function() {
    'use strict';
    const SUPABASE_URL = 'https://zojhurhwmceoqxkatvkx.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpvamh1cmh3bWNlb3F4a2F0dmt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNjYxNDYsImV4cCI6MjA2NDc0MjE0Nn0.NFGhQc7H95U9vOaM7OVxNUgTuXSughz8ZuxaCLfbfQE';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const ALL_TOKENS_CONFIG = {
        'gmt': { key: 'gmt', symbol: 'GMT', apiId: 'stepn', historyApiId: 'stepn' },
        'ggt': { key: 'ggt', symbol: 'GGT', apiId: 'go-game-token', historyApiId: 'ggt' },
        'gst': { key: 'gst', symbol: 'GST (SOL)', apiId: 'green-satoshi-token', historyApiId: 'green-satoshi-token' },
        'sol': { key: 'sol', symbol: 'SOL', apiId: 'solana', historyApiId: 'solana' },
        'usdc': { key: 'usdc', symbol: 'USDC', apiId: 'usd-coin', historyApiId: 'usd-coin', fixedPrice: 1.0 },
        'btc': { key: 'btc', symbol: 'BTC', apiId: 'bitcoin', historyApiId: 'bitcoin' },
        'usdt': { key: 'usdt', symbol: 'USDT', apiId: 'tether', historyApiId: 'tether', fixedPrice: 1.0 },
        'bnb':  { key: 'bnb', symbol: 'BNB', apiId: 'binancecoin', historyApiId: 'binancecoin' },
        'eth':  { key: 'eth', symbol: 'ETH', apiId: 'ethereum', historyApiId: 'ethereum' }
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

    let liveTokenPrices = {}, elements = {};
    
    async function init() {
        cacheDOMElements();
        bindEventListeners();
        updateDynamicForm(); 
        await fetchLiveTokenPrices(true);
        await loadAndRenderLogTable();
        resetLogForm();
        
        const converterTokens = Object.keys(ALL_TOKENS_CONFIG);
        generateConverterCards(converterTokens);
        updateConverterPricesUI();
    }

    function cacheDOMElements() {
        const ids = [
            'tab-btn-logger', 'tab-btn-converter', 'tab-content-logger', 'tab-content-converter',
            'logForm', 'platform', 'logDate', 'logType', 'logCategory', 'logDescription', 'logSubmitBtn',
            'standardFields', 'goLevelUpFields', 'ogLevelUpFields', 'ogMintFields', 'editFields',
            'logTokenRadioGroup', 'logTokenAmount',
            'goLevelUpGgt', 'goLevelUpGmt',
            'ogLevelUpGst', 'ogLevelUpGmt',
            'ogMintGst', 'ogMintGmt', 'ogMintScrolls',
            'editRateUsd', 'editAmountUsd',
            'logTableBody', 'summaryContainer', 'converter-grid',
            'filterStartDate', 'filterEndDate', 'filterToken', 'filterSort', 'filterOrder', 'filterBtn'
        ];
        ids.forEach(id => { if(document.getElementById(id)) elements[id] = document.getElementById(id); });
    }

    function bindEventListeners() {
        elements.platform.addEventListener('change', updateDynamicForm);
        elements.logType.addEventListener('change', updateDynamicForm);
        elements.logCategory.addEventListener('change', updateDynamicForm);
        
        elements.logForm.addEventListener('submit', handleLogSubmit);
        elements.logTableBody.addEventListener('click', handleLogTableClick);
        elements.filterBtn.addEventListener('click', loadAndRenderLogTable);
        elements['tab-btn-logger'].addEventListener('click', () => switchTab('logger'));
        elements['tab-btn-converter'].addEventListener('click', () => switchTab('converter'));

        if (elements['converter-grid']) {
            elements['converter-grid'].addEventListener('input', handleConverterInput);
            elements['converter-grid'].addEventListener('click', handleConverterClick);
        }
    }

    function updateDynamicForm() {
        updateCategoryDropdown();
        updateVisibleFields();
    }
    
    function updateCategoryDropdown() {
        const platform = elements.platform.value;
        const type = elements.logType.value;
        const platformCategories = CATEGORIES[platform]?.[type] || {};

        const currentCategory = elements.logCategory.value;
        let optionsHTML = `<option value="" disabled selected>Pasirinkite kategoriją...</option>`;
        optionsHTML += Object.entries(platformCategories)
            .map(([key, value]) => `<option value="${key}">${value}</option>`).join('');
        elements.logCategory.innerHTML = optionsHTML;
        
        if (platformCategories[currentCategory]) {
            elements.logCategory.value = currentCategory;
        } else {
            elements.logCategory.value = "";
        }
    }

    function updateVisibleFields() {
        const platform = elements.platform.value;
        const category = elements.logCategory.value;
        
        ['standardFields', 'goLevelUpFields', 'ogLevelUpFields', 'ogMintFields'].forEach(id => {
            if (elements[id]) elements[id].classList.add('hidden');
        });

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
            return `<label class="radio-label"><span>${token.symbol}</span><input type="radio" name="logToken" value="${key}" ${index === 0 ? 'checked' : ''}><span class="radio-custom-dot"></span></label>`;
        }).join('');
    }

    async function handleLogSubmit(event) {
        event.preventDefault();
        elements.logSubmitBtn.disabled = true;
        elements.logSubmitBtn.textContent = 'Apdorojama...';
        try {
            await handleCreate();
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

        if (!category) {
            throw new Error("Prašome pasirinkti kategoriją.");
        }

        const commonData = { date, type, category, description: '' };
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
            if(gst > 0) operations.push({ ...commonData, tokenKey: 'gst', tokenAmount: gst });
            if(gmt > 0) operations.push({ ...commonData, tokenKey: 'gmt', tokenAmount: gmt });
            if(scrolls > 0) description += ` (Panaudota ${scrolls} Minting Scrolls)`;
        } else {
            const selectedTokenRadio = document.querySelector('input[name="logToken"]:checked');
            if (!selectedTokenRadio) throw new Error("Prašome pasirinkti žetoną.");
            const tokenAmount = parseFloat(elements.logTokenAmount.value);
            if (isNaN(tokenAmount) || tokenAmount <= 0) throw new Error("Prašome įvesti teigiamą sumą.");
            operations.push({ ...commonData, tokenKey: selectedTokenRadio.value, tokenAmount });
        }
        
        if (operations.length === 0) {
            throw new Error("Neįvesta jokia suma arba visos sumos lygios nuliui.");
        }
        
        if(operations.length > 0) operations[0].description = description;

        for (const op of operations) {
            await createSingleLogEntry(op);
        }
    }

    function resetLogForm() {
        elements.logForm.reset();
        elements.platform.value = 'go';
        elements.logType.value = "expense";
        updateDynamicForm();
        
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        elements.logDate.value = today.toISOString().split('T')[0];
        
        elements.logSubmitBtn.textContent = 'Pridėti įrašą';
        elements.logSubmitBtn.disabled = false;
    }
    
    async function createSingleLogEntry(entryData) {
         elements.logSubmitBtn.textContent = `Išsaugoma ${entryData.tokenKey.toUpperCase()}...`;
         const rate_usd = await getPriceForDate(entryData.tokenKey, entryData.date);
         const record = { 
             date: entryData.date, 
             type: entryData.type, 
             token: entryData.tokenKey, 
             token_amount: entryData.tokenAmount, 
             category: entryData.category, 
             description: entryData.description, 
             rate_usd,
             platform: elements.platform.value
            };
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
                if (error) {
                    alert(`Klaida trinant: ${error.message}`);
                } else {
                    await loadAndRenderLogTable();
                }
            }
        }
    }

    async function getPriceForDate(tokenKey, dateString) {
        const config = ALL_TOKENS_CONFIG[tokenKey]; if (!config) throw new Error(`Nežinomas žetonas: ${tokenKey}`); if (config.fixedPrice) return config.fixedPrice;
        const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        if (dateString >= today.toISOString().split('T')[0] && liveTokenPrices[config.apiId]) { return liveTokenPrices[config.apiId].price; }
        const [year, month, day] = dateString.split('-'); const apiDate = `${day}-${month}-${year}`;
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/coins/${config.historyApiId}/history?date=${apiDate}`);
            if (!response.ok) throw new Error(`API klaida (${response.status})`); 
            const data = await response.json();
            if (data.market_data?.current_price?.usd) return data.market_data.current_price.usd;
            console.warn(`Istorinė kaina nerasta ${config.symbol} datai ${dateString}. Bandoma gauti dabartinę kainą.`);
            alert(`Dėmesio: Nepavyko gauti istorinio ${config.symbol.toUpperCase()} kurso. Įrašui panaudotas dabartinis kursas.`);
            if (Object.keys(liveTokenPrices).length === 0) await fetchLiveTokenPrices(true);
            const currentPrice = liveTokenPrices[config.apiId]?.price;
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
            liveTokenPrices['usd'] = { price: 1, change: 0 };
            for (const apiId in data) { 
                liveTokenPrices[apiId] = { price: data[apiId].usd, change: data[apiId].usd_24h_change || 0 }; 
            }
            updateConverterPricesUI();
        } catch (error) { 
            console.error("Klaida gaunant realaus laiko kainas:", error); 
        }
    }

    async function loadAndRenderLogTable() {
        let query = supabase.from('transactions').select('*');
        if (elements.filterStartDate.value) query = query.gte('date', elements.filterStartDate.value);
        if (elements.filterEndDate.value) query = query.lte('date', elements.filterEndDate.value);
        
        const filterTokenValue = elements.filterToken ? elements.filterToken.value : "";
        if (filterTokenValue) {
             query = query.eq('token', filterTokenValue);
        }

        const sortOrder = elements.filterOrder ? elements.filterOrder.value === 'asc' : true;
        const sortBy = elements.filterSort ? elements.filterSort.value : 'date';

        query = query.order(sortBy, { ascending: sortOrder }).order('id', { ascending: false });
        
        const { data, error } = await query;
        if (error) { 
            console.error('Klaida gaunant duomenis:', error); 
            return; 
        }
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
            row.innerHTML = `<td>${entry.date}</td><td style="font-size: 1.25rem; text-align: center;" class="${isIncome ? 'income-color' : 'expense-color'}">${isIncome ? '▼' : '▲'}</td><td>${entry.token.toUpperCase()}</td><td>${(entry.token_amount || 0).toLocaleString('en-US', {maximumFractionDigits: 2})}</td><td>$${(entry.rate_usd || 0).toFixed(5)}</td><td>$${amount_usd.toFixed(2)}</td><td>${entry.description || ''}</td><td class="log-table-actions"><button class="btn-delete">Trinti</button></td>`;
            elements.logTableBody.appendChild(row);
        });
        renderSummary(totalIncomeUSD, totalExpenseUSD, tokenBalances);
    }
    
    function renderSummary(income, expense, tokenBalances) {
        const balance = income - expense;
        const btcPrice = liveTokenPrices['bitcoin']?.price;
        let btcValueHTML = '';
        if (btcPrice > 0) {
            const btcValue = balance / btcPrice;
            btcValueHTML = `<div class="summary-row"><span class="summary-label btc-value"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left-right" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/></svg> BTC Atitikmuo:</span><span class="summary-value btc-value">${btcValue.toFixed(8)} BTC</span></div>`;
        }

        let tokenBalancesHTML = '<hr class="my-4 border-gray-700"><h3 class="text-lg font-semibold mb-2">Žetonų Balansai</h3>';
        Object.keys(tokenBalances).sort().forEach(token => { const amount = tokenBalances[token]; tokenBalancesHTML += `<div class="summary-row"><span class="summary-label">${token.toUpperCase()} Balansas:</span><span class="summary-value ${amount >= 0 ? 'income-color' : 'expense-color'}">${amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 4})}</span></div>`; });
        
        elements.summaryContainer.innerHTML = `<h3 class="text-lg font-semibold mb-2">Bendra suvestinė (pagal filtrus)</h3><div class="summary-row"><span class="summary-label">Viso Pajamų (USD):</span><span class="summary-value income-color">$${income.toFixed(2)}</span></div><div class="summary-row"><span class="summary-label">Viso Išlaidų (USD):</span><span class="summary-value expense-color">$${expense.toFixed(2)}</span></div><div class="summary-row text-lg border-t border-gray-700 mt-2 pt-2"><strong class="summary-label">Grynasis Balansas (USD):</strong><strong class="summary-value ${balance >= 0 ? 'income-color' : 'expense-color'}">$${balance.toFixed(2)}</strong></div>${btcValueHTML}${tokenBalancesHTML}`;
    }

    function generateConverterCards(tokenKeys) {
        if (!elements['converter-grid']) return;
        const tokensToDisplay = [ { key: 'usd', symbol: 'USD', apiId: 'usd', fixedPrice: 1.0 }, ...tokenKeys.map(k => ALL_TOKENS_CONFIG[k]).filter(t => t)];
        let html = '';
        tokensToDisplay.forEach(token => { html += `<div class="converter-card" id="card-${token.apiId}"><div class="converter-card-header"><span class="converter-card-title">${token.symbol}</span><button class="converter-card-update-btn" data-api-id="${token.apiId}">Atnaujinti</button></div><div class="converter-card-price-wrapper"><div class="converter-card-price" id="price-${token.apiId}">$0.00000</div><div class="price-change" id="change-${token.apiId}"></div></div><div class="input-group"><label for="amount-${token.apiId}" class="text-xs">Kiekis:</label><input type="number" id="amount-${token.apiId}" data-api-id="${token.apiId}" class="converter-amount-input" placeholder="0.00"></div><div class="input-group"><label for="value-${token.apiId}" class="text-xs">Vertė USD:</label><input type="number" id="value-${token.apiId}" class="converter-value-input" placeholder="0.00"></div><div class="update-time" id="time-${token.apiId}"></div></div>`; });
        elements['converter-grid'].innerHTML = html;
    }

    function updateConverterPricesUI() {
         document.querySelectorAll('.converter-card').forEach(card => {
            const apiId = card.id.replace('card-', '');
            const priceData = liveTokenPrices[apiId];
            const priceEl = card.querySelector(`#price-${apiId}`);
            const changeEl = card.querySelector(`#change-${apiId}`);
            if (priceData && typeof priceData.price !== 'undefined') {
                priceEl.textContent = `$${priceData.price.toFixed(5)}`;
                const change = priceData.change || 0;
                changeEl.classList.remove('price-up', 'price-down');
                if (change > 0) {
                    changeEl.textContent = `▲ +${change.toFixed(2)}%`;
                    changeEl.classList.add('price-up');
                } else if (change < 0) {
                    changeEl.textContent = `▼ ${change.toFixed(2)}%`;
                    changeEl.classList.add('price-down');
                } else {
                     changeEl.textContent = `0.00%`;
                }
            } else { priceEl.textContent = 'N/A'; changeEl.textContent = ''; }
            card.querySelector(`#time-${apiId}`).textContent = `Atnaujinta: ${new Date().toLocaleTimeString('lt-LT')}`;
         });
    }

    function handleConverterInput(event) {
        const input = event.target; 
        if (!input.closest('.converter-card')) return;
        const value = parseFloat(input.value);
        if(isNaN(value)) { 
            document.querySelectorAll('.converter-amount-input, .converter-value-input').forEach(i => { if(i !== input) i.value = ''; }); 
            return; 
        }
        let usdValue;
        if(input.classList.contains('converter-amount-input')) {
            const apiId = input.dataset.apiId; 
            const price = liveTokenPrices[apiId]?.price || 0; 
            usdValue = value * price;
        } else { 
            usdValue = value; 
        }
        document.querySelectorAll('.converter-card').forEach(card => {
            const cardApiId = card.id.replace('card-', ''); 
            const price = liveTokenPrices[cardApiId]?.price || 0;
            const valueInput = card.querySelector('.converter-value-input'); 
            const amountInput = card.querySelector('.converter-amount-input');
            if (input !== valueInput) valueInput.value = usdValue.toFixed(2);
            if (input !== amountInput && price > 0) amountInput.value = (usdValue / price).toFixed(6);
        });
    }

    function switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-button').forEach(el => el.classList.remove('active'));
        document.getElementById(`tab-content-${tabName}`).classList.add('active');
        document.getElementById(`tab-btn-${tabName}`).classList.add('active');
    }
    
    document.addEventListener('DOMContentLoaded', init);
})();
