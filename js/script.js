// Failas: js/script.js (Versija be Fiat USD)

(function() {
    'use strict';
    
    window.appData = {
        tokens: {
            'gmt': { key: 'gmt', symbol: 'GMT', apiId: 'stepn', historyApiId: 'stepn', logo: 'img/gmt.svg' },
            'ggt': { key: 'ggt', symbol: 'GGT', apiId: 'go-game-token', historyApiId: 'go-game-token', logo: 'img/ggt.svg' },
            'gst': { key: 'gst', symbol: 'GST (SOL)', apiId: 'green-satoshi-token', historyApiId: 'green-satoshi-token', logo: 'img/gst.svg' },
            'sol': { key: 'sol', symbol: 'SOL', apiId: 'solana', historyApiId: 'solana', logo: 'img/sol.svg' },
            'usdc': { key: 'usdc', symbol: 'USDC', apiId: 'usd-coin', historyApiId: 'usd-coin', logo: 'img/usdc.svg' },
            'usdt': { key: 'usdt', symbol: 'USDT', apiId: 'tether', historyApiId: 'tether', logo: 'img/usdt.svg' },
            'btc': { key: 'btc', symbol: 'BTC', apiId: 'bitcoin', historyApiId: 'bitcoin', logo: 'img/btc.svg' },
            'pol': { key: 'pol', symbol: 'POL', apiId: 'polygon-ecosystem-token', historyApiId: 'polygon-ecosystem-token', logo: 'img/pol.svg' },
            'bnb': { key: 'bnb', symbol: 'BNB', apiId: 'binancecoin', historyApiId: 'binancecoin', logo: 'img/bnb.svg' },
            'ltc': { key: 'ltc', symbol: 'LTC', apiId: 'litecoin', historyApiId: 'litecoin', logo: 'img/ltc.svg' },
            'kas': { key: 'kas', symbol: 'KAS', apiId: 'kaspa', historyApiId: 'kaspa', logo: 'img/kaspa.svg' },
            'xlm': { key: 'xlm', symbol: 'XLM', apiId: 'stellar', historyApiId: 'stellar', logo: 'img/xlm.svg' },
            'ada': { key: 'ada', symbol: 'ADA', apiId: 'cardano', historyApiId: 'cardano', logo: 'img/cardano.svg' },
            'ton': { key: 'ton', symbol: 'TON', apiId: 'the-open-network', historyApiId: 'the-open-network', logo: 'img/ton.svg' },
            'cro': { key: 'cro', symbol: 'CRO', apiId: 'crypto-com-chain', historyApiId: 'crypto-com-chain', logo: 'img/cro.svg' }
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
            const loggerBtn = document.getElementById('tab-btn-logger');
            const converterBtn = document.getElementById('tab-btn-converter');
            
            if (loggerBtn) loggerBtn.addEventListener('click', () => switchTab('logger'));
            if (converterBtn) converterBtn.addEventListener('click', () => switchTab('converter'));
            
            await fetchLiveTokenPrices(true);
            
            window.appData.initialized = true;

            if (typeof window.appActions.initLogger === 'function') {
                await window.appActions.initLogger();
            }
            
            if (typeof window.appActions.initConverter === 'function') {
                await window.appActions.initConverter();
                window.appData.converterInitialized = true;
            }
            
            switchTab('logger');
            
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    }

    async function fetchLiveTokenPrices(fetchAll = false, singleApiId = null) {
        let tokenApiIds = [];
        if (fetchAll) { 
            tokenApiIds = Object.values(window.appData.tokens)
                .map(t => t.apiId)
                .filter(id => id);
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
            
            for (const apiId in data) { 
                window.appData.prices[apiId] = { 
                    price: data[apiId].usd, 
                    change: data[apiId].usd_24h_change || 0 
                }; 
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
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        
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
    
})();

