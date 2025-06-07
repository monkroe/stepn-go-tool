// Failas: script.js
(function() {
    'use strict';

    // --- KONFIGŪRACIJA IR KONSTANTOS ---
    const SUPABASE_URL = 'https://zojhurhwmceoqxkatvkx.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpvamh1cmh3bWNlb3F4a2F0dmt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNjYxNDYsImV4cCI6MjA2NDc0MjE0Nn0.NFGhQc7H95U9vOaM7OVxNUgTuXSughz8ZuxaCLfbfQE';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const ALL_TOKENS_CONFIG = {
        'gmt': { key: 'gmt', symbol: 'GMT (STEPN)', apiId: 'stepn', historyApiId: 'stepn' },
        'ggt': { key: 'ggt', symbol: 'GGT (STEPN GO)', apiId: 'go-game-token', historyApiId: 'ggt' },
        'gst': { key: 'gst', symbol: 'GST (SOL)', apiId: 'green-satoshi-token', historyApiId: 'green-satoshi-token' },
        'sol': { key: 'sol', symbol: 'SOL (Solana)', apiId: 'solana', historyApiId: 'solana' },
        'btc': { key: 'btc', symbol: 'BTC', apiId: 'bitcoin', historyApiId: 'bitcoin' },
        'usdc': { key: 'usdc', symbol: 'USDC', apiId: 'usd-coin', historyApiId: 'usd-coin', fixedPrice: 1.0 },
    };
    const LOGGER_TOKEN_KEYS = ['ggt', 'gst', 'gmt', 'sol', 'usdc'];
    const CATEGORIES = {
        income: { "GGT Earnings": "GGT Uždarbis", "GST Earnings": "StepN OG Uždarbis", "Sneaker Sale": "Sportbačio pardavimas", "Other": "Kita" },
        expense: { "Sneaker Purchase": "Sportbačio pirkimas", "Sneaker Burn": "Sportbačio deginimas", "Level-up": "Lygio kėlimas", "Minting": "Mintinimas", "Other": "Kita" }
    };
    
    let liveTokenPrices = {};
    const elements = {};

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
        const ids = [
            'tab-btn-logger', 'tab-btn-converter', 'tab-content-logger', 'tab-content-converter',
            'logForm', 'logDate', 'logType', 'logCategory', 'standardFields', 'logTokenRadioGroup', 
            'logTokenAmount', 'mintingFields', 'mintGgtAmount', 'mintGmtAmount', 'logDescription', 
            'logSubmitBtn', 'logTableBody', 'summaryContainer', 'converter-grid', 'filterStartDate', 
            'filterEndDate', 'filterToken', 'filterSort', 'filterOrder', 'filterBtn', 'editFields', 
            'editRateUsd', 'editAmountUsd', 'editingId', 'notification-banner'
        ];
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

    // ===================================================================
    //  ČIA YRA PAGRINDINIS PATAISYMAS
    // ===================================================================
    function updateCategoryDropdown() {
        const type = elements.logType.value;

        // PATAISYMAS: Jei tipas nepasirinktas (reikšmė tuščia), 
        // nustatome pradinę kategorijos laukelio būseną ir nieko toliau nedarome.
        if (!type) {
            elements.logCategory.innerHTML = `<option value="" disabled selected>Pirmiausia pasirinkite tipą...</option>`;
            handleCategoryChange(); // Iškviečiame, kad teisingai parodytų/paslėptų laukus
            return; // Sustabdome funkcijos vykdymą
        }

        // Ši logika įvyks tik tada, kai bus pasirinktas validus tipas ("income" arba "expense")
        const selectedTokenRadio = document.querySelector('input[name="logToken"]:checked');
        const selectedToken = selectedTokenRadio ? selectedTokenRadio.value : LOGGER_TOKEN_KEYS[0];
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
        // Pridedame pradinę "placeholder" parinktį
        elements.logCategory.innerHTML = `<option value="" disabled selected>Pasirinkite kategoriją...</option>` + 
            Object.entries(categories).map(([key, value]) => `<option value="${key}">${value}</option>`).join('');

        if (categories[currentCategory]) {
            elements.logCategory.value = currentCategory;
        }
        handleCategoryChange();
    }
    // ===================================================================
    // PATAISYMO PABAIGA
    // ===================================================================

    // ... likęs kodas nepakeistas ...

    function switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-button').forEach(el => el.classList.remove('active'));
        document.getElementById(`tab-content-${tabName}`).classList.add('active');
        document.getElementById(`tab-btn-${tabName}`).classList.add('active');
    }

    let notificationTimeout;
    function showNotification(message, type = 'error') {
        const banner = elements['notification-banner'];
        if (!banner) return;
        clearTimeout(notificationTimeout);
        banner.textContent = message;
        banner.className = `notification ${type}`;
        
        notificationTimeout = setTimeout(() => {
            banner.classList.add('hidden');
        }, 5000);
    }
    
    async function handleLogSubmit(event) {
        event.preventDefault();
        const editingId = elements.editingId.value;
        elements.logSubmitBtn.disabled = true;
        elements.logSubmitBtn.textContent = 'Apdorojama...';

        try {
            if (editingId) {
                await handleUpdate(editingId);
                showNotification('Įrašas sėkmingai atnaujintas!', 'success');
            } else {
                await handleCreate();
                showNotification('Naujas įrašas sėkmingai pridėtas!', 'success');
            }
            await loadAndRenderLogTable();
        } catch (error) {
            console.error("Submit error:", error);
            showNotification(`Klaida: ${error.message}`, 'error');
        } finally {
            resetLogForm();
        }
    }

    function resetLogForm() {
        elements.logForm.reset();
        elements.editingId.value = '';
        elements.editFields.classList.add('hidden');
        
        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        elements.logDate.value = today.toISOString().split('T')[0];
        
        updateCategoryDropdown();
        
        const firstTokenRadio = document.querySelector('input[name="logToken"]');
        if (firstTokenRadio) firstTokenRadio.checked = true;
        
        elements.logSubmitBtn.textContent = 'Pridėti įrašą';
        elements.logSubmitBtn.style.backgroundColor = '';
        elements.logSubmitBtn.disabled = false;
    }
    
    function populateDropdowns() {
        elements.logTokenRadioGroup.innerHTML = LOGGER_TOKEN_KEYS.map((key, index) => {
            const token = ALL_TOKENS_CONFIG[key];
            return `<label class="radio-label"><span>${token.symbol.split(' ')[0]}</span><input type="radio" name="logToken" value="${key}" ${index === 0 ? 'checked' : ''}><span class="radio-custom-dot"></span></label>`;
        }).join('');
        elements.filterToken.innerHTML = '<option value="">Visi</option>' + LOGGER_TOKEN_KEYS.map(key => `<option value="${key}">${ALL_TOKENS_CONFIG[key].symbol}</option>`).join('');
    }

    function handleCategoryChange() {
        const category = elements.logCategory.value;
        const isMinting = category === 'Minting';
        elements.mintingFields.classList.toggle('hidden', !isMinting);
        if (!elements.editingId.value) {
            elements.standardFields.classList.toggle('hidden', isMinting);
        }
    }

    function handleTokenChange() { updateCategoryDropdown(); }
    
    async function createSingleLogEntry(entryData) {
        showNotification(`Gaunamas ${entryData.tokenKey.toUpperCase()} kursas...`, 'info');
        const rate_usd = await getPriceForDate(entryData.tokenKey, entryData.date);
        const record = { date: entryData.date, type: entryData.type, token: entryData.tokenKey, token_amount: entryData.tokenAmount, category: entryData.category, description: entryData.description, rate_usd };
        const { error } = await supabase.from('transactions').insert([record]).select();
        if (error) throw error;
    }

    async function handleCreate() {
        const category = elements.logCategory.value;
        const date = elements.logDate.value;
        const type = elements.logType.value;
        const description = elements.logDescription.value.trim();

        if (!type || !category) {
            throw new Error("Prašome pasirinkti tipą ir kategoriją.");
        }

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

    async function loadAndRenderLogTable() {
        let query = supabase.from('transactions').select('*');
        if (elements.filterStartDate.value) query = query.gte('date', elements.filterStartDate.value);
        if (elements.filterEndDate.value) query = query.lte('date', elements.filterEndDate.value);
        if (elements.filterToken.value) query = query.eq('token', elements.filterToken.value);
        const sortOrder = elements.filterOrder.value === 'asc';
        const sortBy = elements.filterSort.value;
        query = query.order(sortBy, { ascending: sortOrder }).order('id', { ascending: false });
        const { data, error } = await query;
        if (error) { console.error('Klaida gaunant duomenis:', error); showNotification(`Duomenų bazės klaida: ${error.message}`); return; }
        renderLogTable(data);
    }
    
    function renderLogTable(data) {
        elements.logTableBody.innerHTML = '';
        if (!data || data.length === 0) {
            elements.logTableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4">Įrašų nerasta.</td></tr>`;
            renderSummary({ totalIncomeUSD: 0, totalExpenseUSD: 0, netBalanceUSD: 0, tokenBalances: {} });
            return;
        }
    
        const summaryData = calculateSummaryData(data);
    
        data.forEach(entry => {
            const amount_usd = entry.token_amount * entry.rate_usd;
            const isIncome = entry.type === 'income';
            const row = document.createElement('tr');
            row.dataset.id = entry.id;
            row.innerHTML = `
                <td>${entry.date}</td>
                <td style="font-size: 1.25rem; text-align: center;" class="${isIncome ? 'income-color' : 'expense-color'}">${isIncome ? '▼' : '▲'}</td>
                <td>${entry.token.toUpperCase()}</td>
                <td>${(entry.token_amount || 0).toLocaleString('en-US', {maximumFractionDigits: 2})}</td>
                <td>$${(entry.rate_usd || 0).toFixed(5)}</td>
                <td>$${amount_usd.toFixed(2)}</td>
                <td>${entry.description || ''}</td>
                <td class="log-table-actions">
                    <button class="btn-edit">Taisyti</button>
                    <button class="btn-delete">Trinti</button>
                </td>`;
            elements.logTableBody.appendChild(row);
        });
    
        renderSummary(summaryData);
    }
    
    function calculateSummaryData(data) {
        let totalIncomeUSD = 0, totalExpenseUSD = 0;
        const tokenBalances = {};
    
        data.forEach(entry => {
            const amount_usd = entry.token_amount * entry.rate_usd;
            const isIncome = entry.type === 'income';
    
            if (isIncome) totalIncomeUSD += amount_usd;
            else totalExpenseUSD += amount_usd;
    
            if (!tokenBalances[entry.token]) tokenBalances[entry.token] = 0;
            tokenBalances[entry.token] += isIncome ? entry.token_amount : -entry.token_amount;
        });
    
        return {
            totalIncomeUSD,
            totalExpenseUSD,
            netBalanceUSD: totalIncomeUSD - totalExpenseUSD,
            tokenBalances
        };
    }
    
    function renderSummary({ totalIncomeUSD, totalExpenseUSD, netBalanceUSD, tokenBalances }) {
        const btcPrice = liveTokenPrices['bitcoin']?.price;
        let btcValueHTML = '';
        if (btcPrice > 0) {
            const btcValue = netBalanceUSD / btcPrice;
            btcValueHTML = `
                <div class="summary-row">
                    <span class="summary-label btc-value">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left-right" viewBox="0 0 16 16" aria-hidden="true">
                            <path fill-rule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/>
                        </svg> BTC Atitikmuo:
                    </span>
                    <span class="summary-value btc-value">${btcValue.toFixed(8)} BTC</span>
                </div>`;
        }
    
        let tokenBalancesHTML = '<hr class="my-4 border-gray-700"><h3 class="text-lg font-semibold mb-2">Žetonų Balansai</h3>';
        Object.keys(tokenBalances).sort().forEach(token => {
            const amount = tokenBalances[token];
            tokenBalancesHTML += `
                <div class="summary-row">
                    <span class="summary-label">${token.toUpperCase()} Balansas:</span>
                    <span class="summary-value ${amount >= 0 ? 'income-color' : 'expense-color'}">${amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 4})}</span>
                </div>`;
        });
        
        elements.summaryContainer.innerHTML = `
            <h3 class="text-lg font-semibold mb-2">Bendra suvestinė (pagal filtrus)</h3>
            <div class="summary-row">
                <span class="summary-label">Viso Pajamų (USD):</span>
                <span class="summary-value income-color">$${totalIncomeUSD.toFixed(2)}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Viso Išlaidų (USD):</span>
                <span class="summary-value expense-color">$${totalExpenseUSD.toFixed(2)}</span>
            </div>
            <div class="summary-row text-lg border-t border-gray-700 mt-2 pt-2">
                <strong class="summary-label">Grynasis Balansas (USD):</strong>
                <strong class="summary-value ${netBalanceUSD >= 0 ? 'income-color' : 'expense-color'}">$${netBalanceUSD.toFixed(2)}</strong>
            </div>
            ${btcValueHTML}
            ${Object.keys(tokenBalances).length > 0 ? tokenBalancesHTML : ''}`;
    }

    // Čia toliau eina likusios funkcijos, kurios nepakito.
    // Dėl aiškumo jų nekartoju, bet jos turi būti jūsų faile.
    // ...handleUpdate, startEditEntry, handleLogTableClick, getPriceForDate ir t.t...

    document.addEventListener('DOMContentLoaded', init);
})();
