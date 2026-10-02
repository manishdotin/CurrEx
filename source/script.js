const API_URL = "https://open.er-api.com/v6/latest/USD";

const currencies = [
  ["USD", "US Dollar", "us"], ["EUR", "Euro", "eu"], ["GBP", "British Pound", "gb"],
  ["INR", "Indian Rupee", "in"], ["JPY", "Japanese Yen", "jp"], ["CAD", "Canadian Dollar", "ca"],
  ["AUD", "Australian Dollar", "au"], ["CHF", "Swiss Franc", "ch"], ["CNY", "Chinese Yuan", "cn"],
  ["SGD", "Singapore Dollar", "sg"], ["AED", "UAE Dirham", "ae"], ["NZD", "New Zealand Dollar", "nz"],
  ["KRW", "South Korean Won", "kr"], ["THB", "Thai Baht", "th"], ["ZAR", "South African Rand", "za"],
  ["BRL", "Brazilian Real", "br"], ["MXN", "Mexican Peso", "mx"], ["TRY", "Turkish Lira", "tr"],
  ["SAR", "Saudi Riyal", "sa"], ["PKR", "Pakistani Rupee", "pk"], ["BDT", "Bangladeshi Taka", "bd"],
  ["LKR", "Sri Lankan Rupee", "lk"], ["NPR", "Nepalese Rupee", "np"], ["IDR", "Indonesian Rupiah", "id"],
  ["MYR", "Malaysian Ringgit", "my"], ["PHP", "Philippine Peso", "ph"], ["VND", "Vietnamese Dong", "vn"],
  ["HKD", "Hong Kong Dollar", "hk"], ["SEK", "Swedish Krona", "se"], ["NOK", "Norwegian Krone", "no"],
  ["DKK", "Danish Krone", "dk"], ["PLN", "Polish Zloty", "pl"], ["CZK", "Czech Koruna", "cz"],
  ["HUF", "Hungarian Forint", "hu"], ["ILS", "Israeli New Shekel", "il"], ["EGP", "Egyptian Pound", "eg"],
  ["NGN", "Nigerian Naira", "ng"], ["KES", "Kenyan Shilling", "ke"], ["GHS", "Ghanaian Cedi", "gh"],
  ["ARS", "Argentine Peso", "ar"], ["CLP", "Chilean Peso", "cl"], ["COP", "Colombian Peso", "co"],
  ["QAR", "Qatari Riyal", "qa"], ["OMR", "Omani Rial", "om"], ["KWD", "Kuwaiti Dinar", "kw"],
  ["BHD", "Bahraini Dinar", "bh"], ["MAD", "Moroccan Dirham", "ma"], ["UAH", "Ukrainian Hryvnia", "ua"],
  ["RUB", "Russian Ruble", "ru"], ["RON", "Romanian Leu", "ro"], ["ISK", "Icelandic Krona", "is"]
];

const fromSelect = document.querySelector("#from-currency");
const toSelect = document.querySelector("#to-currency");
const amountInput = document.querySelector("#amount");
const resultOutput = document.querySelector("#result");
const fromFlag = document.querySelector("#from-flag");
const toFlag = document.querySelector("#to-flag");
const fromCodeLabel = document.querySelector("#from-code-label");
const toCodeLabel = document.querySelector("#to-code-label");
const rateText = document.querySelector("#rate-text");
const statusText = document.querySelector("#status");
const refreshButton = document.querySelector("#refresh-button");
const swapButton = document.querySelector("#swap-button");

let rates = null;
let lastUpdated = null;

function populateCurrencies(select, selectedCode) {
  currencies.forEach(([code, name]) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = `${code} · ${name}`;
    option.selected = code === selectedCode;
    select.appendChild(option);
  });
}

populateCurrencies(fromSelect, "USD");
populateCurrencies(toSelect, "INR");

function currencyInfo(code) {
  return currencies.find(([currencyCode]) => currencyCode === code);
}

function updateFlag(select, image, codeLabel) {
  const code = select.value;
  const info = currencyInfo(code);
  if (info) {
    image.src = `https://flagcdn.com/w80/${info[2]}.png`;
    image.alt = `${info[1]} flag`;
  }
  codeLabel.textContent = code;
}

function formatAmount(value, code) {
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

function showStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}

function renderConversion() {
  updateFlag(fromSelect, fromFlag, fromCodeLabel);
  updateFlag(toSelect, toFlag, toCodeLabel);

  if (!rates) {
    resultOutput.textContent = "—";
    return;
  }

  const amount = Number(amountInput.value);
  if (amountInput.value.trim() === "" || !Number.isFinite(amount) || amount < 0) {
    resultOutput.textContent = "—";
    rateText.textContent = "Enter a valid amount to convert.";
    return;
  }

  const from = fromSelect.value;
  const to = toSelect.value;
  const fromRate = rates[from];
  const toRate = rates[to];

  if (!fromRate || !toRate) {
    resultOutput.textContent = "—";
    rateText.textContent = "Rate unavailable for this currency.";
    return;
  }

  // Rates are quoted against USD, so divide by the source rate and multiply by target rate.
  const exchangeRate = toRate / fromRate;
  const converted = amount * exchangeRate;
  resultOutput.textContent = formatAmount(converted, to);
  rateText.textContent = `1 ${from} = ${formatAmount(exchangeRate, to)} ${to}`;

  if (lastUpdated) {
    const updated = new Date(lastUpdated);
    showStatus(`Rates last updated ${updated.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC"
    })} UTC · Indicative rates, not a transaction quote.`);
  }
}

async function loadRates() {
  refreshButton.disabled = true;
  refreshButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3"/></svg> Updating…`;
  showStatus("Fetching the latest available exchange rates…");

  try {
    const response = await fetch(API_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`API request failed (${response.status})`);
    const data = await response.json();
    if (data.result !== "success" || !data.rates) {
      throw new Error("The exchange-rate service did not return rates.");
    }

    rates = data.rates;
    lastUpdated = data.time_last_update_utc || null;
    renderConversion();
  } catch (error) {
    console.error("CurrEx rate loading error:", error);
    if (rates) {
      showStatus("Could not refresh rates. Showing the last rates loaded in this session.", true);
    } else {
      resultOutput.textContent = "—";
      rateText.textContent = "Exchange rate unavailable";
      showStatus("Could not load exchange rates. Check your internet connection and try again.", true);
    }
  } finally {
    refreshButton.disabled = false;
    refreshButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3"/></svg> Refresh rates`;
  }
}

fromSelect.addEventListener("change", renderConversion);
toSelect.addEventListener("change", renderConversion);
amountInput.addEventListener("input", renderConversion);
refreshButton.addEventListener("click", loadRates);

swapButton.addEventListener("click", () => {
  const previousFrom = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = previousFrom;
  renderConversion();
});

loadRates();
