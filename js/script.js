// Failas: js/script.js (Nauja, "dirigento" versija)
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
        prices: {}
    };

    window.appActions = window.appActions || {};
    window.appActions.fetchPrices = fetchLiveTokenPrices;
    window.appActions.getPriceForDate = getPriceForDate;

    // Bendra inicializavimo funkcija
    async function init() {
        document.getElementById('tab-btn-logger').addEventListener('click', () => switchTab('logger'));
        document.getElementById('tab-btn-converter').addEventListener('click', () => switchTab('converter'));
        
        await fetchLiveTokenPrices(true);

        // INICIALIZUOJAME KITUS MODULIUS
        if (window.appActions.initLogger) window.appActions.initLogger();
        if (window.appActions.initConverter) window.appActions.initConverter();
    }

    // BENDROSIOS FUNKCIJOS, KURIOS LIEKA ČIA

    async function fetchLiveTokenPrices(fetchAll = false, singleApiId = null) {
        let tokenApiIds;
        if(fetchAll) { 
            tokenApiIds = Object.values(window.appData.tokens).map(t => t.apiId).filter(id => id);
        } else if (singleApiId) { 
            tokenApiIds = [singleApiId]; 
        } else { return; }
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${[...new Set(tokenApiIds)].join(',')}&vs_currencies=usd&include_24hr_change=true`);
            if (!response.ok) throw new Error(`API klaida: ${response.statusText}`);
            const data = await response.json();
            window.appData.prices['usd'] = { price: 1, change: 0 };
            for (const apiId in data) { 
                window.appData.prices[apiId] = { price: data[apiId].usd, change: data[apiId].usd_24h_change || 0 }; 
            }
            if (window.appActions && typeof window.appActions.updateConverterUI === 'function') {
                window.appActions.updateConverterUI();
            }
        } catch (error) { 
            console.error("Klaida gaunant realaus laiko kainas:", error); 
        }
    }
    
    async function getPriceForDate(tokenKey, dateString) {
        const config = window.appData.tokens[tokenKey]; if (!config) throw new Error(`Nežinomas žetonas: ${tokenKey}`); if (config.fixedPrice) return config.fixedPrice;
        const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
        if (dateString >= today.toISOString().split('T')[0] && window.appData.prices[config.apiId]) { return window.appData.prices[config.apiId].price; }
        const [year, month, day] = dateString.split('-'); const apiDate = `${day}-${month}-${year}`;
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
        } catch (error) { console.error("Klaida gaunant istorinę kainą:", error); throw error; }
    }

    function switchTab(tabName) {
        document.getElementById('tab-content-logger').classList.toggle('active', tabName === 'logger');
        document.getElementById('tab-content-converter').classList.toggle('active', tabName === 'converter');
        document.getElementById('tab-btn-logger').classList.toggle('active', tabName === 'logger');
        document.getElementById('tab-btn-converter').classList.toggle('active', tabName === 'converter');
    }
    
    document.addEventListener('DOMContentLoaded', init);
})();
