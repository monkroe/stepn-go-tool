// Failas: js/logger.js (Pilnai suderintas su Jūsų projektu)

(function() {
    'use strict';

    // Prieiga prie globalių kintamųjų ir funkcijų
    const tokensConfig = window.appData.tokens;
    const getPriceForDate = window.appActions.getPriceForDate;

    // DOM Elementai
    const elements = {
        form: document.getElementById('logForm'),
        dateInput: document.getElementById('logDate'),
        platformSelect: document.getElementById('platform'),
        typeSelect: document.getElementById('logType'),
        categorySelect: document.getElementById('logCategory'),
        tokenRadioGroup: document.getElementById('logTokenRadioGroup'),
        tokenAmountInput: document.getElementById('logTokenAmount'),
        descInput: document.getElementById('logDescription'),
        submitBtn: document.getElementById('logSubmitBtn'),
        tableBody: document.getElementById('logTableBody'),
        summaryContainer: document.getElementById('summaryContainer'),
        
        // Konteineriai specifiniams laukams
        standardFields: document.getElementById('standardFields'),
        goLevelUpFields: document.getElementById('goLevelUpFields'),
        ogLevelUpFields: document.getElementById('ogLevelUpFields'),
        ogMintFields: document.getElementById('ogMintFields'),
        ogRestoreFields: document.getElementById('ogRestoreFields'),
        editFields: document.getElementById('editFields'),
        
        // Filtravimo elementai
        filterStartDate: document.getElementById('filterStartDate'),
        filterEndDate: document.getElementById('filterEndDate'),
        filterToken: document.getElementById('filterToken'),
        filterCategory: document.getElementById('filterCategory'),
        filterSort: document.getElementById('filterSort'),
        filterOrder: document.getElementById('filterOrder'),
        filterBtn: document.getElementById('filterBtn'),
        exportCsvBtn: document.getElementById('exportCsvBtn')
    };

    // Kategorijų konfigūracija
    const categories = {
        expense: [
            { value: 'level_up', label: 'Level Up', platforms: ['go', 'og'] },
            { value: 'repair', label: 'Repair', platforms: ['go', 'og'] },
            { value: 'mint', label: 'Shoe Minting', platforms: ['go', 'og'] },
            { value: 'restore', label: 'HP Restore', platforms: ['og'] },
            { value: 'gem_upgrade', label: 'Gem Upgrade', platforms: ['og'] },
            { value: 'shoe_purchase', label: 'Shoe Purchase', platforms: ['go', 'og'] },
            { value: 'fee', label: 'Transfer Fee', platforms: ['go', 'og'] },
            { value: 'other_expense', label: 'Kita', platforms: ['go', 'og'] }
        ],
        income: [
            { value: 'move_earn', label: 'Move & Earn', platforms: ['go', 'og'] },
            { value: 'shoe_sale', label: 'Shoe Sale', platforms: ['go', 'og'] },
            { value: 'mint_sale', label: 'Mint Scroll/Shoebox Sale', platforms: ['og'] },
            { value: 'gem_sale', label: 'Gem Sale', platforms: ['og'] },
            { value: 'other_income', label: 'Kita', platforms: ['go', 'og'] }
        ]
    };

    // Inicijavimas
    window.appActions.initLogger = async function() {
        setDefaultDate();
        setupEventListeners();
        setupTokenRadios();
        setupFilterOptions();
        await loadLogs(); // Pirmas užkrovimas
    };

    function setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        elements.dateInput.value = today;
    }

    function setupTokenRadios() {
        elements.tokenRadioGroup.innerHTML = '';
        // Rodome tik pagrindinius žetonus radio pasirinkimui
        const mainTokens = ['gmt', 'ggt', 'gst', 'sol', 'usdc', 'bnb', 'pol']; 
        
        mainTokens.forEach(key => {
            const token = tokensConfig[key];
            if (!token) return;
            
            const label = document.createElement('label');
            label.className = 'radio-label';
            label.innerHTML = `
                <span>
                    <img src="${token.logo}" alt="${token.symbol}" class="token-logo">
                    ${token.symbol}
                </span>
                <input type="radio" name="token" value="${token.key}">
                <span class="radio-custom-dot"></span>
            `;
            elements.tokenRadioGroup.appendChild(label);
        });
        
        // Pagal nutylėjimą pasirenkame GMT
        const gmtRadio = elements.tokenRadioGroup.querySelector('input[value="gmt"]');
        if (gmtRadio) gmtRadio.checked = true;
    }

    function setupEventListeners() {
        elements.typeSelect.addEventListener('change', updateCategories);
        elements.platformSelect.addEventListener('change', updateCategories);
        elements.categorySelect.addEventListener('change', updateFormFields);
        elements.form.addEventListener('submit', handleFormSubmit);
        
        elements.filterBtn.addEventListener('click', loadLogs);
        elements.exportCsvBtn.addEventListener('click', exportToCsv);
    }

    function updateCategories() {
        const type = elements.typeSelect.value;
        const platform = elements.platformSelect.value;
        const categorySelect = elements.categorySelect;

        categorySelect.innerHTML = '<option value="" disabled selected>Pasirinkite kategoriją...</option>';

        if (type && platform && categories[type]) {
            const availableCats = categories[type].filter(cat => cat.platforms.includes(platform));
            availableCats.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.value;
                option.textContent = cat.label;
                categorySelect.appendChild(option);
            });
        }
        updateFormFields();
    }

    function updateFormFields() {
        // Paslepiame visus specialius laukus
        [
            elements.standardFields, elements.goLevelUpFields, elements.ogLevelUpFields,
            elements.ogMintFields, elements.ogRestoreFields, elements.editFields
        ].forEach(el => el.classList.add('hidden'));

        // Atžymime radio mygtukus ir išvalome inputus
        // (Galima palikti, jei norite, kad duomenys išliktų keičiant kategoriją, bet saugiau išvalyti)
        
        const platform = elements.platformSelect.value;
        const category = elements.categorySelect.value;

        if (!platform || !category) return;

        // Logika laukų rodymui
        if (category === 'level_up') {
            if (platform === 'go') elements.goLevelUpFields.classList.remove('hidden');
            else elements.ogLevelUpFields.classList.remove('hidden');
        } else if (category === 'mint' && platform === 'og') {
            elements.ogMintFields.classList.remove('hidden');
        } else if (category === 'restore' && platform === 'og') {
            elements.ogRestoreFields.classList.remove('hidden');
        } else {
            // Standartiniai laukai (Žetonas + Suma)
            elements.standardFields.classList.remove('hidden');
        }
    }

    function setupFilterOptions() {
        // Žetonų filtras
        elements.filterToken.innerHTML = '<option value="">Visi</option>';
        Object.values(tokensConfig).forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.key;
            opt.textContent = t.symbol;
            elements.filterToken.appendChild(opt);
        });

        // Kategorijų filtras (sujungiame visas unikalias kategorijas)
        const allCats = [...categories.expense, ...categories.income];
        const uniqueCats = Array.from(new Set(allCats.map(c => JSON.stringify({v: c.value, l: c.label}))))
            .map(s => JSON.parse(s));
            
        elements.filterCategory.innerHTML = '<option value="">Visos</option>';
        uniqueCats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.v;
            opt.textContent = c.label;
            elements.filterCategory.appendChild(opt);
        });
    }

    // --- PAGRINDINĖ LOGIKA: Duomenų siuntimas ---

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        const user = supabase.auth.getUser();
        if (!user) {
            alert("Prašome prisijungti, kad galėtumėte išsaugoti įrašus.");
            return;
        }

        elements.submitBtn.disabled = true;
        elements.submitBtn.textContent = "Saugoma...";

        try {
            const formData = await collectFormData();
            
            // Jei tai sudėtinis veiksmas (pvz., Level Up), jis grąžins masyvą įrašų
            const entries = Array.isArray(formData) ? formData : [formData];

            for (const entry of entries) {
                const { error } = await supabase.from('stepn_logs').insert([entry]);
                if (error) throw error;
            }

            // Sėkmingai išsaugota
            elements.form.reset();
            setDefaultDate();
            updateCategories(); // Resetina laukus
            await loadLogs(); // Atnaujina lentelę

        } catch (error) {
            console.error("Klaida saugant:", error);
            alert("Nepavyko išsaugoti įrašo: " + error.message);
        } finally {
            elements.submitBtn.disabled = false;
            elements.submitBtn.textContent = "Pridėti įrašą";
        }
    }

    async function collectFormData() {
        const platform = elements.platformSelect.value;
        const type = elements.typeSelect.value;
        const category = elements.categorySelect.value;
        const date = elements.dateInput.value;
        const desc = elements.descInput.value;
        
        const baseData = {
            date: date,
            type: type,
            category: category,
            platform: platform,
            description: desc,
            // user_id bus priskirtas automatiškai Supabase RLS arba galite pridėti čia jei reikia
        };

        // Pagalbinė funkcija gauti kainą ir suformuoti objektą
        const createEntry = async (tokenKey, amount) => {
            if (!amount || amount <= 0) return null;
            const rate = await getPriceForDate(tokenKey, date);
            return {
                ...baseData,
                token_symbol: tokensConfig[tokenKey].symbol,
                token_amount: parseFloat(amount),
                rate_usd: rate,
                total_usd: parseFloat(amount) * rate,
                token_key: tokenKey // Pagalbinis laukas filtravimui
            };
        };

        // LOGIKA PAGAL KATEGORIJAS
        if (category === 'level_up') {
            const entries = [];
            if (platform === 'go') {
                const ggt = await createEntry('ggt', elements.goLevelUpFields.querySelector('#goLevelUpGgt').value);
                const gmt = await createEntry('gmt', elements.goLevelUpFields.querySelector('#goLevelUpGmt').value);
                if (ggt) entries.push(ggt);
                if (gmt) entries.push(gmt);
            } else { // OG
                const gst = await createEntry('gst', elements.ogLevelUpFields.querySelector('#ogLevelUpGst').value);
                const gmt = await createEntry('gmt', elements.ogLevelUpFields.querySelector('#ogLevelUpGmt').value);
                if (gst) entries.push(gst);
                if (gmt) entries.push(gmt);
            }
            return entries;
        } 
        else if (category === 'mint' && platform === 'og') {
            const entries = [];
            const gst = await createEntry('gst', elements.ogMintFields.querySelector('#ogMintGst').value);
            const gmt = await createEntry('gmt', elements.ogMintFields.querySelector('#ogMintGmt').value);
            const scrolls = await createEntry('gmt', elements.ogMintFields.querySelector('#ogMintScrollsCost').value);
            
            if (gst) entries.push(gst);
            if (gmt) entries.push(gmt);
            if (scrolls) {
                scrolls.description = (scrolls.description ? scrolls.description + " " : "") + "(Scrolls Cost)";
                entries.push(scrolls);
            }
            return entries;
        }
        else if (category === 'restore' && platform === 'og') {
            const entries = [];
            const gst = await createEntry('gst', elements.ogRestoreFields.querySelector('#ogRestoreGst').value);
            const gmt = await createEntry('gmt', elements.ogRestoreFields.querySelector('#ogRestoreGmt').value);
            const gems = await createEntry('gmt', elements.ogRestoreFields.querySelector('#ogRestoreGemsGmt').value);

            if (gst) entries.push(gst);
            if (gmt) entries.push(gmt);
            if (gems) {
                gems.description = (gems.description ? gems.description + " " : "") + "(Gems Cost)";
                entries.push(gems);
            }
            return entries;
        }
        else {
            // Standartinis (vienas žetonas)
            const selectedRadio = elements.tokenRadioGroup.querySelector('input[type="radio"]:checked');
            if (!selectedRadio) throw new Error("Nepasirinktas žetonas");
            
            const tokenKey = selectedRadio.value;
            const amount = elements.tokenAmountInput.value;
            
            const entry = await createEntry(tokenKey, amount);
            if (!entry) throw new Error("Neįvesta suma");
            return entry;
        }
    }

    // --- DUOMENŲ GAVIMAS IR ATVAIZDAVIMAS ---

    async function loadLogs() {
        elements.tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><div class="spinner mx-auto"></div></td></tr>';
        
        let query = supabase
            .from('stepn_logs')
            .select('*');

        // Filtrai
        if (elements.filterStartDate.value) query = query.gte('date', elements.filterStartDate.value);
        if (elements.filterEndDate.value) query = query.lte('date', elements.filterEndDate.value);
        if (elements.filterToken.value) {
            const symbol = tokensConfig[elements.filterToken.value].symbol;
            query = query.eq('token_symbol', symbol);
        }
        if (elements.filterCategory.value) query = query.eq('category', elements.filterCategory.value);

        // Rikiavimas
        const sortCol = elements.filterSort.value;
        const sortOrder = elements.filterOrder.value === 'asc';
        query = query.order(sortCol, { ascending: sortOrder });

        const { data, error } = await query;

        if (error) {
            console.error("Error loading logs:", error);
            elements.tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-red-500 py-4">Klaida kraunant duomenis</td></tr>';
            return;
        }

        renderTable(data);
        renderSummary(data);
    }

    function renderTable(data) {
        elements.tableBody.innerHTML = '';
        
        if (!data || data.length === 0) {
            elements.tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-gray-500">Įrašų nerasta</td></tr>';
            return;
        }

        data.forEach(row => {
            const tr = document.createElement('tr');
            
            // Ikonos paieška pagal simbolį
            const tokenConfig = Object.values(tokensConfig).find(t => t.symbol === row.token_symbol);
            const iconUrl = tokenConfig ? tokenConfig.logo : '';
            const typeClass = row.type === 'income' ? 'income-color' : 'expense-color';
            const sign = row.type === 'income' ? '+' : '-';

            tr.innerHTML = `
                <td>${row.date}</td>
                <td class="${typeClass} font-bold text-center">${row.type === 'income' ? '↓' : '↑'}</td>
                <td>
                    <div class="flex items-center gap-2">
                        ${iconUrl ? `<img src="${iconUrl}" class="token-icon-table">` : ''}
                        ${row.token_symbol}
                    </div>
                </td>
                <td class="${typeClass} font-mono">${sign}${parseFloat(row.token_amount).toFixed(4)}</td>
                <td class="text-gray-400">$${parseFloat(row.rate_usd).toFixed(4)}</td>
                <td class="${typeClass} font-bold">$${parseFloat(row.total_usd).toFixed(2)}</td>
                <td class="text-sm text-gray-400">${row.description || '-'}</td>
                <td class="log-table-actions">
                    <button class="btn-delete" onclick="window.appActions.deleteLog(${row.id})">Ištrinti</button>
                </td>
            `;
            elements.tableBody.appendChild(tr);
        });
    }

    // Globali funkcija trynimui (kad veiktų onclick)
    window.appActions.deleteLog = async function(id) {
        if (!confirm("Ar tikrai norite ištrinti šį įrašą?")) return;
        
        const { error } = await supabase.from('stepn_logs').delete().eq('id', id);
        
        if (error) {
            alert("Klaida trinant: " + error.message);
        } else {
            loadLogs(); // Perkrauti lentelę
        }
    };

    function renderSummary(data) {
        let totalIncome = 0;
        let totalExpense = 0;

        data.forEach(row => {
            if (row.type === 'income') totalIncome += row.total_usd;
            else totalExpense += row.total_usd;
        });

        const netProfit = totalIncome - totalExpense;
        const netClass = netProfit >= 0 ? 'income-color' : 'expense-color';

        elements.summaryContainer.innerHTML = `
            <div class="grid-2-cols">
                <div>
                    <div class="summary-row"><span class="summary-label">Pajamos:</span><span class="summary-value income-color">+$${totalIncome.toFixed(2)}</span></div>
                    <div class="summary-row"><span class="summary-label">Išlaidos:</span><span class="summary-value expense-color">-$${totalExpense.toFixed(2)}</span></div>
                    <div class="border-t border-gray-700 my-2 pt-2 summary-row">
                        <span class="summary-label font-bold text-white">Grynasis pelnas:</span>
                        <span class="summary-value ${netClass} text-lg">$${netProfit.toFixed(2)}</span>
                    </div>
                </div>
                </div>
        `;
    }

    function exportToCsv() {
        // Paprasta eksporto logika
        alert("Eksporto funkcija bus pridėta vėliau.");
    }

})();
