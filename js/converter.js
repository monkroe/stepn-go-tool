// Failas: js/converter.js (Pataisyta versija - ištaisytas duomenų nuskaitymas)
(function() {
    'use strict';

    let elements = {};
    let liveTokenPrices, ALL_TOKENS_CONFIG;

    // Pridedame savo funkcijas prie globalių veiksmų
    window.appActions = window.appActions || {};
    window.appActions.updateConverterUI = updateConverterPricesUI;
    window.appActions.initConverter = initConverter;

    function initConverter() {
        try {
            console.log('Initializing converter...');
            
            // Patikrinam, ar duomenys yra prieinami
            if (!window.appData?.tokens || !window.appData?.prices) {
                console.warn('Converter: App data not ready, retrying in 100ms');
                setTimeout(initConverter, 100);
                return;
            }

            ALL_TOKENS_CONFIG = window.appData.tokens;
            liveTokenPrices = window.appData.prices;
            
            console.log('Converter data loaded:', {
                tokens: Object.keys(ALL_TOKENS_CONFIG),
                prices: Object.keys(liveTokenPrices)
            });
            
            cacheConverterElements();
            bindConverterEventListeners();
            generateConverterCards();
            updateConverterPricesUI();
            
            console.log('Converter initialized successfully');
        } catch (error) {
            console.error('Failed to initialize converter:', error);
        }
    }

    function cacheConverterElements() {
        const grid = document.getElementById('converter-grid');
        if (grid) {
            elements['converter-grid'] = grid;
            console.log('Converter grid element found');
        } else {
            console.warn('Converter grid element not found');
        }
    }

    function bindConverterEventListeners() {
        if (elements['converter-grid']) {
            elements['converter-grid'].addEventListener('input', handleConverterInput);
            elements['converter-grid'].addEventListener('click', handleConverterClick);
            console.log('Converter event listeners bound');
        }
    }

    function generateConverterCards() {
        if (!elements['converter-grid']) {
            console.warn('Cannot generate cards - grid element not found');
            return;
        }
        
        const tokenKeys = Object.keys(ALL_TOKENS_CONFIG);
        const usdLogo = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48bGluZSB4MT0iMTIiIHkxPSIxIiB4Mj0iMTIiIHkyPSIyMyI+PC9saW5lPjxwYXRoIGQ9Ik0xNyA1IDkuNSA0LjUgNCAyIDAgMTIgNCA0IDAgOC00LTQtOC00LTQtMiAwLTEyLTQtNCA4IDAgOC00IDAgOS41IDQuNSA0IDIgMCAxMi00IDQtOCA4LTggNHoiPjwvcGF0aD48L3N2Zz4=';
        
        const tokensToDisplay = [
            { key: 'usd', symbol: 'USD', apiId: 'usd', fixedPrice: 1.0, logo: usdLogo },
            ...tokenKeys.map(k => ALL_TOKENS_CONFIG[k]).filter(Boolean)
        ];
        
        console.log('Generating cards for tokens:', tokensToDisplay.map(t => t.symbol));
        
        const html = tokensToDisplay.map(token => createTokenCardHTML(token)).join('');
        elements['converter-grid'].innerHTML = html;
        
        console.log('Cards generated successfully');
    }

    function createTokenCardHTML(token) {
        const apiId = token.apiId || token.key;
        return `
            <div class="converter-card" id="card-${apiId}">
                <div class="converter-card-header">
                    <span class="converter-card-title">
                        <img src="${token.logo}" 
                             alt="${token.symbol}" 
                             class="token-logo"
                             onerror="this.style.display='none'">
                        ${token.symbol}
                    </span>
                    <button class="converter-card-update-btn" 
                            data-api-id="${apiId}"
                            ${apiId === 'usd' ? 'disabled title="USD kainos fiksuotos"' : ''}>
                        Atnaujinti
                    </button>
                </div>
                <div class="converter-card-price-wrapper">
                    <div class="converter-card-price" id="price-${apiId}">$0.00000</div>
                    <div class="price-change" id="change-${apiId}"></div>
                </div>
                <div class="input-group">
                    <label for="amount-${apiId}" class="text-xs">Kiekis:</label>
                    <input type="number" 
                           id="amount-${apiId}" 
                           data-api-id="${apiId}" 
                           class="converter-amount-input" 
                           placeholder="0.00"
                           step="any"
                           min="0">
                </div>
                <div class="input-group">
                    <label for="value-${apiId}" class="text-xs">Vertė USD:</label>
                    <input type="number" 
                           id="value-${apiId}" 
                           class="converter-value-input" 
                           placeholder="0.00"
                           step="any"
                           min="0">
                </div>
                <div class="update-time" id="time-${apiId}"></div>
            </div>`;
    }
    
    function updateConverterPricesUI() {
        if (!window.appData?.prices) {
            console.warn('Price data not available for UI update');
            return;
        }

        liveTokenPrices = window.appData.prices;
        console.log('Updating converter UI with prices:', liveTokenPrices);
        
        document.querySelectorAll('.converter-card').forEach(card => {
            const apiId = card.id.replace('card-', '');
            updateSingleCardPrice(card, apiId);
        });
    }

    function updateSingleCardPrice(card, apiId) {
        // SVARBU: Čia yra pagrindinis pataisymas - kaip gaunamos kainos
        let priceData;
        
        if (apiId === 'usd') {
            // USD visada turi fiksuotą kainą
            priceData = { price: 1, change: 0 };
        } else {
            // Kitoms valiutoms ieškome pagal apiId
            priceData = liveTokenPrices[apiId];
            
            // Jei neradome, pabandykime ieškoti pagal token config
            if (!priceData) {
                const tokenConfig = Object.values(ALL_TOKENS_CONFIG).find(t => 
                    t.key === apiId || t.apiId === apiId
                );
                if (tokenConfig && tokenConfig.apiId) {
                    priceData = liveTokenPrices[tokenConfig.apiId];
                }
            }
        }
        
        const priceEl = card.querySelector(`#price-${apiId}`);
        const changeEl = card.querySelector(`#change-${apiId}`);
        const timeEl = card.querySelector(`#time-${apiId}`);

        if (priceData && typeof priceData.price !== 'undefined') {
            // Formatuojam kainą pagal vertę
            const price = priceData.price;
            const formattedPrice = price >= 1 ? price.toFixed(2) : price.toFixed(6);
            priceEl.textContent = `$${formattedPrice}`;
            
            updatePriceChange(changeEl, priceData.change || 0);
            console.log(`Updated ${apiId}: $${formattedPrice}`);
        } else {
            priceEl.textContent = 'N/A';
            changeEl.textContent = '';
            console.warn(`No price data found for ${apiId}`);
        }

        if (timeEl) {
            timeEl.textContent = `Atnaujinta: ${new Date().toLocaleTimeString('lt-LT')}`;
        }
    }

    function updatePriceChange(changeEl, change) {
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
        
        // Jei įvestis nevalidaus, išvalom visus laukus
        if (isNaN(value) || value < 0) {
            clearAllInputs(input);
            return;
        }

        calculateAndUpdateConversions(input, value);
    }

    function clearAllInputs(exceptInput) {
        document.querySelectorAll('.converter-amount-input, .converter-value-input')
                .forEach(inp => {
                    if (inp !== exceptInput) inp.value = '';
                });
    }

    function calculateAndUpdateConversions(sourceInput, value) {
        let usdValue;

        if (sourceInput.classList.contains('converter-amount-input')) {
            const apiId = sourceInput.dataset.apiId;
            const price = getTokenPrice(apiId);
            usdValue = value * price;
        } else {
            usdValue = value;
        }

        updateAllConversions(sourceInput, usdValue);
    }

    function getTokenPrice(apiId) {
        if (apiId === 'usd') return 1;
        
        // Ieškome kainos pagal apiId
        let price = liveTokenPrices[apiId]?.price;
        
        // Jei neradome, ieškome pagal token config
        if (!price) {
            const tokenConfig = Object.values(ALL_TOKENS_CONFIG).find(t => 
                t.key === apiId || t.apiId === apiId
            );
            if (tokenConfig && tokenConfig.apiId) {
                price = liveTokenPrices[tokenConfig.apiId]?.price;
            }
        }
        
        return price || 0;
    }

    function updateAllConversions(sourceInput, usdValue) {
        document.querySelectorAll('.converter-card').forEach(card => {
            const cardApiId = card.id.replace('card-', '');
            const price = getTokenPrice(cardApiId);
            
            const valueInput = card.querySelector('.converter-value-input');
            const amountInput = card.querySelector('.converter-amount-input');

            if (sourceInput !== valueInput) {
                valueInput.value = usdValue.toFixed(2);
            }
            
            if (sourceInput !== amountInput && price > 0) {
                const amount = usdValue / price;
                amountInput.value = amount >= 1 ? amount.toFixed(2) : amount.toFixed(8);
            }
        });
    }

    async function handleConverterClick(event) {
        if (!event.target.classList.contains('converter-card-update-btn')) return;
        
        const button = event.target;
        const apiId = button.dataset.apiId;
        
        // Neatnaujinėjam USD
        if (apiId === 'usd') return;
        
        if (!window.appActions?.fetchPrices) {
            console.error('fetchPrices function not available');
            return;
        }

        try {
            button.textContent = '...';
            button.disabled = true;
            
            await window.appActions.fetchPrices(false, apiId);
            updateConverterPricesUI();
        } catch (error) {
            console.error('Failed to update price:', error);
        } finally {
            button.textContent = 'Atnaujinti';
            button.disabled = false;
        }
    }

    // Eksportuojam funkcijas testavimui (tik development)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.converterDebug = {
            initConverter,
            updateConverterPricesUI,
            elements: () => elements,
            prices: () => liveTokenPrices,
            tokens: () => ALL_TOKENS_CONFIG
        };
    }

})();
