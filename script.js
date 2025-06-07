// Failas: script.js
(function() {
    'use strict';

    // --- KONFIGŪRACIJA IR KONSTANTOS ---

    // SVARBU: Šis 'anon' raktas yra viešas ir saugus naudoti kliento pusėje, 
    // JEIGU Supabase projekte yra teisingai sukonfigūruotas Row Level Security (RLS).
    // Be RLS, bet kas galės skaityti/rašyti jūsų duomenų bazę.
    const SUPABASE_URL = 'https://zojhurhwmceoqxkatvkx.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpvamh1cmh3bWNlb3F4a2F0dmt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNjYxNDYsImV4cCI6MjA2NDc0MjE0Nn0.NFGhQc7H95U9vOaM7OVxNUgTuXSughz8ZuxaCLfbfQE';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Žetonų konfigūracija.
    // 'apiId' naudojamas dabartinei kainai gauti per 'simple/price' endpoint.
    // 'historyApiId' naudojamas istorinei kainai gauti per 'coins/{id}/history' endpoint.
    // Kartais jie gali skirtis (pvz. GGT).
    const ALL_TOKENS_CONFIG = {
        'gmt': { key: 'gmt', symbol: 'GMT (STEPN)', apiId: 'stepn', historyApiId: 'stepn' },
        'ggt': { key: 'ggt', symbol: 'GGT (STEPN GO)', apiId: 'go-game-token', historyApiId: 'ggt' },
        'gst': { key: 'gst', symbol: 'GST (SOL)', apiId: 'green-satoshi-token', historyApiId: 'green-satoshi-token' },
        'sol': { key: 'sol', symbol: 'SOL (Solana)', apiId: 'solana', historyApiId: 'solana' },
        'btc': { key: 'btc', symbol: 'BTC', apiId: 'bitcoin', historyApiId: 'bitcoin' },
        'usdc': { key: 'usdc', symbol: 'USDC', apiId: 'usd-coin', historyApiId: 'usd-coin', fixedPrice: 1.0 },
        // ... galima pridėti daugiau
    };
    const LOGGER_TOKEN_KEYS = ['ggt', 'gst', 'gmt', 'sol', 'usdc'];
    const CATEGORIES = {
        income: { "GGT Earnings": "GGT Uždarbis", "GST Earnings": "StepN OG Uždarbis", "Sneaker Sale": "Sportbačio pardavimas", "Other": "Kita" },
        expense: { "Sneaker Purchase": "Sportbačio pirkimas", "Sneaker Burn": "Sportbačio deginimas", "Level-up": "Lygio kėlimas", "Minting": "Mintinimas", "Other": "Kita" }
    };
    
    // Būsenos kintamieji
    let liveTokenPrices = {};
    const elements = {}; // DOM elementų talpykla

    // --- INICIALIZACIJA ---

    /**
     * Pagrindinė programos paleidimo funkcija.
     */
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

    /**
     * Surenka visus reikalingus DOM elementus į 'elements' objektą greitesnei prieigai.
     */
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

    /**
     * Susieja įvykių klausiklius su DOM elementais.
     */
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

    // --- UI VALDYMAS (TABS, PRANEŠIMAI, FORMOS) ---

    function switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-button').forEach(el => el.classList.remove('active'));
        document.getElementById(`tab-content-${tabName}`).classList.add('active');
        document.getElementById(`tab-btn-${tabName}`).classList.add('active');
    }

    let notificationTimeout;
    /**
     * Rodo pranešimą vartotojui.
     * @param {string} message - Rodoma žinutė.
     * @param {'success'|'error'|'info'} type - Pranešimo tipas.
     */
    function showNotification(message, type = 'error') {
        const banner = elements['notification-banner'];
        clearTimeout(notificationTimeout);
        banner.textContent = message;
        banner.className = `notification ${type}`; // Nuima 'hidden'
        
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
        handleCategoryChange();
        
        const firstTokenRadio = document.querySelector('input[name="logToken"]');
        if (firstTokenRadio) firstTokenRadio.checked = true;
        
        elements.logSubmitBtn.textContent = 'Pridėti įrašą';
        elements.logSubmitBtn.style.backgroundColor = '';
        elements.logSubmitBtn.disabled = false;
    }

    // ... (visos kitos funkcijos lieka labai panašios)

    // Toliau pateikiu tik labiausiai pakeistas arba svarbias funkcijas iš likusio kodo.
    // Dauguma logikos lieka tokia pati, tik dabar naudojama `showNotification` vietoje `alert`.

    async function handleUpdate(id) {
        const newDate = elements.logDate.value;
        const newAmount = parseFloat(elements.logTokenAmount.value);
        const newToken = document.querySelector('input[name="logToken"]:checked').value;
        const oldEntry = JSON.parse(elements.logForm.dataset.oldEntry);
        
        let rate_usd = parseFloat(elements.editRateUsd.value);
        if (isNaN(rate_usd)) throw new Error("Neteisingas kursas.");

        if (newDate !== oldEntry.date || newToken !== oldEntry.token) {
             showNotification(`Gaunamas ${newToken.toUpperCase()} kursas datai ${newDate}...`, 'info');
             rate_usd = await getPriceForDate(newToken, newDate);
        }
        
        const record = { date: newDate, type: elements.logType.value, token: newToken, token_amount: newAmount, category: elements.logCategory.value, description: elements.logDescription.value.trim(), rate_usd };
        const { error } = await supabase.from('transactions').update(record).eq('id', id);
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
                if (error) {
                    showNotification(`Klaida trinant: ${error.message}`, 'error');
                } else {
                    showNotification('Įrašas ištrintas.', 'success');
                    await loadAndRenderLogTable();
                }
            }
        } else if (target.matches('.btn-edit')) {
            const { data, error } = await supabase.from('transactions').select().eq('id', entryId).single();
            if (error) {
                showNotification(`Klaida gaunant įrašą: ${error.message}`, 'error');
                return;
            }
            startEditEntry(data);
        }
    }

    function startEditEntry(entry) {
        if (!entry) return;
        if (entry.category === 'Minting') {
            showNotification("Mintinimo įrašų redagavimas nepalaikomas. Ištrinkite ir sukurkite naują.", 'info');
            return;
        }

        resetLogForm();
        elements.editingId.value = entry.id;
        elements.logForm.dataset.oldEntry = JSON.stringify(entry); // Išsaugom senus duomenis palyginimui

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

    async function getPriceForDate(tokenKey, dateString) {
        const config = ALL_TOKENS_CONFIG[tokenKey];
        if (!config) throw new Error(`Nežinomas žetonas: ${tokenKey}`);
        if (config.fixedPrice) return config.fixedPrice;

        const today = new Date();
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        if (dateString >= today.toISOString().split('T')[0] && liveTokenPrices[config.apiId]) {
            return liveTokenPrices[config.apiId].price;
        }

        const [year, month, day] = dateString.split('-');
        const apiDate = `${day}-${month}-${year}`;
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/coins/${config.historyApiId}/history?date=${apiDate}`);
            if (!response.ok) throw new Error(`CoinGecko API klaida (${response.status})`);
            
            const data = await response.json();
            if (data.market_data?.current_price?.usd) {
                return data.market_data.current_price.usd;
            }

            // Fallback: jei istorinė kaina nerasta, bandoma gauti dabartinę.
            showNotification(`Dėmesio: Nepavyko gauti istorinio ${config.symbol.toUpperCase()} kurso. Naudojamas dabartinis kursas.`, 'info');
            if (Object.keys(liveTokenPrices).length === 0) await fetchLiveTokenPrices(true);
            const currentPrice = liveTokenPrices[config.apiId]?.price;
            if (currentPrice) return currentPrice;

            throw new Error(`Neįmanoma gauti kainos ${config.symbol} žetonui.`);
        } catch (error) {
            console.error("Klaida gaunant istorinę kainą:", error);
            throw error;
        }
    }

    // Likusios funkcijos lieka beveik identiškos originalui.
    // ... createSingleLogEntry, handleCreate, populateDropdowns, updateCategoryDropdown, handleCategoryChange, 
    // ... handleTokenChange, generateConverterCards, handleConverterInput, handleConverterClick,
    // ... fetchLiveTokenPrices, loadAndRenderLogTable, renderLogTable, renderSummary, updateConverterPricesUI ...

    // Pavyzdys, kaip atrodytų renderLogTable ir renderSummary:
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

    // Likusi dalis kodo yra nepakeista, tiesiog ją reikia įklijuoti čia...

    document.addEventListener('DOMContentLoaded', init);
})();