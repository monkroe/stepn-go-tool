// Failas: js/script.js (Galutinė "dirigento" versija)
(function() {
    'use strict';
    
    // Sukuriame globalius objektus, kuriuos naudos kiti moduliai
    window.appData = {
        tokens: {
            // === GALUTINĖ KONFIGŪRACIJA su Jūsų patvirtintomis nuorodomis ===

            // --- Jūsų patvirtintos nuorodos ---
            'ggt': { 
                key: 'ggt', 
                symbol: 'GGT', 
                apiId: 'go-game-token', 
                historyApiId: 'go-game-token', 
                logo: 'https://assets.coingecko.com/coins/images/40080/standard/ggt.jpg?1725515957' 
            },
            'gst': { 
                key: 'gst', 
                symbol: 'GST (SOL)', 
                apiId: 'green-satoshi-token', 
                historyApiId: 'green-satoshi-token', 
                logo: 'https://assets.coingecko.com/coins/images/21841/standard/gst.png?1696521196'
            },
            
            // --- USD logotipas iš patikimos ikonų bibliotekos ---
            'usd': { 
                key: 'usd', 
                symbol: 'USD', 
                apiId: 'usd', 
                fixedPrice: 1.0, 
                logo: 'https://cdn.jsdelivr.net/npm/feather-icons/dist/icons/dollar-sign.svg'
            },

            // --- Likę žetonai, kurių nuorodos veikė gerai ---
            'gmt': { 
                key: 'gmt', 
                symbol: 'GMT', 
                apiId: 'stepn', 
                historyApiId: 'stepn', 
                logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/18069.png' 
            },
            'sol': { 
                key: 'sol', 
                symbol: 'SOL', 
                apiId: 'solana', 
                historyApiId: 'solana', 
                logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png' 
            },
            'usdc': { 
                key: 'usdc', 
                symbol: 'USDC', 
                apiId: 'usd-coin', 
                historyApiId: 'usd-coin', 
                logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png', 
                fixedPrice: 1.0 
            },
            'btc': { 
                key: 'btc', 
                symbol: 'BTC', 
                apiId: 'bitcoin', 
                historyApiId: 'bitcoin', 
                logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png' 
            }
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
        const tokens = window.appData.tokens;
        if(fetchAll) { 
            tokenApiIds = Object.values(tokens).map(t => t.apiId).filter(id => id && tokens[Object.keys(tokens).find(key => tokens[key].apiId === id)].fixedPrice !== 1.0);
        } else if (singleApiId) { 
            tokenApiIds = [singleApiId]; 
        } else { return; }
        
        if (tokenApiIds.length === 0) return;

        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${[...new Set(tokenApiIds)].join(',')}&vs_currencies=usd&include_24hr_change=true`);
            if (!response.ok) throw new Error(`API klaida: ${response.statusText}`);
            const data = await response.json();
            
            window.appData.prices['usd'] = { price: 1, change: 0 };
            
            for (const apiId in data) { 
                window.appData.prices[apiId] = { price: data[apiId].usd, change: data[apiId].usd_24h_change || 0 }; 
            }
            // Užtikrinam, kad fixedPrice žetonai visada turėtų kainą
            Object.values(tokens).forEach(token => {
                if(token.fixedPrice) {
                    window.appData.prices[token.apiId] = { price: token.fixedPrice, change: 0 };
                }
            });

            if (window.appActions && typeof window.appActions.updateConverterUI === 'function') {
                window.appActions.updateConverterUI();
            }
        } catch (error) { 
            console.error("Klaida gaunant realaus laiko kainas:", error); 
        }
    }
    
    async function getPriceForDate(tokenKey, dateString) {
        const config = window.appData.tokens[tokenKey];
        if (!config) throw new Error(`Nežinomas žetonas: ${tokenKey}`);
        if (config.fixedPrice) return config.fixedPrice;
        
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const requestDate = new Date(dateString);
        requestDate.setUTCHours(0, 0, 0, 0);

        if (requestDate.getTime() >= today.getTime() && window.appData.prices[config.apiId]) {
            return window.appData.prices[config.apiId].price;
        }
        
        const [year, month, day] = dateString.split('-');
        const apiDate = `${day}-${month}-${year}`;
        
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/coins/${config.historyApiId}/history?date=${apiDate}`);
            if (!response.ok) {
                 if (response.status === 429) { // Too Many Requests
                    alert('CoinGecko API limitas viršytas. Bandykite vėliau arba naudokite dabartinį kursą.');
                }
                throw new Error(`API klaida (${response.status})`);
            }
            const data = await response.json();
            if (data.market_data?.current_price?.usd) {
                return data.market_data.current_price.usd;
            }
            
            console.warn(`Istorinė kaina nerasta ${config.symbol} datai ${dateString}. Naudojamas dabartinis kursas.`);
            alert(`Dėmesio: Nepavyko gauti istorinio ${config.symbol.toUpperCase()} kurso. Įrašui panaudotas dabartinis kursas.`);
            
            if (!window.appData.prices[config.apiId]) {
                await fetchLiveTokenPrices(false, config.apiId);
            }
            const currentPrice = window.appData.prices[config.apiId]?.price;
            if (currentPrice) return currentPrice;

            throw new Error(`Neįmanoma gauti kainos ${config.symbol} žetonui.`);
        } catch (error) {
            console.error("Klaida gaunant istorinę kainą:", error);
            const fallbackPrice = window.appData.prices[config.apiId]?.price;
            if (fallbackPrice) {
                alert(`Nepavykus gauti istorinės kainos, naudojamas dabartinis kursas: $${fallbackPrice.toFixed(5)}`);
                return fallbackPrice;
            }
            throw error;
        }
    }

    function switchTab(tabName) {
        document.getElementById('tab-content-logger').classList.toggle('active', tabName === 'logger');
        document.getElementById('tab-content-converter').classList.toggle('active', tabName === 'converter');
        document.getElementById('tab-btn-logger').classList.toggle('active', tabName === 'logger');
        document.getElementById('tab-btn-converter').classList.toggle('active', tabName === 'converter');
    }
    
    document.addEventListener('DOMContentLoaded', init);
})();
