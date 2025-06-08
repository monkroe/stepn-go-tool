// Failas: js/script.js (Pataisyta versija)
(function() {
    'use strict';
    
    // Sukuriame globalius objektus, kuriuos naudos kiti moduliai
    window.appData = {
        tokens: {
            'gmt': { key: 'gmt', symbol: 'GMT', apiId: 'stepn', historyApiId: 'stepn', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/18069.png' },
            'ggt': { key: 'ggt', symbol: 'GGT', apiId: 'go-game-token', historyApiId: 'go-game-token', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/31191.png' },
            'gst': { key: 'gst', symbol: 'GST (SOL)', apiId: 'green-satoshi-token', historyApiId: 'green-satoshi-token', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/16353.png' },
            'sol': { key: 'sol', symbol: 'SOL', apiId: 'solana', historyApiId: 'solana', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png' },
            'usdc': { key: 'usdc', symbol: 'USDC', apiId: 'usd-coin', historyApiId: 'usd-coin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png', fixedPrice: 1.0 },
            'btc': { key: 'btc', symbol: 'BTC', apiId: 'bitcoin', historyApiId: 'bitcoin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png' }
        },
        prices: {},
        initialized: false
    };

    // Initialize global actions object
    window.appActions = window.appActions || {};
    window.appActions.fetchPrices = fetchLiveTokenPrices;
    window.appActions.getPriceForDate = getPriceForDate;

    // Bendra inicializavimo funkcija
    async function init() {
        try {
            // Setup tab listeners
            document.getElementById('tab-btn-logger').addEventListener('click', () => switchTab('logger'));
            document.getElementById('tab-btn-converter').addEventListener('click', () => switchTab('converter'));
            
            // Fetch prices first
            await fetchLiveTokenPrices(true);
            
            // Mark as initialized
            window.appData.initialized = true;

            // INICIALIZUOJAME KITUS MODULIUS
            if (typeof window.appActions.initLogger === 'function') {
                await window.appActions.initLogger();
            }
            if (typeof window.appActions.initConverter === 'function') {
                await window.appActions.initConverter();
            }
            
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    }

    // BENDROSIOS FUNKCIJOS, KURIOS LIEKA ČIA

    async function fetchLiveTokenPrices(fetchAll = false, singleApiId = null) {
        let tokenApiIds;
        if(fetchAll) { 
            tokenApiIds = Object.values(window.appData.tokens).map(t => t.apiId).filter(id => id);
        } else if (singleApiId) { 
            tokenApiIds = [singleApiId]; 
        } else { 
            return; 
        }
        
        try {
            console.log('Fetching prices for:', tokenApiIds);
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${[...new Set(tokenApiIds)].join(',')}&vs_currencies=usd&include_24hr_change=true`);
            
            if (!response.ok) {
                throw new Error(`API klaida: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Received price data:', data);
            
            // Set USD as base currency
            window.appData.prices['usd-coin'] = { price: 1, change: 0 };
            
            // Update prices
            for (const apiId in data) { 
                window.appData.prices[apiId] = { 
                    price: data[apiId].usd, 
                    change: data[apiId].usd_24h_change || 0 
                }; 
            }
            
            console.log('Updated prices:', window.appData.prices);
            
            // Only update converter UI if it's initialized and function exists
            if (window.appData.initialized && 
                window.appActions && 
                typeof window.appActions.updateConverterUI === 'function') {
                window.appActions.updateConverterUI();
            }
            
        } catch (error) { 
            console.error("Klaida gaunant realaus laiko kainas:", error);
            // Show user-friendly error message
            if (document.getElementById('converter-grid')) {
                document.getElementById('converter-grid').innerHTML = 
                    '<div class="error-message">Klaida gaunant kainų duomenis. Bandykite vėliau.</div>';
            }
        }
    }
    
    async function getPriceForDate(tokenKey, dateString) {
        const config = window.appData.tokens[tokenKey]; 
        if (!config) throw new Error(`Nežinomas žetonas: ${tokenKey}`); 
        if (config.fixedPrice) return config.fixedPrice;
        
        const today = new Date(); 
        today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        
        if (dateString >= today.toISOString().split('T')[0] && window.appData.prices[config.apiId]) { 
            return window.appData.prices[config.apiId].price; 
        }
        
        const [year, month, day] = dateString.split('-'); 
        const apiDate = `${day}-${month}-${year}`;
        
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
        } catch (error) { 
            console.error("Klaida gaunant istorinę kainą:", error); 
            throw error; 
        }
    }

    function switchTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Hide all tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab content and button
        const targetContent = document.getElementById(`tab-content-${tabName}`);
        const targetButton = document.getElementById(`tab-btn-${tabName}`);
        
        if (targetContent) targetContent.classList.add('active');
        if (targetButton) targetButton.classList.add('active');
        
        // If switching to converter tab, make sure it's initialized
        if (tabName === 'converter' && 
            typeof window.appActions.initConverter === 'function' && 
            !window.appData.converterInitialized) {
            window.appActions.initConverter();
        }
    }
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);
})();
