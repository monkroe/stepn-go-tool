// Failas: converter.js (Grąžinta sena, patikima "laukimo" logika)
(function() {
    'use strict';

    let elements = {};
    let liveTokenPrices, ALL_TOKENS_CONFIG;

    // Pridedame TIK update funkciją, kurios reikia script.js
    window.appActions = window.appActions || {};
    window.appActions.updateConverterUI = updateConverterPricesUI;

    function initConverter() {
        // Pasiimame duomenis iš globalaus objekto
        ALL_TOKENS_CONFIG = window.appData.tokens;
        liveTokenPrices = window.appData.prices;
        
        cacheConverterElements();
        bindConverterEventListeners();
        generateConverterCards();
        updateConverterPricesUI();
    }

    // --- VISAS KITAS KODAS IKI PAT PABAIGOS LIEKA TOKS PATS ---
    
    function cacheConverterElements() { /* ... nekeista ... */ }
    function bindConverterEventListeners() { /* ... nekeista ... */ }

    function generateConverterCards() {
        if (!elements['converter-grid']) return;
        
        // --- PATAISYMAS: imame VISUS duomenis iš konfigūracijos, įskaitant USD ---
        const tokensToDisplay = Object.values(ALL_TOKENS_CONFIG);
        
        let html = '';
        tokensToDisplay.forEach(token => {
            const id = token.apiId || token.key;
            html += `
                <div class="converter-card" id="card-${id}">
                    <div class="converter-card-header">
                        <span class="converter-card-title">
                            <img src="${token.logo}" alt="${token.symbol}" class="token-logo">
                            ${token.symbol}
                        </span>
                        <button class="converter-card-update-btn" data-api-id="${token.apiId}">Atnaujinti</button>
                    </div>
                    <div class="converter-card-price-wrapper">
                        <div class="converter-card-price" id="price-${id}">$0.00000</div>
                        <div class="price-change" id="change-${id}"></div>
                    </div>
                    <div class="input-group">
                        <label for="amount-${id}" class="text-xs">Kiekis:</label>
                        <input type="number" id="amount-${id}" data-api-id="${id}" class="converter-amount-input" placeholder="0.00">
                    </div>
                    <div class="input-group">
                        <label for="value-${id}" class="text-xs">Vertė USD:</label>
                        <input type="number" id="value-${id}" class="converter-value-input" placeholder="0.00">
                    </div>
                    <div class="update-time" id="time-${id}"></div>
                </div>`;
        });
        elements['converter-grid'].innerHTML = html;
    }

    function updateConverterPricesUI() { /* ... nekeista ... */ }
    function handleConverterInput(event) { /* ... nekeista ... */ }
    async function handleConverterClick(event) { /* ... nekeista ... */ }

    // --- SVARBIAUSIA DALIS: Grąžiname seną, patikimą "laukimo" logiką ---
    function tryInit() {
        if (window.appData && window.appData.tokens && window.appData.prices) {
            initConverter();
        } else {
            setTimeout(tryInit, 100); // Bandom iš naujo po 100ms
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInit);
    } else {
        tryInit();
    }

})();
