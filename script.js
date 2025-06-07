// Failas: script.js
(function() {
    'use strict';
    const SUPABASE_URL = 'https://zojhurhwmceoqxkatvkx.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpvamh1cmh3bWNlb3F4a2F0dmt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNjYxNDYsImV4cCI6MjA2NDc0MjE0Nn0.NFGhQc7H95U9vOaM7OVxNUgTuXSughz8ZuxaCLfbfQE';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const ALL_TOKENS_CONFIG = {
        'gmt': { key: 'gmt', symbol: 'GMT (STEPN)', apiId: 'stepn', historyApiId: 'stepn' },
        'ggt': { key: 'ggt', symbol: 'GGT (STEPN GO)', apiId: 'go-game-token', historyApiId: 'ggt' },
        'gst': { key: 'gst', symbol: 'GST (SOL)', apiId: 'green-satoshi-token', historyApiId: 'green-satoshi-token' },
        'pol': { key: 'pol', symbol: 'POL (Polygon)', apiId: 'matic-network', historyApiId: 'matic-network' },
        'sol': { key: 'sol', symbol: 'SOL (Solana)', apiId: 'solana', historyApiId: 'solana' },
        'btc': { key: 'btc', symbol: 'BTC', apiId: 'bitcoin', historyApiId: 'bitcoin' },
        'usdc': { key: 'usdc', symbol: 'USDC', apiId: 'usd-coin', historyApiId: 'usd-coin', fixedPrice: 1.0 },
        'usdt': { key: 'usdt', symbol: 'USDT', apiId: 'tether', historyApiId: 'tether', fixedPrice: 1.0 },
        'bnb':  { key: 'bnb', symbol: 'BNB', apiId: 'binancecoin', historyApiId: 'binancecoin' },
        'eth':  { key: 'eth', symbol: 'ETH', apiId: 'ethereum', historyApiId: 'ethereum' }
    };
    const LOGGER_TOKEN_KEYS = ['ggt', 'gst', 'gmt', 'pol', 'sol', 'usdc', 'usdt'];
    const CATEGORIES = {
        income: { "GGT Earnings": "GGT Uždarbis", "GST Earnings": "StepN OG Uždarbis", "Sneaker Sale": "Sportbačio pardavimas", "Other": "Kita" },
        expense: { "Sneaker Purchase": "Sportbačio pirkimas", "Sneaker Burn": "Sportbačio deginimas", "Level-up": "Lygio kėlimas", "Minting": "Mintinimas", "Other": "Kita" }
    };
    let liveTokenPrices = {}, elements = {};
    
    async function init() {
        cacheDOMElements();
        bindEventListeners();
        populateDropdowns();
        await fetchLiveTokenPrices(true);
        await loadAndRenderLogTable();
        resetLogForm();
        generateConverterCards();
        updateConverterPricesUI();
    }

    function cacheDOMElements() {
        const ids = ['tab-btn-logger', 'tab-btn-converter', 'tab-content-logger', 'tab-content-converter', 'logForm', 'logDate', 'logType', 'logCategory', 'standardFields', 'logTokenRadioGroup', 'logTokenAmount', 'mintingFields', 'mintGgtAmount', 'mintGmtAmount', 'logDescription', 'logSubmitBtn', 'logTableBody', 'summaryContainer', 'converter-grid', 'filterStartDate', 'filterEndDate', 'filterToken', 'filterSort', 'filterOrder', 'filterBtn', 'editFields', 'editRateUsd', 'editAmountUsd'];
        ids.forEach(id => elements[id] = document.getElementById(id));
    }

    function bindEventListeners() {
        elements['tab-btn-logger'].addEventListener('click', () => switchTab('logger'));
        elements['tab-btn-converter'].addEventListener('click', () => switchTab('converter'));
        elements.logForm.addEventListener('submit', handleLogSubmit);
        elements.logTableBody.addEventListener('click', handleLogTableClick);
        elements['converter-grid'].addEventListener('input', handleConverterInput);
        elements['converter-grid'].addEventListener('click', handleConverterClick);
        elements.logType.addEventListener('change', updateCategoryDropdown);
        elements.logCategory.addEventListener('change', handleCategoryChange);
        elements.logTokenRadioGroup.addEventListener('change', handleTokenChange);
        elements.filterBtn.addEventListener('click', loadAndRenderLogTable);
        elements.editRateUsd.addEventListener('input', () => syncEditInputs('rate'));
        elements.editAmountUsd.addEventListener('input', () => syncEditInputs('amount'));
    }

    function switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-button').forEach(el => el.classList.remove('active'));
        document.getElementById(`tab-content-${tabName}`).classList.add('active');
        document.getElementById(`tab-btn-${tabName}`).classList.add('active');
    }
    
    async function handleLogSubmit(event) {
        event.preventDefault();
        const editingId = elements.logForm.dataset.editingId;
        elements.logSubmitBtn.disabled = true;
        elements.logSubmitBtn.textContent = 'Apdorojama...';
        try {
            if (editingId) { await handleUpdate(editingId);
            } else { await handleCreate(); }
            await loadAndRenderLogTable();
        } catch (error) { console.error("Submit error:", error); alert(`Įvyko klaida: ${error.message}`);
        } finally { resetLogForm(); }
    }
    
    async function handleCreate() {
        const category = elements.logCategory.value, date = elements.logDate.value, type = elements.logType.value, description = elements.logDescription.value.trim();
        if (category === 'Minting') {
            const ggtAmount = parseFloat(elements.mintGgtAmount.value) || 0;
            const gmtAmount = parseFloat(elements.mintGmtAmount.value) || 0;
            if (ggtAmount > 0) await createSingleLogEntry({ date, type, tokenKey: 'ggt', tokenAmount: ggtAmount, category, description });
            if (gmtAmount > 0) await createSingleLogEntry({ date, type, tokenKey: 'gmt', tokenAmount: gmtAmount, category, description });
        } else {
            const selectedTokenRadio = document.querySelector('input[name="logToken"]:checked');
            if (!selectedTokenRadio) throw new Error("Prašome pasirinkti žetoną.");
            const tokenAmount = parseFloat(elements.logTokenAmount.value);
            if (isNaN(tokenAmount) || tokenAmount <= 0) throw new Error("Prašome įvesti teigiamą sumą.");
            await createSingleLogEntry({ date, type, tokenKey: selectedTokenRadio.value, tokenAmount, category, description });
        }
    }
    
    async function handleUpdate(id) {
        const newDate = elements.logDate.value;
        const newAmount = parseFloat(elements.logTokenAmount.value);
        const newToken = document.querySelector('input[name="logToken"]:checked').value;
        const oldEntry = JSON.parse(elements.logForm.dataset.oldEntry);
        
        let rate_usd = parseFloat(elements.editRateUsd.value);
        if (isNaN(rate_usd)) throw new Error("Neteisingas kursas.");
        if (newDate !== oldEntry.date || newToken !== oldEntry.token) {
             elements.logSubmitBtn.textContent = `Gaunamas ${newToken.toUpperCase()} kursas...`;
             rate_usd = await getPriceForDate(newToken, newDate);
        }
        
        const record = { date: newDate, type: elements.logType.value, token: newToken, token_amount: newAmount, category: elements.logCategory.value, description: elements.logDescription.value.trim(), rate_usd };
        const { error } = await supabase.from('transactions').update(record).eq('id', id);
        if (error) throw error;
    }

    async function createSingleLogEntry(entryData) {
         elements.logSubmitBtn.textContent = `Gaunamas ${entryData.tokenKey.toUpperCase()} kursas...`;
         const rate_usd = await getPriceForDate(entryData.tokenKey, entryData.date);
         const record = { date: entryData.date, type: entryData.type, token: entryData.tokenKey, token_amount: entryData.tokenAmount, category: entryData.category, description: entryData.description, rate_usd };
         const { error } = await supabase.from('transactions').insert([record]).select();
         if (error) throw error;
    }
    
    async function handleLogTableClick(event) {
        const target = event.target;
        const row = target.closest('tr');
        if (!row || !row.dataset.id) return;
        const entryId = parseInt(row.dataset.id);
        if (target.matches('.btn-delete')) {
            if (confirm('Ar tikrai norite ištrinti šį įrašą?')) {
                const { error } = await supabase.from('transactions').delete().eq('id', entryId);
                if(error) alert(`Klaida trinant: ${error.message}`);
                else await loadAndRenderLogTable();
            }
        } else if (target.matches('.btn-edit')) {
            const { data, error } = await supabase.from('transactions').select().eq('id', entryId).single();
            if (error) { alert(`Klaida gaunant įrašą: ${error.message}`); return; }
            startEditEntry(data);
        }
    }

    function startEditEntry(entry) {
        if (!entry) return;
        if (entry.category === 'Minting') { alert("Mintinimo įrašų redagavimas nepalaikomas. Ištrinkite ir sukurkite naują."); return; }
        resetLogForm(); 
        elements.logForm.dataset.editingId = entry.id;
        elements.logForm.dataset.oldEntry = JSON.stringify(entry);
        elements.logDate.value = entry.date;
        elements.logType.value = entry.type;
        document.querySelector(`input[name="logToken"][value="${entry.token}"]`).checked = true;
        updateCategoryDropdown(); 
        elements.logCategory.value = entry.category;
        handleCategoryChange(); 
        elements.logTokenAmount.value = entry.token_amount;
        elements.logDescription.value = entry.description;
        elements.editFields.classList.remove('hidden');
        elements.editRateUsd.value = entry.rate_usd.toFixed(5);
        elements.editAmountUsd.value = (entry.token_amount * entry.rate_usd).toFixed(2);
        elements.logSubmitBtn.textContent = 'Atnaujinti įrašą';
        elements.logSubmitBtn.style.backgroundColor = '#2563eb';
        elements.logSubmitBtn.disabled = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetLogForm() {
        elements.logForm.reset();
        delete elements.logForm.dataset.editingId;
        delete elements.logForm.dataset.oldEntry;
        elements.editFields.classList.add('hidden');
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        elements.logDate.value = today.toISOString().split('T')[0];
        updateCategoryDropdown();
        handleCategoryChange();
        if(document.querySelector('input[name="logToken"]')) { document.querySelector('input[name="logToken"]').checked = true; }
        elements.logSubmitBtn.textContent = 'Pridėti įrašą';
        elements.logSubmitBtn.style.backgroundColor = '';
        elements.logSubmitBtn.disabled = false;
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

    function populateDropdowns() {
        elements.logTokenRadioGroup.innerHTML = LOGGER_TOKEN_KEYS.map((key, index) => {
            const token = ALL_TOKENS_CONFIG[key];
            return `<label class="radio-label"><span>${token.symbol.split(' ')[0]}</span><input type="radio" name="logToken" value="${key}" ${index === 0 ? 'checked' : ''}><span class="radio-custom-dot"></span></label>`;
        }).join('');
        elements.filterToken.innerHTML = '<option value="">Visi</option>' + LOGGER_TOKEN_KEYS.map(key => `<option value="${key}">${ALL_TOKENS_CONFIG[key].symbol}</option>`).join('');
    }

    // ========================================================
    // KRITINIS PATAISYMAS ČIA
    // ========================================================
    function updateCategoryDropdown() {
        const type = elements.logType.value;
        const selectedTokenRadio = document.querySelector('input[name="logToken"]:checked');
        
        // Ši eilutė apsaugo kodą nuo "užlūžimo" pradinio krovimo metu.
        // Jei radio mygtukai dar neegzistuoja, funkcija tiesiog nieko nedaro.
        if (!selectedTokenRadio) return; 
        
        const selectedToken = selectedTokenRadio.value;
        let categories = CATEGORIES[type] || {};
        if (type === 'income') {
            categories = Object.fromEntries(Object.entries(categories).filter(([key]) => {
                if (key === 'GGT Earnings') return selectedToken === 'ggt';
                if (key === 'GST Earnings') return selectedToken === 'gst';
                if (key === 'Sneaker Sale') return selectedToken === 'gmt';
                return true;
            }));
        }
        const currentCategory = elements.logCategory.value;
        elements.logCategory.innerHTML = Object.entries(categories).map(([key, value]) => `<option value="${key}">${value}</option>`).join('');
        if (categories[currentCategory]) { elements.logCategory.value = currentCategory; }
        handleCategoryChange();
    }
    // ========================================================
    // PATAISYMO PABAIGA
    // ========================================================

    function handleCategoryChange() {
        const category = elements.logCategory.value;
        const isMinting = category === 'Minting';
        elements.mintingFields.classList.toggle('hidden', !isMinting);
        if (!elements.logForm.dataset.editingId) {
            elements.standardFields.classList.toggle('hidden', isMinting);
        }
    }
    
    function handleTokenChange() { updateCategoryDropdown(); }
    
    function generateConverterCards() {
        const allTokens = [ { key: 'usd', symbol: 'USD', apiId: 'usd', fixedPrice: 1.0 }, ...Object.values(ALL_TOKENS_CONFIG) ].filter((v,i,a)=>a.findIndex(t=>(t.apiId === v.apiId))===i); 
        let html = '';
        allTokens.forEach(token => { html += `<div class="converter-card" id="card-${token.apiId}"><div class="converter-card-header"><span class="converter-card-title">${token.symbol}</span><button class="converter-card-update-btn" data-api-id="${token.apiId}">Atnaujinti</button></div><div class="converter-card-price-wrapper"><div class="converter-card-price" id="price-${token.apiId}">$0.00000</div><div class="price-change" id="change-${token.apiId}"></div></div><div class="input-group"><label for="amount-${token.apiId}" class="text-xs">Kiekis:</label><input type="number" id="amount-${token.apiId}" data-api-id="${token.apiId}" class="converter-amount-input" placeholder="0.00"></div><div class="input-group"><label for="value-${token.apiId}" class="text-xs">Vertė USD:</label><input type="number" id="value-${token.apiId}" class="converter-value-input" placeholder="0.00"></div><div class="update-time" id="time-${token.apiId}"></div></div>`; });
        elements['converter-grid'].innerHTML = html;
    }

    function handleConverterInput(event) {
        const input = event.target; const value = parseFloat(input.value);
        if(isNaN(value)) { document.querySelectorAll('.converter-amount-input, .converter-value-input').forEach(i => { if(i !== input) i.value = ''; }); return; }
        let usdValue;
        if(input.classList.contains('converter-amount-input')) {
            const apiId = input.dataset.apiId; const price = liveTokenPrices[apiId]?.price || 0; usdValue = value * price;
        } else { usdValue = value; }
        document.querySelectorAll('.converter-card').forEach(card => {
            const cardApiId = card.id.replace('card-', ''); const price = liveTokenPrices[cardApiId]?.price || 0;
            const valueInput = card.querySelector('.converter-value-input'); const amountInput = card.querySelector('.converter-amount-input');
            if (input !== valueInput) valueInput.value = usdValue.toFixed(2);
            if (input !== amountInput && price > 0) amountInput.value = (usdValue / price).toFixed(6);
        });
    }
    
    async function handleConverterClick(event) {
        if (event.target.classList.contains('converter-card-update-btn')) {
            const apiId = event.target.dataset.apiId;
            await fetchLiveTokenPrices(false, apiId);
        }
    }
    
    async function getPriceForDate(tokenKey, dateString) {
        const config = ALL_TOKENS_CONFIG[tokenKey]; if (!config) throw new Error("Nežinomas žetonas"); if (config.fixedPrice) return config.fixedPrice;
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
        if(fetchAll) { tokenApiIds = [...new Set(Object.values(ALL_TOKENS_CONFIG).map(t => t.apiId).filter(id => id && id !== 'usd'))];
        } else if (singleApiId) { tokenApiIds = [singleApiId]; } else { return; }
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${tokenApiIds.join(',')}&vs_currencies=usd&include_24hr_change=true`);
            if (!response.ok) throw new Error(`API klaida: ${response.statusText}`);
            const data = await response.json();
            liveTokenPrices['usd'] = { price: 1, change: 0 };
            for (const apiId in data) { liveTokenPrices[apiId] = { price: data[apiId].usd, change: data[apiId].usd_24h_change || 0 }; }
            updateConverterPricesUI();
        } catch (error) { console.error("Klaida gaunant realaus laiko kainas:", error); }
    }

    async function loadAndRenderLogTable() {
        let query = supabase.from('transactions').select('*');
        if (elements.filterStartDate.value) query = query.gte('date', elements.filterStartDate.value);
        if (elements.filterEndDate.value) query = query.lte('date', elements.filterEndDate.value);
        if (elements.filterToken.value) query = query.eq('token', elements.filterToken.value);
        const sortOrder = elements.filterOrder.value === 'asc';
        const sortBy = elements.filterSort.value;
        query = query.order(sortBy, { ascending: sortOrder }).order('id', { ascending: false });
        const { data, error } = await query;
        if (error) { console.error('Klaida gaunant duomenis:', error); return; }
        renderLogTable(data);
    }

    function renderLogTable(data) {
        elements.logTableBody.innerHTML = ''; let totalIncomeUSD = 0, totalExpenseUSD = 0; const tokenBalances = {};
        data.forEach(entry => {
            const amount_usd = entry.token_amount * entry.rate_usd;
            const isIncome = entry.type === 'income';
            if (isIncome) totalIncomeUSD += amount_usd; else totalExpenseUSD += amount_usd;
            if (!tokenBalances[entry.token]) tokenBalances[entry.token] = 0;
            tokenBalances[entry.token] += isIncome ? entry.token_amount : -entry.token_amount;
            const row = document.createElement('tr'); row.dataset.id = entry.id;
            row.innerHTML = `<td>${entry.date}</td><td style="font-size: 1.25rem; text-align: center;" class="${isIncome ? 'income-color' : 'expense-color'}">${isIncome ? '▼' : '▲'}</td><td>${entry.token.toUpperCase()}</td><td>${(entry.token_amount || 0).toLocaleString('en-US', {maximumFractionDigits: 2})}</td><td>$${(entry.rate_usd || 0).toFixed(5)}</td><td>$${amount_usd.toFixed(2)}</td><td>${entry.description || ''}</td><td class="log-table-actions"><button class="btn-edit">Taisyti</button><button class="btn-delete">Trinti</button></td>`;
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

    function updateConverterPricesUI() {
         document.querySelectorAll('.converter-card').forEach(card => {
            const apiId = card.id.replace('card-', '');
            const priceData = liveTokenPrices[apiId];
            const priceEl = card.querySelector(`#price-${apiId}`);
            const changeEl = card.querySelector(`#change-${apiId}`);
            if (priceData && priceData.price) {
                priceEl.textContent = `$${priceData.price.toFixed(5)}`;
                const change = priceData.change;
                if (change > 0) {
                    changeEl.textContent = `▲ +${change.toFixed(2)}%`;
                    changeEl.classList.add('price-up'); changeEl.classList.remove('price-down');
                } else {
                    changeEl.textContent = `▼ ${change.toFixed(2)}%`;
                    changeEl.classList.add('price-down'); changeEl.classList.remove('price-up');
                }
            } else { priceEl.textContent = 'N/A'; changeEl.textContent = ''; }
            card.querySelector(`#time-${apiId}`).textContent = `Atnaujinta: ${new Date().toLocaleTimeString('lt-LT')}`;
         });
    }
    
    document.addEventListener('DOMContentLoaded', init);
})();
</script>
</body>
</html>
