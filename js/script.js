// Failas: js/script.js (Pataisyta versija - numatytasis skirtukas yra 'logger')

(function() {
    'use strict';
    
    window.appData = {
        tokens: {
            'gmt': { key: 'gmt', symbol: 'GMT', apiId: 'stepn', historyApiId: 'stepn', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/18069.png' },
            'ggt': { key: 'ggt', symbol: 'GGT', apiId: 'go-game-token', historyApiId: 'go-game-token', logo: 'https://assets.coingecko.com/coins/images/40080/standard/ggt.jpg?1725515957' },
            'gst': { key: 'gst', symbol: 'GST (SOL)', apiId: 'green-satoshi-token', historyApiId: 'green-satoshi-token', logo: 'https://assets.coingecko.com/coins/images/21841/standard/gst.png?1696521196' },
            'sol': { key: 'sol', symbol: 'SOL', apiId: 'solana', historyApiId: 'solana', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png' },
            'usdc': { key: 'usdc', symbol: 'USDC', apiId: 'usd-coin', historyApiId: 'usd-coin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png', fixedPrice: 1.0 },
            'usdt': { key: 'usdt', symbol: 'USDT', apiId: 'tether', historyApiId: 'tether', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png', fixedPrice: 1.0 },
            'btc': { key: 'btc', symbol: 'BTC', apiId: 'bitcoin', historyApiId: 'bitcoin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png' },
            'pol': { key: 'pol', symbol: 'POL', apiId: 'polygon-ecosystem-token', historyApiId: 'polygon-ecosystem-token', logo: 'https://assets.coingecko.com/coins/images/32440/standard/polygon.png?1698233684' },
            'bnb': { key: 'bnb', symbol: 'BNB', apiId: 'binancecoin', historyApiId: 'binancecoin', logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png' }
        },
        prices: {},
        initialized: false,
        converterInitialized: false
    };

    window.appActions = window.appActions || {};
    window.appActions.fetchPrices = fetchLiveTokenPrices;
    window.appActions.getPriceForDate = getPriceForDate;

    async function init() {
        try {
            console.log('Starting app initialization...');
            
            const loggerBtn = document.getElementById('tab-btn-logger');
            const converterBtn = document.getElementById('tab-btn-converter');
            
            if (loggerBtn) loggerBtn.addEventListener('click', () => switchTab('logger'));
            if (converterBtn) converterBtn.addEventListener('click', () => switchTab('converter'));
            
            console.log('Fetching initial prices...');
            await fetchLiveTokenPrices(true);
            
            window.appData.initialized = true;
            console.log('App data initialized, prices:', window.appData.prices);

            if (typeof window.appActions.initLogger === 'function') {
                console.log('Initializing logger...');
                await window.appActions.initLogger();
            }
            
            if (typeof window.appActions.initConverter === 'function') {
                console.log('Initializing converter...');
                await window.appActions.initConverter();
                window.appData.converterInitialized = true;
            }
            
            // === PAKEITIMAS ČIA ===
            // Nustatome, kad "Pajamų registratorius" būtų numatytasis skirtukas.
            switchTab('logger');
            
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    }

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
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${[...new Set(tokenApiIds)].join(',')}&vs_currencies=usd&include_24hr_change=true`);
            
            if (!response.ok) {
                throw new Error(`API klaida: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            window.appData.prices['usd'] = { price: 1, change: 0 };
            
            for (const apiId in data) { 
                window.appData.prices[apiId] = { 
                    price: data[apiId].usd, 
                    change: data[apiId].usd_24h_change || 0 
                }; 
            }
            
            if (window.appData.prices['usd-coin']) {
                window.appData.prices['usd-coin'] = { price: 1.0, change: 0 };
            }
            
            if (window.appData.initialized && 
                window.appActions && 
                typeof window.appActions.updateConverterUI === 'function') {
                window.appActions.updateConverterUI();
            }
            
        } catch (error) { 
            console.error("Klaida gaunant realaus laiko kainas:", error);
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
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const targetContent = document.getElementById(`tab-content-${tabName}`);
        const targetButton = document.getElementById(`tab-btn-${tabName}`);
        
        if (targetContent) targetContent.classList.add('active');
        if (targetButton) targetButton.classList.add('active');
        
        if (tabName === 'converter' && 
            typeof window.appActions.initConverter === 'function' && 
            !window.appData.converterInitialized) {
            window.appActions.initConverter();
            window.appData.converterInitialized = true;
        }
    }
    
    document.addEventListener('DOMContentLoaded', init);
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.appDebug = {
            data: () => window.appData,
            actions: () => window.appActions,
            reinit: init,
            fetchPrices: () => fetchLiveTokenPrices(true)
        };
    }
})();
