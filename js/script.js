// Failas: js/script.js (Pataisyta versija - ištaisytas duomenų saugojimas)
(function() {
    'use strict';
    
    // Sukuriame globalius objektus, kuriuos naudos kiti moduliai
window.appData = {
    tokens: {
        'gmt': { key: 'gmt', symbol: 'GMT', apiId: 'stepn', historyApiId: 'stepn', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/18069.png' },
        'ggt': { key: 'ggt', symbol: 'GGT', apiId: 'go-game-token', historyApiId: 'go-game-token', logo: 'https://assets.coingecko.com/coins/images/40080/standard/ggt.jpg?1725515957' },
        'gst': { key: 'gst', symbol: 'GST (SOL)', apiId: 'green-satoshi-token', historyApiId: 'green-satoshi-token', logo: 'https://assets.coingecko.com/coins/images/21841/standard/gst.png?1696521196' },
        'sol': { key: 'sol', symbol: 'SOL', apiId: 'solana', historyApiId: 'solana', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png' },
        'usdc': { key: 'usdc', symbol: 'USDC', apiId: 'usd-coin', historyApiId: 'usd-coin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png', fixedPrice: 1.0 },
        'usdt': { key: 'usdt', symbol: 'USDT', apiId: 'tether', historyApiId: 'tether', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png', fixedPrice: 1.0 },
        'btc': { key: 'btc', symbol: 'BTC', apiId: 'bitcoin', historyApiId: 'bitcoin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png' }
    },
    prices: {},
    initialized: false,
    converterInitialized: false
};

    // Initialize global actions object
    window.appActions = window.appActions || {};
    window.appActions.fetchPrices = fetchLiveTokenPrices;
    window.appActions.getPriceForDate = getPriceForDate;

    // Bendra inicializavimo funkcija
    async function init() {
        try {
            console.log('Starting app initialization...');
            
            // Setup tab listeners
            const loggerBtn = document.getElementById('tab-btn-logger');
            const converterBtn = document.getElementById('tab-btn-converter');
            
            if (loggerBtn) loggerBtn.addEventListener('click', () => switchTab('logger'));
            if (converterBtn) converterBtn.addEventListener('click', () => switchTab('converter'));
            
            // Fetch prices first
            console.log('Fetching initial prices...');
            await fetchLiveTokenPrices(true);
            
            // Mark as initialized
            window.appData.initialized = true;
            console.log('App data initialized, prices:', window.appData.prices);

            // INICIALIZUOJAME KITUS MODULIUS
            if (typeof window.appActions.initLogger === 'function') {
                console.log('Initializing logger...');
                await window.appActions.initLogger();
            }
            
            if (typeof window.appActions.initConverter === 'function') {
                console.log('Initializing converter...');
                await window.appActions.initConverter();
                window.appData.converterInitialized = true;
            }
            
            // Show converter tab by default
            switchTab('converter');
            
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
            
            // SVARBU: Pridėkime USD kaip bazinę valiutą su raktu 'usd'
            window.appData.prices['usd'] = { price: 1, change: 0 };
            
            // Update prices - saugome pagal apiId
            for (const apiId in data) { 
                window.appData.prices[apiId] = { 
                    price: data[apiId].usd, 
                    change: data[apiId].usd_24h_change || 0 
                }; 
            }
            
            // Taip pat pridėkime USDC su fiksuotu kursu
            if (window.appData.prices['usd-coin']) {
                window.appData.prices['usd-coin'] = { price: 1.0, change: 0 };
            }
            
            console.log('Updated prices:', window.appData.prices);
            
            // Only update converter UI if it's initialized and function exists
            if (window.appData.initialized && 
                window.appActions && 
                typeof window.appActions.updateConverterUI === 'function') {
                console.log('Updating converter UI...');
                window.appActions.updateConverterUI();
            }
            
        } catch (error) { 
            console.error("Klaida gaunant realaus laiko kainas:", error);
            // Show user-friendly error message
            const converterGrid = document.getElementById('converter-grid');
            if (converterGrid) {
                converterGrid.innerHTML = 
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
        console.log('Switching to tab:', tabName);
        
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
        
        if (targetContent) {
            targetContent.classList.add('active');
            console.log('Activated tab content:', tabName);
        } else {
            console.warn('Tab content not found:', `tab-content-${tabName}`);
        }
        
        if (targetButton) {
            targetButton.classList.add('active');
        } else {
            console.warn('Tab button not found:', `tab-btn-${tabName}`);
        }
        
        // If switching to converter tab, make sure it's initialized
        if (tabName === 'converter' && 
            typeof window.appActions.initConverter === 'function' && 
            !window.appData.converterInitialized) {
            console.log('Late initializing converter...');
            window.appActions.initConverter();
            window.appData.converterInitialized = true;
        }
    }
    
    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', init);
    
    // Expose debug functions for development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.appDebug = {
            data: () => window.appData,
            actions: () => window.appActions,
            reinit: init,
            fetchPrices: () => fetchLiveTokenPrices(true)
        };
    }
})();
