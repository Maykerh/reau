const REAUContract = '0x4c79b8c9cB0BD62B047880603a9DEcf36dE28344';
const WBNBContract = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
const CBRLContract = '0x9e691fd624410d631c082202b050694233031cb7';

var maskOptions = {
	mask: Number,
	scale: 2,
	signed: false,
	thousandsSeparator: '.',
	padFractionalZeros: false, // if true, then pads zeros at end to the length of scale
	normalizeZeros: true, // appends or removes zeros at ends
	radix: ',',
	mapToRadix: ['.'],
};

const valueFields = {
	from: document.getElementById('fromCurrency'),
	fromMask: IMask(document.getElementById('fromCurrency'), maskOptions),
	to: document.getElementById('toCurrency'),
	toMask: IMask(document.getElementById('toCurrency'), maskOptions),
};

var REAUtoWBNB = null;
var WBNBtoBRL = null;
var REAUtoBRL = null;
var BRLtoREAU = null;

var isCotationActive = false;
var isCotationFocused = false;

function getREAUValue() {
	axios
		.get('https://api.binance.com/api/v3/ticker/price?symbol=BNBBRL')
		.then(function (response) {
			console.log(response);
			WBNBtoBRL = parseFloat(response.data.price);
		})
		.catch(function (err) {
			console.error(err);

			WBNBtoBRL = 0;
		});

	axios
		.post('https://graphql.bitquery.io/', {
			query:
				'query GetData(\n  $baseCurrency: String!,\n  $quoteCurrency: String!) {\n ethereum(network: bsc) {\n dexTrades(\n baseCurrency: {is: $baseCurrency}\n quoteCurrency: {is: $quoteCurrency}\n options: {desc: ["block.height","transaction.index"]\n limit:1}\n ) {\n block{\n height\n timestamp{\n time (format: "%Y-%m-%d %H:%M:%S")\n }\n }\n transaction {\n index\n }\n baseCurrency{\n symbol\n }\n quoteCurrency {\n symbol\n }\n quotePrice\n }\n }\n }',
			variables: {
				baseCurrency: REAUContract,
				quoteCurrency: WBNBContract,
			},
		})
		.then(function (response) {
			REAUtoWBNB = response.data.data.ethereum.dexTrades[0].quotePrice;
		})
		.catch(function (err) {
			console.error(err);

			REAUtoWBNB = 0;
		});

	var callCountInterval = setInterval(function () {
		if (REAUtoWBNB != null && WBNBtoBRL != null) {
			REAUtoBRL = REAUtoWBNB * WBNBtoBRL;
			BRLtoREAU = WBNBtoBRL / REAUtoWBNB;

			clearInterval(callCountInterval);
		}
	}, 300);
}

getREAUValue();

function normalizeENotation(number) {
	if (Math.abs(number) < 1.0) {
		var e = parseInt(number.toString().split('e-')[1]);

		if (e) {
			number *= Math.pow(10, e - 1);
			number = '0.' + new Array(e).join('0') + number.toString().substring(2);
		}
	} else {
		var e = parseInt(number.toString().split('+')[1]);

		if (e > 20) {
			e -= 20;
			number /= Math.pow(10, e);
			number += new Array(e + 1).join('0');
		}
	}

	return number;
}

function formatValueToDisplay(brlValue) {
	var formatted = new Intl.NumberFormat('pt-br', {
		maximumFractionDigits: 9,
		maximumSignificantDigits: 9,
	}).format(brlValue);

	return formatted == 'NaN' ? '0,00' : formatted;
}

function calculateValues(inputModified, inputTarget) {
	var unmaskedModifiedValue = inputModified.unmaskedValue;

	var convertedValue = '0,00';

	if (inputModified.el.input.id == valueFields.to.id) {
		convertedValue = parseFloat(unmaskedModifiedValue) / REAUtoBRL;
	} else {
		convertedValue = parseFloat(unmaskedModifiedValue) * REAUtoBRL;
	}

	inputTarget.typedValue = normalizeENotation(convertedValue);
}

function changeCotationActiveStatus(activate) {
	var cotacao = document.getElementById('cotation-values');

	if (activate) {
		cotacao.classList.add('cotacao-active');
		isCotationActive = true;
	} else {
		cotacao.classList.remove('cotacao-active');
		isCotationActive = false;
	}
}

function adjustValueFieldsSize() {
	// for (var i in valueFields) {
	// 	if (valueFields[i].value.length > 10) {
	// 		valueFields[i].style.width = '6.7em';
	// 	} else if (valueFields[i].value.length < 3) {
	// 		valueFields[i].style.width = valueFields[i].value.length * 0.65 + 'em';
	// 	} else {
	// 		valueFields[i].style.width = valueFields[i].value.length * 0.65 - 0.3 + 'em';
	// 	}
	// }
}

function expandValueFields() {
	valueFields.from.style.width = valueFields.to.style.width = 6 + 'em';
}

document.getElementById('cotation-values').onmouseover = valueFields.to.onmouseover = function () {
	changeCotationActiveStatus(true);
};

document.getElementById('cotation-values').onmouseout = valueFields.to.onmouseout = function () {
	if (!isCotationFocused) {
		changeCotationActiveStatus(false);
	}
};

valueFields.from.onfocus = valueFields.to.onfocus = function () {
	expandValueFields();
	changeCotationActiveStatus(true);

	isCotationFocused = true;
};

valueFields.from.onblur = valueFields.to.onblur = function () {
	formatValueToDisplay(this.value);

	isCotationFocused = false;
	inputModifiedLastValue = '0,00';

	changeCotationActiveStatus(false);
};

valueFields.from.onkeyup = function (event) {
	if (event.keyCode != 9) {
		calculateValues(valueFields.fromMask, valueFields.toMask);
	}
};

valueFields.to.onkeyup = function (event) {
	if (event.keyCode != 9) {
		calculateValues(valueFields.toMask, valueFields.fromMask);
	}
};
