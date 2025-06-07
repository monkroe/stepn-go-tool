// Failas: converter.js (Atsakingas tik už konverterį)
(function() {
    'use strict';

    let elements = {};
    let liveTokenPrices, ALL_TOKENS_CONFIG;

    window.appActions = window.appActions || {};
    window.appActions.updateConverterUI = updateConverterPricesUI;

    function initConverter() {
        if (window.appData && window.appData.tokens && window.appData.prices) {
            ALL_TOKENS_CONFIG = window.appData.tokens;
            liveTokenPrices = window.appData.prices;
            cacheConverterElements();
            bindConverterEventListeners();
            generateConverterCards();
            updateConverterPricesUI();
        } else {
            setTimeout(initConverter, 100);
        }
    }

    function cacheConverterElements() {
        const ids = ['converter-grid'];
        ids.forEach(id => {
            if (document.getElementById(id)) {
                elements[id] = document.getElementById(id);
            }
        });
    }

    function bindConverterEventListeners() {
        if (elements['converter-grid']) {
            elements['converter-grid'].addEventListener('input', handleConverterInput);
            elements['converter-grid'].addEventListener('click', handleConverterClick);
        }
    }

    function generateConverterCards() {
        if (!elements['converter-grid']) return;
        const tokenKeys = Object.keys(ALL_TOKENS_CONFIG);
        const tokensToDisplay = [ { key: 'usd', symbol: 'USD', apiId: 'usd', fixedPrice: 1.0 }, ...tokenKeys.map(k => ALL_TOKENS_CONFIG[k]).filter(t => t)];
        let html = '';
        tokensToDisplay.forEach(token => {
            html += `
                <div class="converter-card" id="card-${token.apiId}">
                    <div class="converter-card-header">
                        <span class="converter-card-title">${token.symbol}</span>
                        <button class="converter-card-update-btn" data-api-id="${token.apiId}">Atnaujinti</button>
                    </div>
                    <div class="converter-card-price-wrapper">
                        <div class="converter-card-price" id="price-${token.apiId}">$0.00000</div>
                        <div class="price-change" id="change-${token.apiId}"></div>
                    </div>
                    <div class="input-group">
                        <label for="amount-${token.apiId}" class="text-xs">Kiekis:</label>
                        <input type="number" id="amount-${token.apiId}" data-api-id="${token.apiId}" class="converter-amount-input" placeholder="0.00">
                    </div>
                    <div class="input-group">
                        <label for="value-${token.apiId}" class="text-xs">Vertė USD:</label>
                        <input type="number" id="value-${token.apiId}" class="converter-value-input" placeholder="0.00">
                    </div>
                    <div class="update-time" id="time-${token.apiId}"></div>
                </div>`;
        });
        elements['converter-grid'].innerHTML = html;
    }
    
    function updateConverterPricesUI() {
         liveTokenPrices = window.appData.prices;
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
        if (isNaN(value)) {
            document.querySelectorAll('.converter-amount-input, .converter-value-input').forEach(i => { if (i !== input) i.value = ''; });
            return;
        }
        let usdValue;
        if (input.classList.contains('converter-amount-input')) {
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

    async function handleConverterClick(event) {
        if (event.target.classList.contains('converter-card-update-btn')) {
            const apiId = event.target.dataset.apiId;
            if (window.appActions && typeof window.appActions.fetchPrices === 'function') {
                event.target.textContent = '...';
                await window.appActions.fetchPrices(false, apiId);
                event.target.textContent = 'Atnaujinti';
                updateConverterPricesUI();
            }
        }
    }
    
    // Šis scenarijus laukia, kol bus įkeltas pagrindinis `script.js` ir `DOMContentLoaded`
    initConverter();

})();
