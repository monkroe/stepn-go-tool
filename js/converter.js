// Failas: js/converter.js (Versija be Fiat USD ir su teisingu formatavimu)

(function() {
    'use strict';

    let elements = {};
    let liveTokenPrices, ALL_TOKENS_CONFIG;

    window.appActions = window.appActions || {};
    window.appActions.updateConverterUI = updateConverterPricesUI;
    window.appActions.initConverter = initConverter;

    function initConverter() {
        try {
            if (!window.appData?.tokens || !window.appData?.prices) {
                setTimeout(initConverter, 100);
                return;
            }
            ALL_TOKENS_CONFIG = window.appData.tokens;
            liveTokenPrices = window.appData.prices;
            
            cacheConverterElements();
            bindConverterEventListeners();
            generateConverterCards();
            updateConverterPricesUI();
        } catch (error) {
            console.error('Failed to initialize converter:', error);
        }
    }

    function cacheConverterElements() {
        const grid = document.getElementById('converter-grid');
        if (grid) elements['converter-grid'] = grid;
    }

    function bindConverterEventListeners() {
        if (elements['converter-grid']) {
            elements['converter-grid'].addEventListener('input', handleConverterInput);
            elements['converter-grid'].addEventListener('click', handleConverterClick);
        }
    }

    function generateConverterCards() {
        if (!elements['converter-grid']) return;
        
        const displayOrder = [
            'gmt', 'ggt', 'gst', 
            'btc', 'sol', 'bnb', 'ada', 'ton', 'ltc', 'kas', 'xlm', 'cro', 'pol',
            'usdc', 'usdt'
        ];

        const tokensToDisplay = Object.values(ALL_TOKENS_CONFIG);

        tokensToDisplay.sort((a, b) => {
            const indexA = displayOrder.indexOf(a.key);
            const indexB = displayOrder.indexOf(b.key);

            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            
            return indexA - indexB;
        });
        
        const html = tokensToDisplay.map(token => createTokenCardHTML(token)).join('');
        elements['converter-grid'].innerHTML = html;
    }

    function createTokenCardHTML(token) {
        const cardId = token.key;
        return `
            <div class="converter-card" id="card-${cardId}">
                <div class="converter-card-header">
                    <span class="converter-card-title">
                        <img src="${token.logo}" alt="${token.symbol}" class="token-logo" onerror="this.style.display='none'">
                        ${token.symbol}
                    </span>
                    <button class="converter-card-update-btn" data-token-key="${cardId}" ${token.fixedPrice ? 'disabled title="Kaina fiksuota"' : ''}>
                        Atnaujinti
                    </button>
                </div>
                <div class="converter-card-price-wrapper">
                    <div class="converter-card-price" id="price-${cardId}">$0.00</div>
                    <div class="price-change" id="change-${cardId}"></div>
                </div>
                <div class="input-group">
                    <label for="amount-${cardId}" class="text-xs">Kiekis:</label>
                    <input type="number" id="amount-${cardId}" data-token-key="${cardId}" class="converter-amount-input" placeholder="0.00" step="any" min="0">
                </div>
                <div class="input-group">
                    <label for="value-${cardId}" class="text-xs">Vertė USD:</label>
                    <input type="number" id="value-${cardId}" class="converter-value-input" data-token-key="${cardId}" placeholder="0.00" step="any" min="0">
                </div>
                <div class="update-time" id="time-${cardId}"></div>
            </div>`;
    }
    
    function updateConverterPricesUI() {
        if (!window.appData?.prices) return;
        liveTokenPrices = window.appData.prices;
        document.querySelectorAll('.converter-card').forEach(card => {
            const tokenKey = card.id.replace('card-', '');
            updateSingleCardPrice(card, tokenKey);
        });
    }

    function updateSingleCardPrice(card, tokenKey) {
        const tokenConfig = ALL_TOKENS_CONFIG[tokenKey];
        if (!tokenConfig) return;

        const priceData = liveTokenPrices[tokenConfig.apiId];
        const priceEl = card.querySelector(`#price-${tokenKey}`);
        const changeEl = card.querySelector(`#change-${tokenKey}`);
        const timeEl = card.querySelector(`#time-${tokenKey}`);

        let price = 'N/A';
        let change = 0;

        if (tokenConfig.fixedPrice) {
            price = tokenConfig.fixedPrice;
        } else if (priceData && typeof priceData.price !== 'undefined') {
            price = priceData.price;
            change = priceData.change || 0;
        }

        if (priceEl) {
            if (price !== 'N/A') {
                const options = {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                    useGrouping: true // Įjungiame grupavimą
                };

                if (price >= 1) {
                    options.maximumFractionDigits = 2;
                }
                
                // Naudojame 'en-US' lokalę, kuri naudoja kablelį, ir jį pakeičiame tarpu
                const formattedPrice = price.toLocaleString('en-US', options).replace(/,/g, ' ');
                priceEl.textContent = `$${formattedPrice}`;
            } else {
                priceEl.textContent = 'N/A';
            }
        }
        
        updatePriceChange(changeEl, change);

        if (timeEl) {
            timeEl.textContent = `Atnaujinta: ${new Date().toLocaleTimeString('lt-LT')}`;
        }
    }

    function updatePriceChange(changeEl, change) {
        if (!changeEl) return;
        changeEl.classList.remove('price-up', 'price-down');
        if (change > 0) {
            changeEl.textContent = `▲ +${change.toFixed(2)}%`;
            changeEl.classList.add('price-up');
        } else if (change < 0) {
            changeEl.textContent = `▼ ${change.toFixed(2)}%`;
            changeEl.classList.add('price-down');
        } else {
            changeEl.textContent = '0.00%';
        }
    }
    
    function handleConverterInput(event) {
        const input = event.target;
        if (!input.matches('.converter-amount-input, .converter-value-input')) return;
        const value = parseFloat(input.value);
        if (isNaN(value) || value < 0) {
            clearAllInputs(input);
            return;
        }
        calculateAndUpdateConversions(input, value);
    }

    function clearAllInputs(exceptInput) {
        document.querySelectorAll('.converter-amount-input, .converter-value-input').forEach(inp => {
            if (inp !== exceptInput) inp.value = '';
        });
    }

    function calculateAndUpdateConversions(sourceInput, value) {
        let usdValue;
        const tokenKey = sourceInput.dataset.tokenKey;
        if (sourceInput.classList.contains('converter-amount-input')) {
            const price = getTokenPrice(tokenKey);
            usdValue = value * price;
        } else {
            usdValue = value;
        }
        updateAllConversions(sourceInput, usdValue);
    }

    function getTokenPrice(tokenKey) {
        const tokenConfig = ALL_TOKENS_CONFIG[tokenKey];
        if (!tokenConfig) return 0;
        if (tokenConfig.fixedPrice) return tokenConfig.fixedPrice;
        const priceData = liveTokenPrices[tokenConfig.apiId];
        return priceData?.price || 0;
    }

    function updateAllConversions(sourceInput, usdValue) {
        document.querySelectorAll('.converter-card').forEach(card => {
            const cardTokenKey = card.id.replace('card-', '');
            const price = getTokenPrice(cardTokenKey);
            const valueInput = card.querySelector('.converter-value-input');
            const amountInput = card.querySelector('.converter-amount-input');
            if (sourceInput !== valueInput) {
                valueInput.value = isNaN(usdValue) ? '' : usdValue.toFixed(2);
            }
            if (sourceInput !== amountInput && price > 0) {
                const amount = usdValue / price;
                amountInput.value = isNaN(amount) ? '' : amount.toFixed(8); 
            }
        });
    }

    async function handleConverterClick(event) {
        const button = event.target.closest('.converter-card-update-btn');
        if (!button) return;
        const tokenKey = button.dataset.tokenKey;
        const tokenConfig = ALL_TOKENS_CONFIG[tokenKey];
        if (!tokenConfig || tokenConfig.fixedPrice) return;
        if (!window.appActions?.fetchPrices) return;
        try {
            button.textContent = '...';
            button.disabled = true;
            await window.appActions.fetchPrices(false, tokenConfig.apiId);
            updateConverterPricesUI();
        } catch (error) {
            console.error('Failed to update price:', error);
        } finally {
            button.textContent = 'Atnaujinti';
            button.disabled = false;
        }
    }
})();

